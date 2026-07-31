import {
  getAuthenticatedUser,
  getSupabaseAdmin,
} from "../../server/supabase.js";
import { createNodeHandler } from "../../server/vercel.js";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

type Action = "list" | "save" | "default" | "exports" | "download-export" | "delete-export";
const hexColor = /^#[0-9a-fA-F]{6}$/;

async function handleRequest(request: Request): Promise<Response> {
  const user = await getAuthenticatedUser(request);
  if (!user)
    return Response.json(
      { error: "Authentication is required." },
      { status: 401 },
    );
  const action = new URL(request.url).searchParams.get(
    "action",
  ) as Action | null;
  const admin = getSupabaseAdmin();
  try {
    if (request.method === "GET" && action === "list")
      return await listTemplates(
        admin,
        user.id,
        new URL(request.url).searchParams.get("orgId"),
      );
    if (request.method === "GET" && action === "exports")
      return await listExports(
        admin,
        user.id,
        new URL(request.url).searchParams.get("templateId"),
      );
    if (request.method === "GET" && action === "download-export")
      return await downloadExport(
        admin,
        user.id,
        new URL(request.url).searchParams.get("exportId"),
      );
    if (request.method !== "POST")
      return Response.json({ error: "Method not allowed." }, { status: 405 });
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (action === "save") return await saveTemplate(admin, user.id, body);
    if (action === "default")
      return await setDefaultAndLogExport(admin, user.id, body);
    if (action === "delete-export")
      return await deleteExport(admin, user.id, string(body.exportId));
    return Response.json(
      { error: "Unknown report studio action." },
      { status: 400 },
    );
  } catch (error) {
    console.error("Report studio API error", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Report studio operation failed.",
      },
      { status: 500 },
    );
  }
}

async function listTemplates(
  admin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  orgId: string | null,
) {
  let query = admin
    .from("report_templates")
    .select("*")
    .order("updated_at", { ascending: false });
  query = orgId
    ? query.eq("org_id", orgId)
    : query.eq("coach_id", userId).is("org_id", null);
  const { data, error } = await query;
  if (error) throw error;
  if (orgId) await assertOrganizationAccess(admin, userId, orgId);
  return Response.json({ templates: data ?? [] });
}
async function listExports(
  admin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  templateId: string | null,
) {
  if (!templateId)
    return Response.json({ error: "templateId is required." }, { status: 400 });
  const template = await assertTemplateAccess(admin, userId, templateId);
  const { data, error } = await admin
    .from("report_exports")
    .select("*")
    .eq("template_id", template.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return Response.json({ exports: await withFileSizes(admin, data ?? []) });
}
async function downloadExport(
  admin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  exportId: string | null,
) {
  const record = await assertExportAccess(admin, userId, exportId ?? "");
  if (!record.file_path) return Response.json({ error: "Export file is unavailable." }, { status: 404 });
  const { data, error } = await admin.storage.from("report-assets").createSignedUrl(record.file_path, 60 * 10);
  if (error) throw error;
  return Response.json({ downloadUrl: data.signedUrl });
}
async function deleteExport(
  admin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  exportId: string,
) {
  const record = await assertExportAccess(admin, userId, exportId);
  if (record.file_path) {
    const { error } = await admin.storage.from("report-assets").remove([record.file_path]);
    if (error) throw error;
  }
  const { error } = await admin.from("report_exports").delete().eq("id", record.id);
  if (error) throw error;
  return Response.json({ ok: true });
}
async function saveTemplate(
  admin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  body: Record<string, unknown>,
) {
  const templateId = string(body.id);
  const orgId = nullableString(body.orgId);
  const name =
    string(body.name).trim().slice(0, 120) || "Default Custom Template";
  const branding = object(body.branding);
  const sections = object(body.section_config);
  const content = object(body.custom_content);
  if (
    !hexColor.test(string(branding.primary_color)) ||
    !hexColor.test(string(branding.accent_color))
  )
    return Response.json(
      { error: "Brand colors must be hex values." },
      { status: 400 },
    );
  if (!["serif", "sans", "modern"].includes(string(branding.typography)))
    return Response.json({ error: "Invalid typography." }, { status: 400 });
  if (orgId) await assertOrganizationAccess(admin, userId, orgId);
  const payload = {
    org_id: orgId,
    coach_id: userId,
    name,
    branding: sanitizeBranding(branding),
    section_config: sanitizeSections(sections),
    custom_content: sanitizeContent(content),
  };
  if (templateId) {
    const current = await assertTemplateAccess(admin, userId, templateId);
    if (current.coach_id !== userId && current.org_id !== orgId)
      return Response.json(
        { error: "Template organization cannot be changed." },
        { status: 403 },
      );
    const { data, error } = await admin
      .from("report_templates")
      .update(payload)
      .eq("id", templateId)
      .select("*")
      .single();
    if (error) throw error;
    return Response.json({ template: data });
  }
  const { data, error } = await admin
    .from("report_templates")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return Response.json({ template: data }, { status: 201 });
}
async function pruneTemplateExports(
  admin: ReturnType<typeof getSupabaseAdmin>,
  templateId: string,
) {
  const { data, error } = await admin
    .from("report_exports")
    .select("id, file_path")
    .eq("template_id", templateId)
    .order("created_at", { ascending: false })
    .range(10, 100);
  if (error) throw error;
  const stale = data ?? [];
  if (!stale.length) return;
  const paths = stale.map((item) => item.file_path).filter((path): path is string => Boolean(path));
  if (paths.length) {
    const { error: storageError } = await admin.storage.from("report-assets").remove(paths);
    if (storageError) throw storageError;
  }
  const { error: deleteError } = await admin.from("report_exports").delete().in("id", stale.map((item) => item.id));
  if (deleteError) throw deleteError;
}
async function setDefaultAndLogExport(
  admin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  body: Record<string, unknown>,
) {
  const templateId = string(body.templateId);
  if (!templateId)
    return Response.json({ error: "templateId is required." }, { status: 400 });
  const template = await assertTemplateAccess(admin, userId, templateId);
  if (body.setDefault === true) {
    let defaults = admin
      .from("report_templates")
      .update({ is_default: false })
      .eq("coach_id", template.coach_id);
    defaults = template.org_id
      ? defaults.eq("org_id", template.org_id)
      : defaults.is("org_id", null);
    const { error: clearError } = await defaults;
    if (clearError) throw clearError;
    const { error } = await admin
      .from("report_templates")
      .update({ is_default: true })
      .eq("id", templateId);
    if (error) throw error;
  }
  if (body.recordExport === true) {
    const reportId = nullableString(body.reportId);
    if (reportId) await assertReportAccess(admin, userId, reportId);
    let report: Record<string, unknown> | null = null;
    if (reportId) {
      const { data, error } = await admin
        .from("reports")
        .select("disc_scores, profile_type")
        .eq("id", reportId)
        .single();
      if (error) throw error;
      report = data;
    }
    const filePath = `exports/${template.coach_id}/${templateId}/${Date.now()}.pdf`;
    const pdf = await renderPreviewPdf(template, report);
    const { error: uploadError } = await admin.storage
      .from("report-assets")
      .upload(filePath, pdf, { contentType: "application/pdf", upsert: false });
    if (uploadError) throw uploadError;
    const { data, error } = await admin
      .from("report_exports")
      .insert({
        report_id: reportId,
        template_id: templateId,
        file_path: filePath,
      })
      .select("*")
      .single();
    if (error) throw error;
    await pruneTemplateExports(admin, templateId);
    const { data: signed, error: signedError } = await admin.storage
      .from("report-assets")
      .createSignedUrl(filePath, 60 * 10);
    if (signedError) throw signedError;
    return Response.json({ export: data, downloadUrl: signed.signedUrl });
  }
  return Response.json({ ok: true });
}
async function assertTemplateAccess(
  admin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  templateId: string,
) {
  const { data, error } = await admin
    .from("report_templates")
    .select("*")
    .eq("id", templateId)
    .single();
  if (error || !data) throw new Error("Report template not found.");
  if (data.coach_id === userId) return data;
  if (data.org_id) {
    await assertOrganizationAccess(admin, userId, data.org_id);
    return data;
  }
  throw new Error("Template access is not allowed.");
}
async function assertExportAccess(
  admin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  exportId: string,
) {
  if (!exportId) throw new Error("exportId is required.");
  const { data, error } = await admin.from("report_exports").select("*").eq("id", exportId).single();
  if (error || !data) throw new Error("Report export not found.");
  await assertTemplateAccess(admin, userId, string(data.template_id));
  return data;
}
async function withFileSizes(admin: ReturnType<typeof getSupabaseAdmin>, records: Array<Record<string, unknown>>) {
  return await Promise.all(records.map(async (record) => {
    const path = string(record.file_path);
    const slash = path.lastIndexOf("/");
    if (slash < 0) return record;
    const { data } = await admin.storage.from("report-assets").list(path.slice(0, slash), { search: path.slice(slash + 1) });
    const file = data?.find((item) => item.name === path.slice(slash + 1));
    return { ...record, file_size: typeof file?.metadata?.size === "number" ? file.metadata.size : null };
  }));
}
async function assertOrganizationAccess(
  admin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  orgId: string,
) {
  const { data } = await admin
    .from("organization_memberships")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data || !["owner", "admin"].includes(data.role))
    throw new Error("Organization administrator access is required.");
}
async function assertReportAccess(
  admin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  reportId: string,
) {
  const { data, error } = await admin
    .from("coach_clients")
    .select("user_id, organization_id")
    .eq("assessment_id", reportId)
    .maybeSingle();
  if (error || !data) throw new Error("Client report was not found.");
  if (data.user_id === userId) return;
  if (data.organization_id) {
    await assertOrganizationAccess(admin, userId, data.organization_id);
    return;
  }
  throw new Error("Client report access is not allowed.");
}
function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function string(value: unknown): string {
  return typeof value === "string" ? value : "";
}
function nullableString(value: unknown): string | null {
  const text = string(value).trim();
  return text || null;
}
function sanitizeBranding(value: Record<string, unknown>) {
  return {
    primary_color: string(value.primary_color),
    accent_color: string(value.accent_color),
    logo_url: nullableString(value.logo_url),
    typography: string(value.typography),
  };
}
function sanitizeSections(value: Record<string, unknown>) {
  return Object.fromEntries(
    [
      "executive_summary",
      "behavioral_matrix",
      "stress_profile",
      "team_communication",
      "custom_notes",
    ].map((key) => [key, value[key] === true]),
  );
}
function sanitizeContent(value: Record<string, unknown>) {
  const content = Object.fromEntries(
    ["intro_notes", "executive_commentary", "footer_text", "disclaimer"].map(
      (key) => [key, string(value[key]).slice(0, 5000)],
    ),
  );
  const headers = object(value.section_headers);
  return {
    ...content,
    section_headers: Object.fromEntries(
      ["executive_summary", "behavioral_matrix", "stress_profile", "team_communication", "custom_notes"].map(
        (key) => [key, string(headers[key]).slice(0, 120)],
      ),
    ),
  };
}
async function renderPreviewPdf(
  template: Record<string, unknown>,
  report: Record<string, unknown> | null = null,
) {
  const branding = object(template.branding);
  const content = object(template.custom_content);
  const customHeaders = object(content.section_headers);
  const sections = object(template.section_config);
  const scores = object(report?.disc_scores);
  const scoreRows = Array.isArray(scores.scores) ? scores.scores : [];
  const scoreText = ["D", "I", "S", "C"]
    .map((trait) => {
      const row = scoreRows.find((item) => object(item).trait === trait);
      return `${trait} ${Math.round(Number(object(row).percentage) || 0)}%`;
    })
    .join(" | ");
  const document = await PDFDocument.create();
  const page = document.addPage([612, 792]);
  const serif = string(branding.typography) === "serif";
  const font = await document.embedFont(
    serif ? StandardFonts.TimesRoman : StandardFonts.Helvetica,
  );
  const bold = await document.embedFont(
    serif ? StandardFonts.TimesRomanBold : StandardFonts.HelveticaBold,
  );
  const primary = toRgb(string(branding.primary_color));
  const accent = toRgb(string(branding.accent_color));
  const muted = rgb(0.35, 0.33, 0.3);

  page.drawRectangle({ x: 42, y: 744, width: 528, height: 7, color: primary });
  page.drawText("NORTHSTAR DISC · CONFIDENTIAL LEADERSHIP PROFILE", { x: 42, y: 715, size: 8, font: bold, color: primary });
  page.drawText("Executive DISC Report", {
    x: 42,
    y: 678,
    size: 24,
    font: bold,
    color: primary,
  });
  await drawLogo(document, page, string(branding.logo_url));

  page.drawText("Executive edition · Behavioral strategy and coaching brief", { x: 42, y: 658, size: 9, font, color: muted });
  let y = 634;
  const intro = string(content.intro_notes);
  if (intro) {
    const introLines = wrapLines(intro, font, 10, 470, 2);
    const height = 50 + introLines.length * 13;
    drawReportCard(page, "INTRODUCTION", "Executive introduction", introLines, y, height, font, bold, accent, muted);
    y -= height + 14;
  }
  const reportSections: Array<[string, string, boolean]> = [
    [string(customHeaders.executive_summary) || "Executive summary", "A decisive, people-aware profile with practical leadership range.", sections.executive_summary === true],
    [string(customHeaders.behavioral_matrix) || "Behavioral matrix", report ? scoreText : "Dominance 76% | Influence 64% | Steadiness 42% | Conscientiousness 58%", sections.behavioral_matrix === true],
    [string(customHeaders.stress_profile) || "Stress profile", "Under pressure, clarify priorities and allow time for considered responses.", sections.stress_profile === true],
    [string(customHeaders.team_communication) || "Team communication", "Use direct goals, visible ownership, and concise feedback loops.", sections.team_communication === true],
    [string(customHeaders.custom_notes) || "Executive commentary", string(content.executive_commentary), sections.custom_notes === true],
  ];
  for (const [title, text, enabled] of reportSections) {
    if (!enabled) continue;
    if (!text) continue;
    const lines = wrapLines(text, font, 10, 470, 2);
    const height = 50 + lines.length * 13;
    if (y - height < 105) break;
    const indicator = title === "Behavioral matrix" || title === "Team communication" ? accent : primary;
    drawReportCard(page, "EXECUTIVE INSIGHT", title, lines, y, height, font, bold, indicator, muted);
    y -= height + 12;
  }
  const footer = string(content.footer_text) || "Prepared with Northstar DISC";
  const disclaimer = string(content.disclaimer);
  drawReportFooter(page, footer, disclaimer, font, bold, primary, muted);
  await drawExpandedInsightsPage(document, font, bold, primary, accent, report, content, string(branding.typography) === "serif", string(branding.logo_url));
  return await document.save();
}
async function drawExpandedInsightsPage(
  document: PDFDocument,
  font: PDFFont,
  bold: PDFFont,
  primary: ReturnType<typeof rgb>,
  accent: ReturnType<typeof rgb>,
  report: Record<string, unknown> | null,
  content: Record<string, unknown>,
  serif: boolean,
  logoUrl: string,
) {
  const page = document.addPage([612, 792]);
  const muted = rgb(0.35, 0.33, 0.3);
  page.drawRectangle({ x: 42, y: 744, width: 528, height: 7, color: primary });
  page.drawText("NORTHSTAR DISC", { x: 42, y: 715, size: 10, font: bold, color: primary });
  page.drawText("Deep leadership insights", { x: 42, y: 678, size: 22, font: bold, color: primary });
  await drawLogo(document, page, logoUrl);
  const profile = object(report?.disc_scores);
  const primaryTrait = string(profile.primaryTrait) || "your primary DISC style";
  const insights: Array<[string, string, ReturnType<typeof rgb>]> = [
    ["Leadership style", `${primaryTrait} tendencies are strongest when priorities are clear, ownership is visible, and decisions balance pace with input from others.`, primary],
    ["Ideal work environment", "The most effective environment combines clear outcomes, room for focused execution, and communication norms that make expectations explicit.", accent],
    ["Motivators & triggers", "Meaningful progress, clarity, and recognition tend to energize performance. Ambiguity, prolonged friction, or unclear standards can create avoidable strain.", primary],
    ["Actionable growth areas", string(content.executive_commentary) || "Use one deliberate pause before key decisions, ask for a complementary perspective, and turn insight into a specific weekly practice.", accent],
  ];
  let y = 642;
  for (const [title, text, color] of insights) {
    if (!title.trim() || !text.trim()) continue;
    const lines = wrapLines(text, font, 10, 470, 3);
    const height = 52 + lines.length * 13;
    drawReportCard(page, "DEEP INSIGHT", title, lines, y, height, font, bold, color, muted);
    y -= height + 14;
  }
  page.drawLine({ start: { x: 42, y: 78 }, end: { x: 570, y: 78 }, thickness: 0.75, color: rgb(0.83, 0.81, 0.77) });
  page.drawText(serif ? "Executive serif edition · Prepared with Northstar DISC" : "Modern sans edition · Prepared with Northstar DISC", { x: 42, y: 58, size: 9, font, color: muted });
}
function wrapLines(text: string, font: PDFFont, size: number, width: number, maxLines: number) {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const safeWord = splitLongWord(word, font, size, width);
    const next = line ? `${line} ${safeWord}` : safeWord;
    if (line && font.widthOfTextAtSize(next, size) > width) {
      lines.push(line);
      line = safeWord;
      if (lines.length === maxLines) break;
    } else line = next;
  }
  if (line && lines.length < maxLines) lines.push(line);
  const truncated = lines.length === maxLines && words.join(" ") !== lines.join(" ");
  if (truncated) lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[.…]+$/, "")}…`;
  return lines;
}
function splitLongWord(word: string, font: PDFFont, size: number, width: number) {
  if (font.widthOfTextAtSize(word, size) <= width) return word;
  let output = "";
  for (const character of word) {
    if (font.widthOfTextAtSize(`${output}${character}…`, size) > width) break;
    output += character;
  }
  return `${output}…`;
}
function drawLines(page: PDFPage, lines: string[], x: number, y: number, font: PDFFont, size: number, color: ReturnType<typeof rgb>, leading: number) {
  lines.forEach((line, index) => page.drawText(line, { x, y: y - index * leading, size, font, color }));
}
function drawReportCard(
  page: PDFPage,
  eyebrow: string,
  title: string,
  lines: string[],
  top: number,
  height: number,
  font: PDFFont,
  bold: PDFFont,
  accent: ReturnType<typeof rgb>,
  bodyColor: ReturnType<typeof rgb>,
) {
  // Keep PDF cards visually aligned with the Studio PreviewSection component.
  drawRoundedRectangle(page, 42, top - height, 528, height, 12, withOpacity(accent, 0.055), withOpacity(accent, 0.42));
  drawRoundedRectangle(page, 42, top - height, 5, height, 3, accent);
  page.drawText(eyebrow, { x: 58, y: top - 14, size: 7, font: bold, color: accent });
  page.drawText(title, { x: 58, y: top - 29, size: 12, font: bold, color: rgb(0.22, 0.2, 0.18) });
  drawLines(page, lines, 58, top - 46, font, 10, bodyColor, 13);
}
function drawReportFooter(
  page: PDFPage,
  footer: string,
  disclaimer: string,
  font: PDFFont,
  bold: PDFFont,
  accent: ReturnType<typeof rgb>,
  muted: ReturnType<typeof rgb>,
) {
  drawRoundedRectangle(page, 42, 24, 528, 58, 10, withOpacity(accent, 0.035), withOpacity(accent, 0.28));
  page.drawText("REPORT NOTES", { x: 56, y: 67, size: 6.5, font: bold, color: accent });
  const footerLines = wrapLines(footer, font, 8.5, 500, disclaimer ? 1 : 2);
  drawLines(page, footerLines, 56, 54, font, 8.5, muted, 11);
  if (disclaimer) drawLines(page, wrapLines(disclaimer, font, 7, 500, 1), 56, 33, font, 7, muted, 9);
}
function drawRoundedRectangle(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  color: ReturnType<typeof rgb>,
  borderColor?: ReturnType<typeof rgb>,
) {
  const r = Math.min(radius, width / 2, height / 2);
  const curve = r * 0.55228475;
  const path = [
    `M ${r} 0`,
    `L ${width - r} 0`,
    `C ${width - r + curve} 0 ${width} ${r - curve} ${width} ${r}`,
    `L ${width} ${height - r}`,
    `C ${width} ${height - r + curve} ${width - r + curve} ${height} ${width - r} ${height}`,
    `L ${r} ${height}`,
    `C ${r - curve} ${height} 0 ${height - r + curve} 0 ${height - r}`,
    `L 0 ${r}`,
    `C 0 ${r - curve} ${r - curve} 0 ${r} 0 Z`,
  ].join(" ");
  page.drawSvgPath(path, { x, y, color, borderColor, borderWidth: borderColor ? 0.7 : undefined });
}
function withOpacity(color: ReturnType<typeof rgb>, opacity: number) {
  return rgb(
    1 - (1 - color.red) * opacity,
    1 - (1 - color.green) * opacity,
    1 - (1 - color.blue) * opacity,
  );
}
async function drawLogo(document: PDFDocument, page: PDFPage, url: string) {
  if (!url) return;
  try {
    const source = url.startsWith("data:") ? decodeDataImage(url) : await fetchRemoteImage(url);
    if (!source) return;
    const image = source.mime === "image/png"
      ? await document.embedPng(source.bytes)
      : await document.embedJpg(source.bytes);
    const dimensions = image.scaleToFit(112, 40);
    page.drawImage(image, { x: 570 - dimensions.width, y: 682, ...dimensions });
  } catch {
    // A logo must never prevent a report from being generated.
  }
}
async function fetchRemoteImage(url: string) {
  if (!/^https?:\/\//i.test(url)) return null;
  const response = await fetch(url);
  if (!response.ok) return null;
  const bytes = await response.arrayBuffer();
  const mime = detectImageMime(new Uint8Array(bytes));
  return mime ? { mime, bytes } : null;
}
function decodeDataImage(url: string) {
  const match = /^data:(image\/(?:png|jpeg));base64,([a-z0-9+/=\s]+)$/i.exec(url);
  if (!match) return null;
  const bytes = Uint8Array.from(Buffer.from(match[2].replace(/\s/g, ""), "base64"));
  const mime = detectImageMime(bytes);
  return mime ? { mime, bytes } : null;
}
function detectImageMime(bytes: Uint8Array): "image/png" | "image/jpeg" | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  return null;
}
function toRgb(value: string) { const hex = /^#([0-9a-f]{6})$/i.exec(value)?.[1] ?? "8b5e3c"; return rgb(Number.parseInt(hex.slice(0, 2), 16) / 255, Number.parseInt(hex.slice(2, 4), 16) / 255, Number.parseInt(hex.slice(4, 6), 16) / 255) }
export default createNodeHandler(handleRequest);
