"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Layers } from "lucide-react";

interface CustomFieldData {
  id: string;
  name: string;
  fieldType: string;
  entityType: string;
  options: string | null;
  required: boolean;
  order: number;
  value: string | null;
  valueId: string | null;
}

interface CustomFieldsProps {
  entityType: string;
  entityId: string;
  editing: boolean;
}

export default function CustomFields({
  entityType,
  entityId,
  editing,
}: CustomFieldsProps) {
  const [fields, setFields] = useState<CustomFieldData[]>([]);
  const [loading, setLoading] = useState(true);
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchFields = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/custom-fields/values?entityType=${entityType}&entityId=${entityId}`
      );
      if (res.ok) {
        const data: CustomFieldData[] = await res.json();
        setFields(data);
        // Initialize local values
        const vals: Record<string, string> = {};
        data.forEach((f) => {
          vals[f.id] = f.value || "";
        });
        setLocalValues(vals);
      }
    } catch {
      console.error("Failed to fetch custom fields");
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  const saveValues = useCallback(
    async (valuesToSave: Record<string, string>) => {
      setSaving(true);
      try {
        await fetch("/api/custom-fields/values", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entityId,
            values: Object.entries(valuesToSave).map(
              ([customFieldId, value]) => ({
                customFieldId,
                value: value || null,
              })
            ),
          }),
        });
      } catch {
        console.error("Failed to save custom field values");
      } finally {
        setSaving(false);
      }
    },
    [entityId]
  );

  const handleChange = (fieldId: string, value: string) => {
    setLocalValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleBlur = () => {
    // Debounced auto-save on blur
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveValues(localValues);
    }, 300);
  };

  if (loading) {
    return null;
  }

  if (fields.length === 0) {
    return null;
  }

  return (
    <div className="bc-card mb-4">
      <div className="bc-section-header flex items-center gap-2">
        <Layers className="w-4 h-4" />
        Custom Fields
        {saving && (
          <span className="text-xs text-[#706E6B] font-normal ml-2">
            Saving...
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map((field) => (
            <div key={field.id}>
              <label className="bc-label">
                {field.name}
                {field.required && editing && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </label>
              {editing ? (
                <FieldInput
                  field={field}
                  value={localValues[field.id] || ""}
                  onChange={(v) => handleChange(field.id, v)}
                  onBlur={handleBlur}
                />
              ) : (
                <FieldDisplay field={field} value={localValues[field.id] || ""} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
  onBlur,
}: {
  field: CustomFieldData;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
}) {
  switch (field.fieldType) {
    case "text":
      return (
        <input
          type="text"
          className="bc-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          required={field.required}
        />
      );
    case "number":
      return (
        <input
          type="number"
          className="bc-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          required={field.required}
        />
      );
    case "date":
      return (
        <input
          type="date"
          className="bc-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          required={field.required}
        />
      );
    case "select": {
      let options: string[] = [];
      try {
        if (field.options) {
          options = JSON.parse(field.options);
        }
      } catch {
        // Invalid options JSON
      }
      return (
        <select
          className="bc-input"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            // Auto-save on select change
            setTimeout(onBlur, 0);
          }}
          required={field.required}
        >
          <option value="">-- Select --</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }
    case "boolean":
      return (
        <div className="flex items-center gap-2 py-1">
          <input
            type="checkbox"
            id={`cf-${field.id}`}
            checked={value === "true"}
            onChange={(e) => {
              onChange(e.target.checked ? "true" : "false");
              // Auto-save on checkbox change
              setTimeout(onBlur, 0);
            }}
            className="w-4 h-4 rounded border-[#DDDBDA] text-[#0070D2] focus:ring-[#0070D2]"
          />
          <label
            htmlFor={`cf-${field.id}`}
            className="text-sm text-[#3E3E3C] cursor-pointer"
          >
            {value === "true" ? "Yes" : "No"}
          </label>
        </div>
      );
    default:
      return (
        <input
          type="text"
          className="bc-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
      );
  }
}

function FieldDisplay({
  field,
  value,
}: {
  field: CustomFieldData;
  value: string;
}) {
  let displayValue = value || "--";

  if (field.fieldType === "boolean") {
    displayValue = value === "true" ? "Yes" : value === "false" ? "No" : "--";
  } else if (field.fieldType === "date" && value) {
    try {
      displayValue = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(value + "T00:00:00"));
    } catch {
      displayValue = value;
    }
  }

  return (
    <p className="text-sm text-[#3E3E3C] py-1">{displayValue}</p>
  );
}
