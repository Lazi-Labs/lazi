"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MailDisplay } from "./mail-display";
import { MailList } from "./mail-list";
import { type Mail } from "../data";
import { useMailStore } from "../use-mail";
import { NavDesktop } from "./nav-desktop";
import { NavMobile } from "./nav-mobile";
import { MailDisplayMobile } from "./mail-display-mobile";

interface MailProps {
  accounts: {
    label: string;
    email: string;
    icon: React.ReactNode;
  }[];
  mails: Mail[];
  defaultLayout: number[] | undefined;
  defaultCollapsed?: boolean;
  navCollapsedSize: number;
}

export function Mail({
  mails,
  defaultCollapsed = false,
}: MailProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);
  const isMobile = useIsMobile();
  const { selectedMail } = useMailStore();
  const [tab, setTab] = React.useState("all");

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-full">
        {/* Sidebar */}
        {!isMobile && (
          <div className={cn(
            "border-r transition-all duration-300 ease-in-out",
            isCollapsed ? "w-[50px]" : "w-[200px]"
          )}>
            <NavDesktop isCollapsed={isCollapsed} />
          </div>
        )}
        
        {/* Mail List */}
        <div className="flex-1 min-w-[300px] border-r">
          <Tabs
            defaultValue="all"
            className="flex h-full flex-col gap-0"
            onValueChange={(value) => setTab(value)}>
            <div className="flex items-center px-4 py-2">
              <div className="flex items-center gap-2">
                {isMobile && <NavMobile />}
                <h1 className="text-xl font-bold">Inbox</h1>
              </div>
              <TabsList className="ml-auto">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="unread">Unread</TabsTrigger>
              </TabsList>
            </div>
            <Separator />
            <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 p-4 backdrop-blur">
              <form>
                <div className="relative">
                  <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
                  <Input placeholder="Search" className="pl-8" />
                </div>
              </form>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              <MailList
                items={
                  tab === "all" ? mails : mails.filter((item) => item.read === (tab === "read"))
                }
              />
            </div>
          </Tabs>
        </div>
        
        {/* Mail Display */}
        {!isMobile && (
          <div className="flex-1 min-w-[400px]">
            <MailDisplay mail={mails.find((item) => item.id === selectedMail?.id) || null} />
          </div>
        )}
        
        {/* Mobile Mail Display */}
        {isMobile && selectedMail && (
          <MailDisplayMobile mail={mails.find((item) => item.id === selectedMail?.id) || null} />
        )}
      </div>
    </TooltipProvider>
  );
}
