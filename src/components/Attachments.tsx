"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Paperclip,
  Upload,
  File,
  Image,
  FileText,
  Trash2,
  X,
  AlertCircle,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface AttachmentData {
  id: string;
  filename: string;
  filepath: string;
  size: number;
  mimeType: string;
  owner: { id: string; name: string };
  createdAt: string;
}

interface AttachmentsProps {
  entityType: string;
  entityId: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) {
    return <Image className="w-5 h-5 text-green-600" />;
  }
  if (
    mimeType === "application/pdf" ||
    mimeType === "application/msword" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "text/plain"
  ) {
    return <FileText className="w-5 h-5 text-red-500" />;
  }
  return <File className="w-5 h-5 text-[#706E6B]" />;
}

export default function Attachments({ entityType, entityId }: AttachmentsProps) {
  const [attachments, setAttachments] = useState<AttachmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAttachments = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/attachments?entityType=${entityType}&entityId=${entityId}`
      );
      if (res.ok) {
        const data = await res.json();
        setAttachments(data);
      }
    } catch {
      console.error("Failed to fetch attachments");
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setError("");
    setUploading(true);

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("entityType", entityType);
        formData.append("entityId", entityId);

        const res = await fetch("/api/attachments", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || `Failed to upload ${file.name}`);
        }
      } catch {
        setError(`Failed to upload ${file.name}`);
      }
    }

    setUploading(false);
    fetchAttachments();

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: string, filename: string) => {
    if (!confirm(`Delete "${filename}"?`)) return;

    try {
      const res = await fetch(`/api/attachments/${id}`, { method: "DELETE" });
      if (res.ok) {
        setAttachments((prev) => prev.filter((a) => a.id !== id));
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete attachment");
      }
    } catch {
      setError("Failed to delete attachment");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  };

  return (
    <div className="bc-card mb-4">
      <div className="bc-section-header flex items-center gap-2">
        <Paperclip className="w-4 h-4" />
        Attachments ({attachments.length})
      </div>
      <div className="p-4">
        {/* Upload Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors mb-4 ${
            dragOver
              ? "border-[#0070D2] bg-blue-50"
              : "border-[#DDDBDA] hover:border-[#0070D2]"
          }`}
        >
          <Upload className="w-8 h-8 text-[#706E6B] mx-auto mb-2" />
          <p className="text-sm text-[#706E6B] mb-2">
            Drag and drop files here, or{" "}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[#0070D2] hover:text-[#005FB2] font-medium"
              disabled={uploading}
            >
              browse
            </button>
          </p>
          <p className="text-xs text-[#C9C7C5]">
            Max 10MB. Images, PDF, DOC, DOCX, XLS, XLSX, CSV, TXT
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
            onChange={(e) => handleUpload(e.target.files)}
          />
        </div>

        {uploading && (
          <div className="text-sm text-[#706E6B] mb-3 flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-[#0070D2] border-t-transparent rounded-full animate-spin" />
            Uploading...
          </div>
        )}

        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
            <button
              onClick={() => setError("")}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* File List */}
        {loading ? (
          <div className="text-sm text-[#706E6B] text-center py-4">
            Loading attachments...
          </div>
        ) : attachments.length === 0 ? (
          <div className="text-sm text-[#706E6B] text-center py-4 italic">
            No attachments yet.
          </div>
        ) : (
          <div className="space-y-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-[#DDDBDA] hover:bg-[#F4F6F9] transition-colors"
              >
                {getFileIcon(attachment.mimeType)}
                <div className="flex-1 min-w-0">
                  <a
                    href={attachment.filepath}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={attachment.filename}
                    className="text-sm font-medium text-[#0070D2] hover:text-[#005FB2] truncate block"
                  >
                    {attachment.filename}
                  </a>
                  <p className="text-xs text-[#706E6B]">
                    {formatFileSize(attachment.size)} &middot;{" "}
                    {formatDate(attachment.createdAt)} &middot;{" "}
                    {attachment.owner.name}
                  </p>
                </div>
                <button
                  onClick={() =>
                    handleDelete(attachment.id, attachment.filename)
                  }
                  className="text-[#706E6B] hover:text-red-600 transition-colors p-1"
                  title="Delete attachment"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
