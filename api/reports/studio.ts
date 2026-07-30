import {
  getAuthenticatedUser,
  getSupabaseAdmin,
} from "../../server/supabase.js";
import { createNodeHandler } from "../../server/vercel.js";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

type Action = "list" | "save" | "default" | "exports";
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
    if (request.method !== "POST")
      return Response.json({ error: "Method not allowed." }, { status: 405 });
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (action === "save") return await saveTemplate(admin, user.id, body);
    if (action === "default")
      return await setDefaultAndLogExport(admin, user.id, body);
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
  return Response.json({ exports: data ?? [] });
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
  return Object.fromEntries(
    ["intro_notes", "executive_commentary", "footer_text", "disclaimer"].map(
      (key) => [key, string(value[key]).slice(0, 5000)],
    ),
  );
}
async function renderPreviewPdf(
  template: Record<string, unknown>,
  report: Record<string, unknown> | null = null,
) {
  const branding = object(template.branding);
  const content = object(template.custom_content);
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
  const ink = rgb(0.22, 0.2, 0.18);
  const muted = rgb(0.35, 0.33, 0.3);
  const cardFill = rgb(0.975, 0.97, 0.955);

  page.drawRectangle({ x: 42, y: 744, width: 528, height: 7, color: primary });
  page.drawText("NORTHSTAR DISC", { x: 42, y: 715, size: 10, font: bold, color: primary });
  page.drawText("Executive DISC Report", {
    x: 42,
    y: 682,
    size: 22,
    font: bold,
    color: primary,
  });
  await drawLogo(document, page, string(branding.logo_url));

  let y = 652;
  const intro = string(content.intro_notes);
  if (intro) {
    const introLines = wrapLines(intro, font, 10, 490).slice(0, 3);
    const height = 18 + introLines.length * 13;
    drawRoundedRectangle(page, 42, y - height, 528, height, 12, withOpacity(accent, 0.14));
    drawLines(page, introLines, 56, y - 14, font, 10, accent, 13);
    y -= height + 14;
  }
  const reportSections: Array<[string, string, boolean]> = [
    ["Executive summary", "A decisive, people-aware profile with practical leadership range.", sections.executive_summary === true],
    ["Behavioral matrix", report ? scoreText : "Dominance 76% | Influence 64% | Steadiness 42% | Conscientiousness 58%", sections.behavioral_matrix === true],
    ["Stress profile", "Under pressure, clarify priorities and allow time for considered responses.", sections.stress_profile === true],
    ["Team communication", "Use direct goals, visible ownership, and concise feedback loops.", sections.team_communication === true],
    ["Executive commentary", string(content.executive_commentary), sections.custom_notes === true],
  ];
  for (const [title, text, enabled] of reportSections) {
    if (!enabled) continue;
    if (!text) continue;
    const lines = wrapLines(text, font, 10, 470).slice(0, 3);
    const height = 34 + lines.length * 13;
    if (y - height < 105) break;
    drawRoundedRectangle(page, 42, y - height, 528, height, 12, cardFill);
    drawRoundedRectangle(
      page,
      42,
      y - height,
      5,
      height,
      3,
      title === "Behavioral matrix" || title === "Team communication" ? accent : primary,
    );
    page.drawText(title, { x: 58, y: y - 18, size: 12, font: bold, color: ink });
    drawLines(page, lines, 58, y - 35, font, 10, muted, 13);
    y -= height + 12;
  }
  const footer = string(content.footer_text) || "Prepared with Northstar DISC";
  page.drawLine({
    start: { x: 42, y: 78 },
    end: { x: 570, y: 78 },
    thickness: 0.75,
    color: rgb(0.83, 0.81, 0.77),
  });
  page.drawText(footer.slice(0, 110), { x: 42, y: 58, size: 9, font, color: muted });
  const disclaimer = string(content.disclaimer);
  if (disclaimer)
    page.drawText(disclaimer.slice(0, 110), {
      x: 42,
      y: 42,
      size: 7,
      font,
      color: muted,
    });
  return await document.save();
}
function wrapLines(text: string, font: PDFFont, size: number, width: number) {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && font.widthOfTextAtSize(next, size) > width) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}
function drawLines(page: PDFPage, lines: string[], x: number, y: number, font: PDFFont, size: number, color: ReturnType<typeof rgb>, leading: number) {
  lines.forEach((line, index) => page.drawText(line, { x, y: y - index * leading, size, font, color }));
}
function drawRoundedRectangle(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  color: ReturnType<typeof rgb>,
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
  page.drawSvgPath(path, { x, y, color });
}
function withOpacity(color: ReturnType<typeof rgb>, opacity: number) {
  return rgb(
    1 - (1 - color.red) * opacity,
    1 - (1 - color.green) * opacity,
    1 - (1 - color.blue) * opacity,
  );
}
async function drawLogo(document: PDFDocument, page: PDFPage, url: string) {
  if (!url || !/^https?:\/\//i.test(url)) return;
  try {
    const response = await fetch(url);
    if (!response.ok) return;
    const bytes = await response.arrayBuffer();
    const image = /image\/png/i.test(response.headers.get("content-type") ?? "")
      ? await document.embedPng(bytes)
      : await document.embedJpg(bytes);
    const dimensions = image.scaleToFit(100, 42);
    page.drawImage(image, { x: 570 - dimensions.width, y: 674, ...dimensions });
  } catch {
    // A logo must never prevent a report from being generated.
  }
}
function toRgb(value: string) { const hex = /^#([0-9a-f]{6})$/i.exec(value)?.[1] ?? "8b5e3c"; return rgb(Number.parseInt(hex.slice(0, 2), 16) / 255, Number.parseInt(hex.slice(2, 4), 16) / 255, Number.parseInt(hex.slice(4, 6), 16) / 255) }
export default createNodeHandler(handleRequest);
