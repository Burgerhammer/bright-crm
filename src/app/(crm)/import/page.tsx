"use client";

import { useState, useRef } from "react";
import { Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react";

const ENTITY_TYPES = [
  { value: "contacts", label: "Contacts" },
  { value: "leads", label: "Leads" },
  { value: "accounts", label: "Accounts" },
  { value: "deals", label: "Deals" },
];

export default function ImportExportPage() {
  const [importType, setImportType] = useState("contacts");
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const [importError, setImportError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = (type: string) => {
    window.location.href = `/api/export?type=${type}`;
  };

  const handleDownloadTemplate = () => {
    window.location.href = `/api/export?type=${importType}&template=true`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
    setResult(null);
    setImportError("");
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setResult(null);
    setImportError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", importType);

      const res = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setImportError(data.error || "Import failed");
        return;
      }

      const data = await res.json();
      setResult(data);
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch {
      setImportError("An unexpected error occurred during import.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center gap-2 mb-6">
        <FileSpreadsheet className="w-6 h-6 text-[#706E6B]" />
        <h1 className="text-xl font-bold text-[#3E3E3C]">Import / Export</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Export Section */}
        <div className="bc-card">
          <div className="bc-section-header flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Data
          </div>
          <div className="p-4">
            <p className="text-sm text-[#706E6B] mb-4">
              Download your CRM data as CSV files.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ENTITY_TYPES.map((entity) => (
                <button
                  key={entity.value}
                  onClick={() => handleExport(entity.value)}
                  className="bc-btn bc-btn-neutral"
                >
                  <Download className="w-4 h-4" />
                  Export {entity.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Import Section */}
        <div className="bc-card">
          <div className="bc-section-header flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Import Data
          </div>
          <div className="p-4">
            <p className="text-sm text-[#706E6B] mb-4">
              Upload a CSV file to import records. Download a template first to
              see the expected format.
            </p>

            {/* Entity Type Selector */}
            <div className="mb-4">
              <label className="bc-label">Record Type</label>
              <select
                value={importType}
                onChange={(e) => {
                  setImportType(e.target.value);
                  setResult(null);
                  setImportError("");
                }}
                className="bc-input"
              >
                {ENTITY_TYPES.map((entity) => (
                  <option key={entity.value} value={entity.value}>
                    {entity.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Download Template Link */}
            <div className="mb-4">
              <button
                onClick={handleDownloadTemplate}
                className="text-sm text-[#0070D2] hover:text-[#005FB2] underline"
              >
                Download {importType} template
              </button>
            </div>

            {/* File Upload */}
            <div className="mb-4">
              <label className="bc-label">CSV File</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="bc-input py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-[#F4F6F9] file:text-[#3E3E3C] hover:file:bg-[#DDDBDA]"
              />
            </div>

            {/* Import Button */}
            <button
              onClick={handleImport}
              disabled={!file || importing}
              className="bc-btn bc-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-4 h-4" />
              {importing ? "Importing..." : "Import"}
            </button>

            {/* Import Error */}
            {importError && (
              <div className="mt-4 flex items-start gap-2 text-sm px-3 py-2 rounded bg-red-50 text-red-700 border border-red-200">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            {/* Import Results */}
            {result && (
              <div className="mt-4 space-y-3">
                <div className="flex items-start gap-2 text-sm px-3 py-2 rounded bg-green-50 text-green-700 border border-green-200">
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>
                    Import complete: <strong>{result.imported}</strong> records
                    imported, <strong>{result.skipped}</strong> skipped.
                  </span>
                </div>

                {result.errors.length > 0 && (
                  <div className="text-sm px-3 py-2 rounded bg-yellow-50 text-yellow-800 border border-yellow-200">
                    <div className="flex items-center gap-2 mb-1 font-medium">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      Issues ({result.errors.length})
                    </div>
                    <ul className="list-disc pl-5 space-y-0.5 max-h-40 overflow-y-auto">
                      {result.errors.map((err, i) => (
                        <li key={i} className="text-xs">
                          {err}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
