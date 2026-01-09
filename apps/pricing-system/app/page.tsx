"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkforceTab } from "@/components/workforce/workforce-tab";
import { FleetTab } from "@/components/fleet/fleet-tab";
import { ExpensesTab } from "@/components/expenses/expenses-tab";
import { RatesTab } from "@/components/rates/rates-tab";
import { AnalysisTab } from "@/components/analysis/analysis-tab";
import { ScenariosTab } from "@/components/scenarios/scenarios-tab";
import { SettingsTab } from "@/components/settings/settings-tab";
import { DashboardHeader } from "@/components/common/dashboard-header";
import {
  Users,
  Truck,
  Receipt,
  Calculator,
  BarChart3,
  Layers,
  Settings
} from "lucide-react";

export default function PricingSystemPage() {
  const [activeTab, setActiveTab] = useState("workforce");

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:inline-flex">
            <TabsTrigger value="workforce" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Workforce</span>
            </TabsTrigger>
            <TabsTrigger value="fleet" className="gap-2">
              <Truck className="h-4 w-4" />
              <span className="hidden sm:inline">Fleet</span>
            </TabsTrigger>
            <TabsTrigger value="expenses" className="gap-2">
              <Receipt className="h-4 w-4" />
              <span className="hidden sm:inline">Expenses</span>
            </TabsTrigger>
            <TabsTrigger value="rates" className="gap-2">
              <Calculator className="h-4 w-4" />
              <span className="hidden sm:inline">Rates</span>
            </TabsTrigger>
            <TabsTrigger value="analysis" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analysis</span>
            </TabsTrigger>
            <TabsTrigger value="scenarios" className="gap-2">
              <Layers className="h-4 w-4" />
              <span className="hidden sm:inline">Scenarios</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workforce">
            <WorkforceTab />
          </TabsContent>
          <TabsContent value="fleet">
            <FleetTab />
          </TabsContent>
          <TabsContent value="expenses">
            <ExpensesTab />
          </TabsContent>
          <TabsContent value="rates">
            <RatesTab />
          </TabsContent>
          <TabsContent value="analysis">
            <AnalysisTab />
          </TabsContent>
          <TabsContent value="scenarios">
            <ScenariosTab />
          </TabsContent>
          <TabsContent value="settings">
            <SettingsTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
