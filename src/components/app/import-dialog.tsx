"use client";

import { ChangeEvent, useCallback, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, FileUp, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseCsvText } from "@/lib/imports/csv";
import { type ParsedCsvFile, type ParsedCsvRow } from "@/lib/imports/types";
import type { Client, ClientStatus, VaultRecord } from "@/lib/mock-data";

// ─── Auto-detect field mapping from header names ──────────────────────────────

function autoDetect(headers: string[]): Record<string, string> {
  return Object.fromEntries(
    headers.map((h) => {
      const key = h.toLowerCase().replace(/[\s_\-]+/g, "");

      if (key === "pass" || key === "password" || key.includes("secret")) return [h, "record_secret"];
      if (key.includes("passwordname") || key.includes("pwname") || key.includes("entryname")) return [h, "record_title"];
      if (key.includes("passwordurl") || key.includes("url") || key.includes("link") || key.includes("website")) return [h, "record_url"];
      if (key.includes("login") || key.includes("username") || key.startsWith("user")) return [h, "record_username"];
      if (key.includes("folder") || key.includes("group") || key.includes("vault")) return [h, "entry_name"];
      if (key.includes("note") || key.includes("description") || key.includes("memo")) return [h, "record_notes"];
      if (key.includes("name") || key.includes("title")) return [h, "record_title"];

      return [h, "skip"];
    }),
  );
}

// ─── CSV rows → Client objects ────────────────────────────────────────────────

function hostnameFrom(url: string): string {
  if (!url) return "";
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return url.split("/")[0] ?? url;
  }
}

let importSeq = 0;

function csvToClients(
  rows: ParsedCsvRow[],
  columnMap: Record<string, string>,
): Array<Omit<Client, "id" | "auditTrail">> {
  // Reverse: targetField → sourceColumn
  const fieldToCol: Partial<Record<string, string>> = {};
  for (const [col, field] of Object.entries(columnMap)) {
    if (field !== "skip") fieldToCol[field] = col;
  }

  const pick = (row: ParsedCsvRow, field: string): string =>
    (fieldToCol[field] ? row[fieldToCol[field]!]?.trim() : "") ?? "";

  // Strip folder-path prefix — e.g. "MBX Clients/Acme Corp" → "Acme Corp"
  const stripPrefix = (raw: string) => raw.includes("/") ? raw.split("/").pop()!.trim() : raw.trim();

  // Group rows by entry_name (client / folder name)
  const groups = new Map<string, ParsedCsvRow[]>();
  for (const row of rows) {
    const raw = pick(row, "entry_name") || "Imported";
    const name = stripPrefix(raw) || "Imported";
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name)!.push(row);
  }

  const result: Array<Omit<Client, "id" | "auditTrail">> = [];

  for (const [clientName, clientRows] of groups) {
    const records: VaultRecord[] = clientRows.map((row) => {
      const url = pick(row, "record_url");
      const secret = pick(row, "record_secret");
      const notes = pick(row, "record_notes");
      const type: VaultRecord["type"] = secret ? "credential" : "secure_note";
      const service = hostnameFrom(url) || clientName;

      return {
        id: `imp-${++importSeq}`,
        title: pick(row, "record_title") || "Untitled record",
        type,
        service,
        url,
        username: pick(row, "record_username"),
        secretValue: secret,
        notes,
        lastUpdated: "Just imported",
        sensitivity: "Sensitive",
      };
    });

    const rawStatus = pick(clientRows[0]!, "client_status").toLowerCase();
    const status: ClientStatus = rawStatus === "inactive" ? "Inactive" : "Active";

    result.push({
      name: clientName,
      category: pick(clientRows[0]!, "entry_category") === "Internal" ? "Internal" : "Clients",
      contact: pick(clientRows[0]!, "client_contact"),
      vertical: pick(clientRows[0]!, "client_vertical"),
      status,
      notes: "",
      records,
    });
  }

  return result;
}

// ─── Component ────────────────────────────────────────────────────────────────

type Step = "upload" | "mapping" | "done";

type ImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (clients: Array<Omit<Client, "id" | "auditTrail">>) => void;
};

export function ImportDialog({ open, onOpenChange, onImport }: ImportDialogProps) {
  const [step, setStep] = useState<Step>("upload");
  const [parsedFile, setParsedFile] = useState<ParsedCsvFile | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [importedCount, setImportedCount] = useState<{ clients: number; records: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep("upload");
    setParsedFile(null);
    setFileName("");
    setError("");
    setIsDragging(false);
    setColumnMap({});
    setImportedCount(null);
  }

  function handleDialogChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (!nextOpen) reset();
  }

  const processFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
      setError("Please upload a .csv file.");
      return;
    }
    try {
      const text = await file.text();
      const parsed = parseCsvText(text);
      setFileName(file.name);
      setParsedFile(parsed);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to parse the CSV file.");
      setParsedFile(null);
    }
  }, []);

  function handleFileInput(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleContinueToMapping() {
    if (!parsedFile) return;
    setColumnMap(autoDetect(parsedFile.headers));
    setStep("mapping");
  }

  function handleRunImport() {
    if (!parsedFile) return;
    const clients = csvToClients(parsedFile.rows, columnMap);
    const totalRecords = clients.reduce((sum, c) => sum + c.records.length, 0);
    onImport(clients);
    setImportedCount({ clients: clients.length, records: totalRecords });
    setStep("done");
  }

  const preview = parsedFile
    ? { headers: parsedFile.headers, rows: parsedFile.rows.slice(0, 5), total: parsedFile.rows.length }
    : null;

  // How many columns are mapped (not "skip")
  const mappedCount = Object.values(columnMap).filter((v) => v !== "skip").length;

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-[90vw] max-h-[min(90dvh,860px)]">
        {/* ── Step 1: Upload ── */}
        {step === "upload" && (
          <>
            <DialogHeader>
              <DialogTitle>Import vault data</DialogTitle>
              <DialogDescription>
                Upload a CSV to preview its contents, then map columns to Vaultocrypt fields.
              </DialogDescription>
            </DialogHeader>

            <DialogBody>
            <div className="grid gap-4">
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center gap-3 rounded-[1.5rem] border-2 border-dashed px-6 py-10 text-center transition-all duration-150 ${
                  isDragging
                    ? "border-ring bg-accent/30"
                    : parsedFile
                      ? "border-ring/60 bg-accent/15"
                      : "border-border/70 bg-background/70 hover:border-ring/40 hover:bg-muted/40"
                }`}
              >
                <div className="flex size-12 items-center justify-center rounded-[1.25rem] bg-muted">
                  {parsedFile ? (
                    <FileUp className="size-5 text-primary" />
                  ) : (
                    <UploadCloud className="size-5 text-muted-foreground" />
                  )}
                </div>
                {parsedFile ? (
                  <div>
                    <p className="text-sm font-medium text-foreground">{fileName}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {preview?.total} rows · {preview?.headers.length} columns — click to replace
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Drop a CSV file here, or click to browse
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Supports Zoho Vault, LastPass, Bitwarden, and any structured CSV
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  onChange={handleFileInput}
                />
              </div>

              {error && (
                <div className="rounded-[1.25rem] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {preview && (
                <div className="grid gap-4">
                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "File", value: fileName },
                      { label: "Columns", value: String(preview.headers.length) },
                      { label: "Rows", value: String(preview.total) },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-[1.25rem] border border-border/70 bg-background/70 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
                        <p className="mt-2 truncate text-sm font-medium text-foreground">{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Detected headers */}
                  <div className="rounded-[1.5rem] border border-border/70 bg-background/70 p-4">
                    <p className="text-sm font-medium text-foreground">Detected columns</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {preview.headers.map((h) => (
                        <span
                          key={h}
                          className="rounded-full border border-border/70 bg-card px-3 py-1 text-xs text-muted-foreground"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Sample rows */}
                  <div className="rounded-[1.5rem] border border-border/70 bg-background/70 p-4">
                    <p className="text-sm font-medium text-foreground">Sample rows</p>
                    <div className="mt-3">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {preview.headers.map((h) => (
                              <TableHead key={h} className="whitespace-nowrap text-xs">
                                {h}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {preview.rows.map((row, i) => (
                            <TableRow key={i}>
                              {preview.headers.map((h) => (
                                <TableCell key={h} className="max-w-48 whitespace-pre-wrap text-xs text-muted-foreground">
                                  {row[h] || "–"}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}
            </div>
            </DialogBody>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
              <Button disabled={!parsedFile} onClick={handleContinueToMapping}>
                Map columns
                <ArrowRight className="size-4" />
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ── Step 2: Mapping ── */}
        {step === "mapping" && parsedFile && (
          <>
            <DialogHeader>
              <DialogTitle>Map columns</DialogTitle>
              <DialogDescription>
                Tell Vaultocrypt what each column from your file represents.{" "}
                {mappedCount} of {parsedFile.headers.length} column
                {parsedFile.headers.length === 1 ? "" : "s"} mapped.
              </DialogDescription>
            </DialogHeader>

            <DialogBody>
            <div className="grid gap-3">
              {/* Column headers */}
              <div className="sticky top-0 grid grid-cols-[1fr_1fr_1.5fr] gap-3 rounded-[1.1rem] border border-border/70 bg-card/90 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground backdrop-blur">
                <span>Your column</span>
                <span>Sample value</span>
                <span>Maps to</span>
              </div>

              {parsedFile.headers.map((header) => {
                const sample = parsedFile.rows[0]?.[header] ?? "";
                return (
                  <div
                    key={header}
                    className="grid grid-cols-[1fr_1fr_1.5fr] items-center gap-3 rounded-[1.25rem] border border-border/70 bg-background/80 px-3 py-2.5"
                  >
                    <p className="truncate text-sm font-medium text-foreground">{header}</p>
                    <p className="truncate text-sm text-muted-foreground">{sample || "—"}</p>
                    <Select
                      value={columnMap[header] ?? "skip"}
                      onValueChange={(value) =>
                        setColumnMap((prev) => ({ ...prev, [header]: value }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="skip">— Skip —</SelectItem>
                        <SelectSeparator />
                        <SelectGroup>
                          <SelectLabel>Client Details</SelectLabel>
                          <SelectItem value="entry_name">Client Name</SelectItem>
                          <SelectItem value="client_contact">Client Contact Email</SelectItem>
                          <SelectItem value="client_vertical">Client Industry</SelectItem>
                        </SelectGroup>
                        <SelectSeparator />
                        <SelectGroup>
                          <SelectLabel>Record Details</SelectLabel>
                          <SelectItem value="record_title">Record Title</SelectItem>
                          <SelectItem value="record_url">URL</SelectItem>
                          <SelectItem value="record_username">Username / login</SelectItem>
                          <SelectItem value="record_secret">Password / Secret</SelectItem>
                          <SelectItem value="record_notes">Notes</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}

              {/* Mapping hint */}
              <div className="rounded-[1.25rem] border border-border/70 bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
                <strong className="text-foreground">Tip:</strong> Map{" "}
                <em>Client or folder name</em> to group records into clients. Unmapped columns are
                skipped. Secrets are stored as-is — encryption runs on the server when DB is connected.
              </div>
            </div>
            </DialogBody>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("upload")}>
                <ArrowLeft className="size-4" />
                Back
              </Button>
              <Button onClick={handleRunImport} disabled={mappedCount === 0}>
                Import {parsedFile.rows.length} record{parsedFile.rows.length === 1 ? "" : "s"}
                <ArrowRight className="size-4" />
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ── Step 3: Done ── */}
        {step === "done" && importedCount && (
          <>
            <DialogHeader>
              <DialogTitle>Import complete</DialogTitle>
              <DialogDescription>
                Records have been added to the local directory. They will persist to the database
                once the server layer is connected.
              </DialogDescription>
            </DialogHeader>

            <DialogBody>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[1.5rem] border border-border/70 bg-background/70 px-6 py-5 text-center">
                  <p className="text-3xl font-semibold tabular-nums text-foreground">
                    {importedCount.clients}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {importedCount.clients === 1 ? "client" : "clients"} added
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-border/70 bg-background/70 px-6 py-5 text-center">
                  <p className="text-3xl font-semibold tabular-nums text-foreground">
                    {importedCount.records}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {importedCount.records === 1 ? "record" : "records"} imported
                  </p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Imported clients now appear in the directory. Use{" "}
                <span className="font-medium text-foreground">Edit details</span> on each client to
                fill in contact and vertical, and review records to confirm secrets were captured
                correctly.
              </p>
            </div>
            </DialogBody>

            <DialogFooter>
              <Button onClick={() => handleDialogChange(false)}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
