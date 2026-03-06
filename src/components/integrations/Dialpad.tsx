"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Phone,
  PhoneOff,
  X,
  Delete,
  Clock,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Loader2,
  Minimize2,
  Maximize2,
} from "lucide-react";

interface CallLogEntry {
  sid: string;
  from: string;
  to: string;
  status: string;
  direction: string;
  duration: string;
  startTime: string;
}

const dialButtons = [
  { label: "1", sub: "" },
  { label: "2", sub: "ABC" },
  { label: "3", sub: "DEF" },
  { label: "4", sub: "GHI" },
  { label: "5", sub: "JKL" },
  { label: "6", sub: "MNO" },
  { label: "7", sub: "PQRS" },
  { label: "8", sub: "TUV" },
  { label: "9", sub: "WXYZ" },
  { label: "*", sub: "" },
  { label: "0", sub: "+" },
  { label: "#", sub: "" },
];

export default function Dialpad({
  open,
  onClose,
  initialNumber,
}: {
  open: boolean;
  onClose: () => void;
  initialNumber?: string;
}) {
  const [number, setNumber] = useState(initialNumber || "");
  const [calling, setCalling] = useState(false);
  const [callStatus, setCallStatus] = useState<
    "idle" | "calling" | "connected" | "ended" | "failed"
  >("idle");
  const [callDuration, setCallDuration] = useState(0);
  const [tab, setTab] = useState<"dialpad" | "recents">("dialpad");
  const [recentCalls, setRecentCalls] = useState<CallLogEntry[]>([]);
  const [loadingRecents, setLoadingRecents] = useState(false);
  const [minimized, setMinimized] = useState(false);

  // Update number when initialNumber changes
  useEffect(() => {
    if (initialNumber) setNumber(initialNumber);
  }, [initialNumber]);

  // Call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callStatus === "connected") {
      interval = setInterval(() => {
        setCallDuration((d) => d + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  const fetchRecentCalls = useCallback(async () => {
    setLoadingRecents(true);
    try {
      const res = await fetch("/api/integrations/twilio/log?type=calls&limit=15");
      if (res.ok) {
        const data = await res.json();
        setRecentCalls(data);
      }
    } catch {
      // Twilio may not be configured
    }
    setLoadingRecents(false);
  }, []);

  useEffect(() => {
    if (open && tab === "recents") {
      fetchRecentCalls();
    }
  }, [open, tab, fetchRecentCalls]);

  const handleDial = (digit: string) => {
    if (callStatus !== "idle") return;
    setNumber((n) => n + digit);
  };

  const handleBackspace = () => {
    setNumber((n) => n.slice(0, -1));
  };

  const handleCall = async () => {
    if (!number.trim() || calling) return;

    // Try Twilio first, fall back to native tel: link
    setCalling(true);
    setCallStatus("calling");
    setCallDuration(0);

    try {
      const res = await fetch("/api/integrations/twilio/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: number }),
      });

      if (res.ok) {
        setCallStatus("connected");
      } else {
        // Twilio not configured or call failed — use native dialer
        window.location.href = `tel:${number}`;
        setCallStatus("idle");
      }
    } catch {
      // No integration available — use native dialer
      window.location.href = `tel:${number}`;
      setCallStatus("idle");
    }

    setCalling(false);
  };

  const handleHangup = () => {
    setCallStatus("ended");
    setTimeout(() => {
      setCallStatus("idle");
      setCallDuration(0);
    }, 2000);
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const formatPhoneDisplay = (num: string) => {
    const digits = num.replace(/\D/g, "");
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    if (digits.length === 11 && digits[0] === "1") {
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    return num;
  };

  if (!open) return null;

  if (minimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setMinimized(false)}
          className="flex items-center gap-2 bg-[#1B2A4A] text-white px-4 py-3 rounded-lg shadow-2xl hover:bg-[#243656] transition-colors"
        >
          <Phone className="w-4 h-4" />
          <span className="text-sm font-medium">Dialpad</span>
          {callStatus === "connected" && (
            <span className="text-xs text-green-400 ml-1">
              {formatDuration(callDuration)}
            </span>
          )}
          <Maximize2 className="w-3.5 h-3.5 ml-1 opacity-60" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-white rounded-xl shadow-2xl border border-[#DDDBDA] overflow-hidden">
      {/* Header */}
      <div className="bg-[#1B2A4A] text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4" />
          <span className="text-sm font-semibold">Phone</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMinimized(true)}
            className="p-1 hover:bg-white/10 rounded"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#DDDBDA]">
        <button
          onClick={() => setTab("dialpad")}
          className={`flex-1 px-4 py-2 text-xs font-semibold transition-colors ${
            tab === "dialpad"
              ? "text-[#0070D2] border-b-2 border-[#0070D2]"
              : "text-[#706E6B] hover:text-[#3E3E3C]"
          }`}
        >
          Dialpad
        </button>
        <button
          onClick={() => setTab("recents")}
          className={`flex-1 px-4 py-2 text-xs font-semibold transition-colors ${
            tab === "recents"
              ? "text-[#0070D2] border-b-2 border-[#0070D2]"
              : "text-[#706E6B] hover:text-[#3E3E3C]"
          }`}
        >
          <span className="flex items-center justify-center gap-1">
            <Clock className="w-3 h-3" />
            Recents
          </span>
        </button>
      </div>

      {tab === "dialpad" ? (
        <div className="p-4">
          {/* Number Display */}
          <div className="mb-4 bg-[#F4F6F9] rounded-lg px-4 py-3 min-h-[56px] flex items-center justify-between">
            <div className="flex-1 overflow-hidden">
              {callStatus === "connected" ? (
                <div>
                  <div className="text-lg font-bold text-[#3E3E3C] truncate">
                    {formatPhoneDisplay(number)}
                  </div>
                  <div className="text-xs text-green-600 font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Connected - {formatDuration(callDuration)}
                  </div>
                </div>
              ) : callStatus === "calling" ? (
                <div>
                  <div className="text-lg font-bold text-[#3E3E3C] truncate">
                    {formatPhoneDisplay(number)}
                  </div>
                  <div className="text-xs text-[#F59E0B] font-semibold flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Calling...
                  </div>
                </div>
              ) : callStatus === "ended" ? (
                <div>
                  <div className="text-lg font-bold text-[#3E3E3C] truncate">
                    {formatPhoneDisplay(number)}
                  </div>
                  <div className="text-xs text-[#706E6B] font-semibold">
                    Call ended - {formatDuration(callDuration)}
                  </div>
                </div>
              ) : callStatus === "failed" ? (
                <div>
                  <div className="text-lg font-bold text-[#3E3E3C] truncate">
                    {formatPhoneDisplay(number)}
                  </div>
                  <div className="text-xs text-red-600 font-semibold">
                    Call failed
                  </div>
                </div>
              ) : (
                <input
                  type="tel"
                  className="w-full bg-transparent text-lg font-bold text-[#3E3E3C] outline-none placeholder-[#C9C7C5]"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="Enter number"
                />
              )}
            </div>
            {number && callStatus === "idle" && (
              <button
                onClick={handleBackspace}
                className="ml-2 p-1 text-[#706E6B] hover:text-[#3E3E3C]"
              >
                <Delete className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Dial Buttons */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {dialButtons.map((btn) => (
              <button
                key={btn.label}
                onClick={() => handleDial(btn.label)}
                disabled={callStatus !== "idle"}
                className="flex flex-col items-center justify-center py-3 rounded-lg bg-[#F4F6F9] hover:bg-[#E8F4FC] active:bg-[#D4E9F7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-xl font-bold text-[#3E3E3C] leading-none">
                  {btn.label}
                </span>
                {btn.sub && (
                  <span className="text-[9px] font-semibold text-[#706E6B] tracking-[2px] mt-0.5">
                    {btn.sub}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Call / Hangup Button */}
          <div className="flex justify-center">
            {callStatus === "idle" || callStatus === "failed" ? (
              <button
                onClick={handleCall}
                disabled={!number.trim() || calling}
                className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 active:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center transition-colors shadow-lg"
              >
                {calling ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <Phone className="w-6 h-6 text-white" />
                )}
              </button>
            ) : (
              <button
                onClick={handleHangup}
                className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 active:bg-red-700 flex items-center justify-center transition-colors shadow-lg"
              >
                <PhoneOff className="w-6 h-6 text-white" />
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Recents Tab */
        <div className="max-h-[400px] overflow-y-auto">
          {loadingRecents ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-[#706E6B]" />
            </div>
          ) : recentCalls.length === 0 ? (
            <div className="text-center py-10 text-sm text-[#706E6B]">
              <Phone className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No recent calls</p>
              <p className="text-xs mt-1">
                Calls made through the CRM will appear here
              </p>
            </div>
          ) : (
            <div>
              {recentCalls.map((call) => {
                const isOutbound =
                  call.direction === "outbound-api" ||
                  call.direction === "outbound-dial";
                const isMissed =
                  call.status === "no-answer" ||
                  call.status === "busy" ||
                  call.status === "canceled";
                const displayNumber = isOutbound ? call.to : call.from;
                const Icon = isMissed
                  ? PhoneMissed
                  : isOutbound
                  ? PhoneOutgoing
                  : PhoneIncoming;
                const iconColor = isMissed
                  ? "text-red-500"
                  : isOutbound
                  ? "text-[#0070D2]"
                  : "text-green-500";

                return (
                  <button
                    key={call.sid}
                    onClick={() => {
                      setNumber(displayNumber);
                      setTab("dialpad");
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F4F6F9] transition-colors text-left border-b border-[#DDDBDA] last:border-b-0"
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${iconColor}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#3E3E3C] truncate">
                        {formatPhoneDisplay(displayNumber)}
                      </div>
                      <div className="text-xs text-[#706E6B]">
                        {isOutbound ? "Outgoing" : "Incoming"}
                        {call.duration && call.duration !== "0"
                          ? ` - ${call.duration}s`
                          : ""}
                      </div>
                    </div>
                    <div className="text-xs text-[#706E6B] flex-shrink-0">
                      {call.startTime
                        ? new Date(call.startTime).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })
                        : ""}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
