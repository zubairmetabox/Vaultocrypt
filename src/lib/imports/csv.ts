import Papa from "papaparse";

import type { CsvPreviewSummary, ParsedCsvFile, ParsedCsvRow } from "@/lib/imports/types";

function normalizeRow(row: Record<string, unknown>, headers: string[]): ParsedCsvRow {
  return headers.reduce<ParsedCsvRow>((accumulator, header) => {
    const value = row[header];

    accumulator[header] =
      typeof value === "string"
        ? value
        : value == null
          ? ""
          : String(value);

    return accumulator;
  }, {});
}

export function parseCsvText(text: string): ParsedCsvFile {
  const result = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
  });

  // FieldMismatch (too many / too few fields) is non-fatal — PapaParse still
  // parses the row. Only throw on structural errors like bad quoting.
  const fatalErrors = result.errors.filter((e) => e.type !== "FieldMismatch");
  if (fatalErrors.length > 0) {
    console.error("[csv] Parse error:", fatalErrors[0]);
    throw new Error("The CSV file could not be parsed. Please check the file format and try again.");
  }

  const headers = (result.meta.fields ?? []).map((header) => header.trim());
  const rows = result.data.map((row) => normalizeRow(row, headers));

  return {
    headers,
    rows,
  };
}

export function buildCsvPreview(
  parsedFile: ParsedCsvFile,
  sampleSize = 5,
): CsvPreviewSummary {
  return {
    rowCount: parsedFile.rows.length,
    headers: parsedFile.headers,
    sampleRows: parsedFile.rows.slice(0, sampleSize),
  };
}
