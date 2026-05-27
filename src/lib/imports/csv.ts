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

  if (result.errors.length > 0) {
    const firstError = result.errors[0];
    throw new Error(
      `CSV parse error on row ${firstError.row ?? "unknown"}: ${firstError.message}`,
    );
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
