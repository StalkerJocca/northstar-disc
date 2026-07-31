import { useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import {
  defaultCustomReportContent,
  defaultReportBranding,
  defaultReportSections,
  type CustomReportContent,
  type ReportBrandingConfig,
  type ReportSectionConfig,
  type ReportExportRecord,
  type ReportTemplate,
} from "../types/reportStudio";

type Draft = {
  id?: string;
  name: string;
  branding: ReportBrandingConfig;
  section_config: ReportSectionConfig;
  custom_content: CustomReportContent;
  is_default: boolean;
};
type OrganizationOption = { id: string; name: string };
const emptyDraft = (): Draft => ({
  name: "Default Custom Template",
  branding: { ...defaultReportBranding },
  section_config: { ...defaultReportSections },
  custom_content: { ...defaultCustomReportContent },
  is_default: false,
});

export default function ReportStudio({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [orgId, setOrgId] = useState("");
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [exports, setExports] = useState<ReportExportRecord[]>([]);
  const [historyBusyId, setHistoryBusyId] = useState<string | null>(null);
  const [logoFileName, setLogoFileName] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);
  const headers = async () => {
    const {
      data: { session },
    } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token ?? ""}`,
    };
  };
  const api = async (
    action: string,
    body?: Record<string, unknown>,
    method: "GET" | "POST" = "POST",
  ) => {
    const response = await fetch(`/api/reports/studio?action=${action}`, {
      method,
      headers: await headers(),
      body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
    });
    const result = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (!response.ok)
      throw new Error(
        typeof result.error === "string"
          ? result.error
          : "Report studio request failed.",
      );
    return result;
  };
  const load = async () => {
    try {
      const result = (await api(
        orgId ? `list&orgId=${encodeURIComponent(orgId)}` : "list",
        undefined,
        "GET",
      )) as { templates: ReportTemplate[] };
      setTemplates(result.templates);
      const preferred =
        result.templates.find((item) => item.is_default) ?? result.templates[0];
      if (preferred) select(preferred);
      else setDraft(emptyDraft());
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to load templates.",
      );
    }
  };
  const loadExports = async (templateId: string) => {
    const result = await api(`exports&templateId=${encodeURIComponent(templateId)}`, undefined, "GET") as { exports: ReportExportRecord[] };
    setExports(result.exports);
  };
  useEffect(() => {
    if (!supabase || !user) return;
    void supabase
      .from("organization_memberships")
      .select("organizations!inner(id,name)")
      .eq("user_id", user.id)
      .then(({ data }) =>
        setOrganizations(
          (data ?? []).map(
            (item) => item.organizations as unknown as OrganizationOption,
          ),
        ),
      );
  }, [user]);
  useEffect(() => {
    if (user) void load();
  }, [user, orgId]);
  useEffect(() => {
    if (!draft.id) {
      setExports([]);
      return;
    }
    void loadExports(draft.id)
      .catch(() => setExports([]));
  }, [draft.id]);
  const select = (template: ReportTemplate) =>
    setDraft({
      id: template.id,
      name: template.name,
      branding: template.branding,
      section_config: template.section_config,
      custom_content: template.custom_content,
      is_default: template.is_default,
    });
  const save = async (setDefault = false) => {
    try {
      setBusy(true);
      const result = (await api("save", {
        ...draft,
        orgId: orgId || null,
      })) as { template: ReportTemplate };
      setDraft({ ...draft, id: result.template.id });
      if (setDefault)
        await api("default", {
          templateId: result.template.id,
          setDefault: true,
        });
      setMessage(
        setDefault ? "Template saved as the default." : "Template saved.",
      );
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to save template.",
      );
    } finally {
      setBusy(false);
    }
  };
  const uploadLogo = async (file: File | undefined) => {
    if (!file || !supabase || !user) return;
    if (!["image/png", "image/jpeg"].includes(file.type) || file.size > 2_000_000) {
      setMessage("Choose a PNG or JPEG logo smaller than 2 MB.");
      return;
    }
    try {
      setBusy(true);
      const path = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
      const { error } = await supabase.storage
        .from("report-assets")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data, error: urlError } = await supabase.storage
        .from("report-assets")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (urlError) throw urlError;
      setDraft({
        ...draft,
        branding: { ...draft.branding, logo_url: data.signedUrl },
      });
      setLogoFileName(file.name);
      setMessage("Logo uploaded. Save the template to keep it.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Logo upload failed.",
      );
    } finally {
      setBusy(false);
    }
  };
  const removeLogo = () => {
    setDraft({ ...draft, branding: { ...draft.branding, logo_url: null } });
    setLogoFileName("");
    if (logoInputRef.current) logoInputRef.current.value = "";
    setMessage("Logo removed. Save the template to keep this change.");
  };
  const queueExport = async () => {
    if (!draft.id) {
      setMessage("Save the template before exporting.");
      return;
    }
    try {
      setBusy(true);
      const result = (await api("default", {
        templateId: draft.id,
        recordExport: true,
      })) as { downloadUrl?: string };
      if (result.downloadUrl) window.open(result.downloadUrl, "_blank", "noopener,noreferrer");
      await loadExports(draft.id);
      setMessage("Preview PDF was generated server-side and recorded in download history.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to queue export.",
      );
    } finally {
      setBusy(false);
    }
  };
  const downloadExport = async (record: ReportExportRecord) => {
    try {
      setHistoryBusyId(record.id);
      const result = await api(`download-export&exportId=${encodeURIComponent(record.id)}`, undefined, "GET") as { downloadUrl?: string };
      if (result.downloadUrl) window.open(result.downloadUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to download export.");
    } finally {
      setHistoryBusyId(null);
    }
  };
  const deleteExport = async (record: ReportExportRecord) => {
    if (!window.confirm("Delete this PDF export permanently?")) return;
    try {
      setHistoryBusyId(record.id);
      await api("delete-export", { exportId: record.id });
      setExports((current) => current.filter((item) => item.id !== record.id));
      setMessage("PDF export deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete export.");
    } finally {
      setHistoryBusyId(null);
    }
  };
  const updateSections = (key: keyof ReportSectionConfig) =>
    setDraft({
      ...draft,
      section_config: {
        ...draft.section_config,
        [key]: !draft.section_config[key],
      },
    });
  const updateSectionHeader = (key: keyof ReportSectionConfig, value: string) =>
    setDraft({
      ...draft,
      custom_content: {
        ...draft.custom_content,
        section_headers: { ...draft.custom_content.section_headers, [key]: value },
      },
    });
  return (
    <section className="mt-5 rounded-[2rem] border bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button type="button" onClick={onBack} className="text-sm underline">
            Back to roster
          </button>
          <h2 className="mt-2 text-xl font-semibold">
            Report Customization Studio
          </h2>
          <p className="text-sm text-stone-600">
            Create white-label templates and queue memory-safe server-side PDF
            exports.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={orgId}
            onChange={(event) => setOrgId(event.target.value)}
            className="rounded-xl border p-2 text-sm"
          >
            <option value="">My templates</option>
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </select>
          <select
            value={draft.id ?? ""}
            onChange={(event) => {
              const template = templates.find(
                (item) => item.id === event.target.value,
              );
              if (template) select(template);
              else setDraft(emptyDraft());
            }}
            className="rounded-xl border p-2 text-sm"
          >
            <option value="">New template</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
                {template.is_default ? " · Default" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>
      {message ? (
        <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          {message}
        </p>
      ) : null}
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <div className="space-y-5">
          <fieldset className="rounded-2xl border p-4">
            <legend className="px-2 font-medium">
              Template &amp; branding
            </legend>
            <input
              value={draft.name}
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
              placeholder="Template name"
              className="w-full rounded-xl border p-2"
            />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-sm">
                Primary color
                <input
                  type="color"
                  value={draft.branding.primary_color}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      branding: {
                        ...draft.branding,
                        primary_color: event.target.value,
                      },
                    })
                  }
                  className="mt-1 block h-10 w-full"
                />
              </label>
              <label className="text-sm">
                Accent color
                <input
                  type="color"
                  value={draft.branding.accent_color}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      branding: { ...draft.branding, accent_color: event.target.value },
                    })
                  }
                  className="mt-1 block h-10 w-full"
                />
              </label>
            </div>
            <label className="mt-3 block text-sm">
              Typography
              <select
                value={draft.branding.typography}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    branding: {
                      ...draft.branding,
                      typography: event.target
                        .value as ReportBrandingConfig["typography"],
                    },
                  })
                }
                className="mt-1 w-full rounded-xl border p-2"
              >
                <option value="serif">Executive serif</option>
                <option value="sans">Clean sans-serif</option>
                <option value="modern">Modern</option>
              </select>
            </label>
            <div className="mt-4">
              <p className="text-sm font-medium">Organization logo</p>
              <p className="mt-1 text-xs text-stone-500">PNG or JPEG, max. 2 MB</p>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={(event) => void uploadLogo(event.target.files?.[0])}
                className="hidden"
              />
              {draft.branding.logo_url ? (
                <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border bg-stone-50 p-3">
                  <img src={draft.branding.logo_url} alt="Uploaded organization logo" className="h-11 w-16 rounded-lg bg-white object-contain p-1" />
                  <span className="min-w-24 flex-1 truncate text-xs text-stone-600">{logoFileName || "Organization logo uploaded"}</span>
                  <button type="button" onClick={() => logoInputRef.current?.click()} className="rounded-full border bg-white px-3 py-1.5 text-xs">Change Logo</button>
                  <button type="button" onClick={removeLogo} className="rounded-full px-3 py-1.5 text-xs text-red-700">Remove</button>
                </div>
              ) : (
                <button type="button" onClick={() => logoInputRef.current?.click()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-5 text-sm font-medium text-stone-700 hover:border-stone-400 hover:bg-white"><span aria-hidden="true" className="text-lg">↑</span> Upload Organization Logo</button>
              )}
            </div>
          </fieldset>
          <fieldset className="rounded-2xl border p-4">
            <legend className="px-2 font-medium">
              Visible report sections
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries(draft.section_config).map(([key, enabled]) => (
                <label
                  key={key}
                  className="flex items-center gap-2 rounded-xl bg-stone-50 p-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() =>
                      updateSections(key as keyof ReportSectionConfig)
                    }
                  />
                  {key.replace(/_/g, " ")}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="rounded-2xl border p-4">
            <legend className="px-2 font-medium">Custom content</legend>
            <textarea
              value={draft.custom_content.intro_notes}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  custom_content: {
                    ...draft.custom_content,
                    intro_notes: event.target.value,
                  },
                })
              }
              placeholder="Dynamic intro notes"
              className="w-full rounded-xl border p-2"
            />
            <textarea
              value={draft.custom_content.executive_commentary}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  custom_content: {
                    ...draft.custom_content,
                    executive_commentary: event.target.value,
                  },
                })
              }
              placeholder="Executive commentary"
              className="mt-3 w-full rounded-xl border p-2"
            />
            <textarea
              value={draft.custom_content.footer_text}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  custom_content: {
                    ...draft.custom_content,
                    footer_text: event.target.value,
                  },
                })
              }
              placeholder="Custom footer"
              className="mt-3 w-full rounded-xl border p-2"
            />
            <textarea
              value={draft.custom_content.disclaimer}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  custom_content: {
                    ...draft.custom_content,
                    disclaimer: event.target.value,
                  },
                })
              }
              placeholder="Disclaimer"
              className="mt-3 w-full rounded-xl border p-2"
            />
            <p className="mt-4 text-xs font-medium uppercase tracking-[.14em] text-stone-500">Custom section headings</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {(["executive_summary", "behavioral_matrix", "stress_profile", "team_communication", "custom_notes"] as Array<keyof ReportSectionConfig>).map((key) => (
                <input
                  key={key}
                  value={draft.custom_content.section_headers?.[key] ?? ""}
                  onChange={(event) => updateSectionHeader(key, event.target.value)}
                  placeholder={key.replace(/_/g, " ")}
                  className="rounded-xl border p-2 text-sm"
                />
              ))}
            </div>
          </fieldset>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void save()}
              className="rounded-full border px-4 py-2 text-sm disabled:opacity-50"
            >
              Save Template
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void save(true)}
              className="rounded-full bg-stone-900 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              Set as Default
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void queueExport()}
              className="rounded-full bg-stone-900 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              Export Preview PDF
            </button>
          </div>
        </div>
        <ReportPreview draft={draft} />
      </div>
      {draft.id ? (
        <section className="mt-5 rounded-2xl border p-4">
          <h3 className="font-medium">Export history</h3>
          <p className="mt-1 text-sm text-stone-600">
            Server-generated downloads for this template.
          </p>
          <ul className="mt-3 space-y-2">
            {exports.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-3 rounded-xl border bg-stone-50 p-3 text-[0px]">
                <div className="min-w-48 flex-1 text-sm">
                  <p className="font-medium text-stone-800">PDF Export — {new Date(item.created_at).toLocaleString()}</p>
                  <p className="mt-1 text-xs text-stone-500">{item.file_size ? `${Math.max(1, Math.round(item.file_size / 1024))} KB` : "PDF document"}</p>
                </div>
                <button type="button" disabled={historyBusyId === item.id} onClick={() => void downloadExport(item)} className="rounded-full bg-stone-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">Download</button>
                <button type="button" disabled={historyBusyId === item.id} onClick={() => void deleteExport(item)} className="rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 disabled:opacity-50">Delete</button>
                {new Date(item.created_at).toLocaleString()} — {item.file_path ?? "PDF export"}
              </li>
            ))}
            {!exports.length ? <li className="text-stone-500">No exports yet.</li> : null}
          </ul>
        </section>
      ) : null}
    </section>
  );
}

function ReportPreview({ draft }: { draft: Draft }) {
  const { branding, section_config: sections, custom_content: content } = draft;
  const headerFor = (key: keyof ReportSectionConfig, fallback: string) =>
    content.section_headers?.[key]?.trim() || fallback;
  const fontFamily =
    branding.typography === "serif"
      ? "Georgia, serif"
      : branding.typography === "modern"
        ? "Trebuchet MS, sans-serif"
        : "Arial, sans-serif";
  return (
    <>
    <article
      className="min-h-[620px] overflow-hidden rounded-[1.5rem] border bg-[#fffdfa] shadow-[0_18px_45px_rgba(60,45,31,0.10)]"
      style={{ fontFamily, borderColor: `${branding.primary_color}44`, borderTop: `8px solid ${branding.primary_color}` }}
    >
      <header className="flex items-start justify-between gap-4 border-b px-6 py-5" style={{ borderColor: `${branding.primary_color}22`, background: `linear-gradient(135deg, ${branding.primary_color}10, transparent 62%)` }}>
        <div className="min-w-0">
          <p
            className="text-[10px] font-semibold uppercase tracking-[.28em]"
            style={{ color: branding.primary_color }}
          >
            Northstar DISC · Confidential leadership profile
          </p>
          <h3 className="mt-2 text-3xl font-semibold leading-tight text-stone-900">Executive DISC Report</h3>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-medium uppercase tracking-[.12em] text-stone-500"><span className="rounded-full border bg-white px-2.5 py-1">DISC profile</span><span className="rounded-full border bg-white px-2.5 py-1" style={{ borderColor: `${branding.accent_color}66`, color: branding.accent_color }}>Executive edition</span></div>
        </div>
        {branding.logo_url ? (
          <img
            src={branding.logo_url}
            alt="Report logo"
            className="h-14 max-w-28 object-contain"
          />
        ) : null}
      </header>
      <div className="p-6">
      {content.intro_notes ? (
        <PreviewSection title="Executive introduction" text={content.intro_notes} color={branding.accent_color} category="Introduction" />
      ) : null}
      {sections.executive_summary || sections.behavioral_matrix || sections.stress_profile || sections.team_communication || (sections.custom_notes && content.executive_commentary) ? <div className={content.intro_notes ? "mt-5 space-y-3" : "space-y-3"}>
        {sections.executive_summary ? (
          <PreviewSection
            title={headerFor("executive_summary", "Executive summary")}
            text="A decisive, people-aware profile with practical leadership range."
            color={branding.primary_color}
          />
        ) : null}
        {sections.behavioral_matrix ? (
          <PreviewSection
            title={headerFor("behavioral_matrix", "Behavioral matrix")}
            text="Dominance 76% · Influence 64% · Steadiness 42% · Conscientiousness 58%"
            color={branding.accent_color}
          />
        ) : null}
        {sections.stress_profile ? (
          <PreviewSection
            title={headerFor("stress_profile", "Stress profile")}
            text="Under pressure, clarify priorities and allow time for considered responses."
            color={branding.primary_color}
          />
        ) : null}
        {sections.team_communication ? (
          <PreviewSection
            title={headerFor("team_communication", "Team communication")}
            text="Use direct goals, visible ownership, and concise feedback loops."
            color={branding.accent_color}
          />
        ) : null}
        {sections.custom_notes && content.executive_commentary ? (
          <PreviewSection
            title={headerFor("custom_notes", "Executive commentary")}
            text={content.executive_commentary}
            color={branding.primary_color}
          />
        ) : null}
      </div> : null}
      <footer className="mt-8 border-t pt-4 text-xs leading-5 text-stone-500" style={{ borderColor: `${branding.primary_color}33` }}>
        {content.footer_text || "Prepared with Northstar DISC"}
        {content.disclaimer ? (
          <p className="mt-2">{content.disclaimer}</p>
        ) : null}
      </footer>
      </div>
    </article>
    <article
      className="min-h-[620px] overflow-hidden rounded-[1.5rem] border bg-[#fffdfa] shadow-[0_18px_45px_rgba(60,45,31,0.10)]"
      style={{ fontFamily, borderColor: `${branding.primary_color}44`, borderTop: `8px solid ${branding.primary_color}` }}
    >
      <header className="border-b px-6 py-5" style={{ borderColor: `${branding.primary_color}22`, background: `linear-gradient(135deg, ${branding.primary_color}10, transparent 62%)` }}>
        <p className="text-[10px] font-semibold uppercase tracking-[.28em]" style={{ color: branding.primary_color }}>Northstar DISC · Deep leadership insights</p>
        <h3 className="mt-2 text-3xl font-semibold leading-tight text-stone-900">Deep leadership insights</h3>
      </header>
      <div className="space-y-3 p-6">
        <PreviewSection title="Leadership style" text="Your primary DISC tendencies are strongest when priorities are clear, ownership is visible, and decisions balance pace with input from others." color={branding.primary_color} category="Deep insight" />
        <PreviewSection title="Ideal work environment" text="The most effective environment combines clear outcomes, room for focused execution, and communication norms that make expectations explicit." color={branding.accent_color} category="Deep insight" />
        <PreviewSection title="Motivators & triggers" text="Meaningful progress, clarity, and recognition tend to energize performance. Ambiguity, prolonged friction, or unclear standards can create avoidable strain." color={branding.primary_color} category="Deep insight" />
        <PreviewSection title="Actionable growth areas" text={content.executive_commentary || "Use one deliberate pause before key decisions, ask for a complementary perspective, and turn insight into a specific weekly practice."} color={branding.accent_color} category="Deep insight" />
      </div>
    </article>
    </>
  );
}
function PreviewSection({
  title,
  text,
  color,
  category = "Executive insight",
}: {
  title: string;
  text: string;
  color: string;
  category?: string;
}) {
  return (
    <section
      className="rounded-xl border bg-stone-50 p-4 shadow-sm"
      style={{ borderColor: `${color}55`, borderLeft: `5px solid ${color}`, background: `linear-gradient(90deg, ${color}0d, #fffdfa 38%)` }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[.18em]" style={{ color }}>{category}</p>
      <h4 className="mt-1 text-base font-semibold text-stone-900">{title}</h4>
      <p className="mt-2 text-sm leading-6 text-stone-600">{text}</p>
    </section>
  );
}
