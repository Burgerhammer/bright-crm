"use client";

import { useState } from "react";
import { Phone, Loader2 } from "lucide-react";

interface CallButtonProps {
  phoneNumber: string;
  contactId?: string;
  dealId?: string;
  leadId?: string;
  onCalled?: () => void;
}

export default function CallButton({
  phoneNumber,
  contactId,
  dealId,
  leadId,
  onCalled,
}: CallButtonProps) {
  const [calling, setCalling] = useState(false);
  const [status, setStatus] = useState<"idle" | "calling" | "success" | "error">("idle");

  const logCallActivity = async () => {
    try {
      await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "call",
          subject: `Call to ${phoneNumber}`,
          status: "Completed",
          contactId,
          dealId,
          leadId,
        }),
      });
    } catch {
      // Activity logging is best-effort
    }
  };

  const handleCall = async () => {
    setCalling(true);
    setStatus("calling");

    try {
      const res = await fetch("/api/integrations/twilio/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: phoneNumber, contactId, dealId, leadId }),
      });

      if (res.ok) {
        setStatus("success");
        onCalled?.();
        setTimeout(() => setStatus("idle"), 3000);
      } else {
        // Twilio not configured — log activity and use native dialer
        await logCallActivity();
        onCalled?.();
        window.location.href = `tel:${phoneNumber}`;
        setStatus("idle");
      }
    } catch {
      // No integration — log activity and use native dialer
      await logCallActivity();
      onCalled?.();
      window.location.href = `tel:${phoneNumber}`;
      setStatus("idle");
    }

    setCalling(false);
  };

  return (
    <button
      onClick={handleCall}
      disabled={calling}
      className={`bc-btn text-xs ${
        status === "success"
          ? "bg-green-50 text-green-700 border-green-200"
          : status === "error"
          ? "bg-red-50 text-red-700 border-red-200"
          : "bc-btn-neutral"
      }`}
      title={`Call ${phoneNumber}`}
    >
      {calling ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Phone className="w-3.5 h-3.5" />
      )}
      {status === "success"
        ? "Call initiated"
        : status === "error"
        ? "Call failed"
        : "Call"}
    </button>
  );
}
