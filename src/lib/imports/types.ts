export const IMPORT_CATEGORIES = ["Clients", "Internal"] as const;

export type ImportCategory = (typeof IMPORT_CATEGORIES)[number];

export const IMPORT_TARGET_FIELDS = [
  "entry_category",
  "entry_name",
  "client_contact",
  "client_vertical",
  "client_status",
  "record_title",
  "record_type",
  "record_url",
  "record_username",
  "record_secret",
  "record_notes",
] as const;

export type ImportTargetField = (typeof IMPORT_TARGET_FIELDS)[number];

export type ImportMapping = Partial<Record<ImportTargetField, string>>;

export type ParsedCsvRow = Record<string, string>;

export type ParsedCsvFile = {
  headers: string[];
  rows: ParsedCsvRow[];
};

export type CsvPreviewSummary = {
  rowCount: number;
  headers: string[];
  sampleRows: ParsedCsvRow[];
};
