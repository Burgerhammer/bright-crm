"use client";

import { useState, useEffect } from "react";
import TopNav from "@/components/layout/TopNav";
import Sidebar from "@/components/layout/Sidebar";
import Dialpad from "@/components/integrations/Dialpad";
import DialpadMiniDialer from "@/components/integrations/DialpadMiniDialer";

export default function CrmShell({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName: string;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dialpadOpen, setDialpadOpen] = useState(false);
  const [dialpadNumber, setDialpadNumber] = useState("");
  const [dialpadStatus, setDialpadStatus] = useState<{
    connected: boolean;
    miniDialerUrl: string | null;
  }>({ connected: false, miniDialerUrl: null });

  useEffect(() => {
    fetch("/api/integrations/dialpad/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setDialpadStatus({
            connected: data.connected,
            miniDialerUrl: data.miniDialerUrl,
          });
        }
      })
      .catch(() => {
        // Dialpad integration not available — use fallback dialpad
      });
  }, []);

  const openDialpad = (number?: string) => {
    if (number) setDialpadNumber(number);
    setDialpadOpen(true);
  };

  const closeDialpad = () => {
    setDialpadOpen(false);
    setDialpadNumber("");
  };

  const useDialpadMiniDialer =
    dialpadStatus.connected && !!dialpadStatus.miniDialerUrl;

  return (
    <div className="min-h-screen bg-[#F4F6F9]">
      <TopNav
        userName={userName}
        onOpenDialpad={() => openDialpad()}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
      />
      <div className="flex">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 p-3 sm:p-6">{children}</main>
      </div>
      {useDialpadMiniDialer ? (
        <DialpadMiniDialer
          open={dialpadOpen}
          onClose={closeDialpad}
          miniDialerUrl={dialpadStatus.miniDialerUrl!}
          initialNumber={dialpadNumber}
        />
      ) : (
        <Dialpad
          open={dialpadOpen}
          onClose={closeDialpad}
          initialNumber={dialpadNumber}
        />
      )}
    </div>
  );
}
