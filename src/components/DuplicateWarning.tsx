"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

interface DuplicateMatch {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  matchType: string;
  confidence: "high" | "medium";
  entityType: "Lead" | "Contact";
}

interface DuplicateWarningProps {
  entityType: "Lead" | "Contact";
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  excludeId?: string;
}

function matchLabel(matchType: string): string {
  switch (matchType) {
    case "email":
      return "email match";
    case "name":
      return "name match";
    case "phone":
      return "phone match";
    case "lastName+company":
      return "last name + company match";
    default:
      return matchType;
  }
}

export default function DuplicateWarning({
  entityType,
  firstName,
  lastName,
  email,
  phone,
  company,
  excludeId,
}: DuplicateWarningProps) {
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear previous timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Need at least email or (firstName + lastName) to check
    const hasEmail = email && email.trim().length > 0;
    const hasName =
      firstName && firstName.trim().length > 0 &&
      lastName && lastName.trim().length > 0;

    if (!hasEmail && !hasName) {
      setDuplicates([]);
      return;
    }

    // Debounce 500ms
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/duplicates/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entityType,
            firstName: firstName?.trim() || undefined,
            lastName: lastName?.trim() || undefined,
            email: email?.trim() || undefined,
            phone: phone?.trim() || undefined,
            company: company?.trim() || undefined,
            excludeId,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setDuplicates(data.duplicates || []);
        } else {
          setDuplicates([]);
        }
      } catch {
        setDuplicates([]);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [entityType, firstName, lastName, email, phone, company, excludeId]);

  if (duplicates.length === 0 && !loading) {
    return null;
  }

  if (loading) {
    return null;
  }

  return (
    <div className="mb-4 rounded border border-yellow-200 bg-yellow-50 px-4 py-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
        <div className="text-sm text-yellow-800">
          <p className="font-semibold mb-1">
            Potential duplicate{duplicates.length > 1 ? "s" : ""} found
          </p>
          <ul className="space-y-1">
            {duplicates.map((dup) => {
              const href =
                dup.entityType === "Lead"
                  ? `/leads/${dup.id}`
                  : `/contacts/${dup.id}`;
              return (
                <li key={`${dup.entityType}-${dup.id}`}>
                  Possible duplicate:{" "}
                  <Link
                    href={href}
                    className="font-medium underline text-[#0070D2] hover:text-[#005fb2]"
                    target="_blank"
                  >
                    {dup.name}
                  </Link>
                  {" "}
                  <span className="text-yellow-700">
                    ({dup.entityType} - {matchLabel(dup.matchType)})
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
