"use client";

import { useEffect, useState } from "react";
import type { AppSessionUser } from "@/lib/auth/server";

import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import EmailList from "@/components/email/EmailList";
import EmailSidebar from "@/components/email/EmailSidebar";

export function EmailDashboard({ user }: { user: AppSessionUser }) {
  const [selectedEmailAddress, setSelectedEmailAddress] = useState<
    string | null
  >(null);
  const { isMobile } = useMediaQuery();
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAdminModel, setAdminModel] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(true);

  useEffect(() => {
    setSelectedEmailId(null);
  }, [selectedEmailAddress]);

  useEffect(() => {
    if (isMobile) {
      setIsMobileSidebarOpen(!selectedEmailAddress);
      return;
    }

    setIsMobileSidebarOpen(true);
  }, [isMobile, selectedEmailAddress]);

  const handleSelectEmailAddress = (emailAddress: string | null) => {
    setSelectedEmailAddress(emailAddress);

    if (isMobile && emailAddress) {
      setIsMobileSidebarOpen(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-60px)] w-full min-w-0 overflow-hidden">
      <EmailSidebar
        className={cn(
          isMobile
            ? isMobileSidebarOpen
              ? "w-full"
              : "hidden"
            : !isCollapsed
              ? "w-64 xl:w-72"
              : "w-16",
        )}
        user={user}
        onSelectEmail={handleSelectEmailAddress}
        selectedEmailAddress={selectedEmailAddress}
        isCollapsed={isMobile ? false : isCollapsed}
        setIsCollapsed={setIsCollapsed}
        isAdminModel={isAdminModel}
        setAdminModel={setAdminModel}
        setIsMobileSidebarOpen={setIsMobileSidebarOpen}
      />
      <EmailList
        className={cn("min-w-0 flex-1", isMobile && isMobileSidebarOpen && "hidden")}
        emailAddress={selectedEmailAddress}
        selectedEmailId={selectedEmailId}
        onSelectEmail={setSelectedEmailId}
        isAdminModel={isAdminModel}
        showMailboxSwitcher={isMobile}
        onShowMailboxList={() => setIsMobileSidebarOpen(true)}
      />
    </div>
  );
}
