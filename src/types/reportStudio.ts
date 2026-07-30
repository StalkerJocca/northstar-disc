export type ReportTypography = "serif" | "sans" | "modern";

export interface ReportBrandingConfig {
  primary_color: string;
  accent_color: string;
  logo_url: string | null;
  typography: ReportTypography;
}

export interface ReportSectionConfig {
  executive_summary: boolean;
  behavioral_matrix: boolean;
  stress_profile: boolean;
  team_communication: boolean;
  custom_notes: boolean;
}

export interface CustomReportContent {
  intro_notes: string;
  executive_commentary: string;
  footer_text: string;
  disclaimer: string;
  section_headers?: Partial<Record<keyof ReportSectionConfig, string>>;
}

export interface ReportTemplate {
  id: string;
  org_id: string | null;
  coach_id: string;
  name: string;
  branding: ReportBrandingConfig;
  section_config: ReportSectionConfig;
  custom_content: CustomReportContent;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReportExportRecord {
  id: string;
  report_id: string | null;
  template_id: string | null;
  file_path: string | null;
  file_size?: number | null;
  created_at: string;
}

export const defaultReportBranding: ReportBrandingConfig = {
  primary_color: "#8b5e3c",
  accent_color: "#c78e69",
  logo_url: null,
  typography: "serif",
};
export const defaultReportSections: ReportSectionConfig = {
  executive_summary: true,
  behavioral_matrix: true,
  stress_profile: true,
  team_communication: true,
  custom_notes: true,
};
export const defaultCustomReportContent: CustomReportContent = {
  intro_notes: "",
  executive_commentary: "",
  footer_text: "",
  disclaimer: "",
  section_headers: {},
};
