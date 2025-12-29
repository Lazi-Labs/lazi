'use client';

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { X, Trash2, Download, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

type SettingsTab = 'settings' | 'profit' | 'accts' | 'truck-types' | 'serv-titan';
type AcctsSubTab = 'service' | 'material' | 'equip';

interface ProfitTier {
  id: string;
  from: number;
  to: number;
  marginPercent: number;
}

interface PricebookSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PricebookSettingsModal({ open, onOpenChange }: PricebookSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('settings');
  const [acctsSubTab, setAcctsSubTab] = useState<AcctsSubTab>('service');
  const [profitMode, setProfitMode] = useState<'margin' | 'markup'>('margin');

  // Settings state
  const [settings, setSettings] = useState({
    soldRates: [
      { perDay: '', perHour: '300.00' },
      { perDay: '2850.00', perHour: '285.00' },
      { perDay: '2500.00', perHour: '250.00' },
      { perDay: '', perHour: '' },
      { perDay: '', perHour: '' },
      { perDay: '', perHour: '' },
      { perDay: '', perHour: '' },
      { perDay: '', perHour: '' },
    ],
    memberDiscount: '',
    addOnDiscount: '10%',
    hrsPerSoldDay: '6',
    highlightCostIncreasesAbove: '',
    showInactive: false,
    showLowerCostFlag: true,
    useAverageVendorCost: false,
    alwaysShowLinkedMaterials: true,
    dontSyncMaterials: false,
    dontPushImages: false,
    dontPullImages: false,
    barcodeStyle: 'code128' as 'code128' | 'qrcode',
    barcodeValue: 'code' as 'code' | 'upc' | 'none',
  });

  // Profit tiers state
  const [profitTiers, setProfitTiers] = useState<ProfitTier[]>([
    { id: '1', from: 0, to: 10, marginPercent: 70 },
    { id: '2', from: 10.01, to: 50, marginPercent: 60 },
    { id: '3', from: 50.01, to: 200, marginPercent: 50 },
    { id: '4', from: 200.01, to: 500, marginPercent: 40 },
    { id: '5', from: 500.01, to: 1000, marginPercent: 35 },
    { id: '6', from: 1000.01, to: 2000, marginPercent: 30 },
    { id: '7', from: 2000.01, to: 5000, marginPercent: 25 },
    { id: '8', from: 5000.01, to: 15000, marginPercent: 20 },
  ]);

  // Accounts state
  const [accounts, setAccounts] = useState({
    service: ['INCOME-Sales'],
    material: [],
    equip: [],
  });

  // Service Titan settings
  const [serviceTitanSettings, setServiceTitanSettings] = useState({
    inventoryTrackingOn: false,
    roundServicePrices: true,
    appendNameWithSoldHours: false,
    appendDescWithEquipCodes: false,
    appendDescWithWarranty: false,
    usePreferredVendorPart: false,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const addProfitTier = () => {
    const lastTier = profitTiers[profitTiers.length - 1];
    const newTier: ProfitTier = {
      id: String(Date.now()),
      from: lastTier ? lastTier.to + 0.01 : 0,
      to: lastTier ? lastTier.to + 1000 : 100,
      marginPercent: 15,
    };
    setProfitTiers([...profitTiers, newTier]);
  };

  const removeProfitTier = (id: string) => {
    setProfitTiers(profitTiers.filter(t => t.id !== id));
  };

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'settings', label: 'SETTINGS' },
    { id: 'profit', label: 'PROFIT' },
    { id: 'accts', label: 'ACCTS' },
    { id: 'truck-types', label: 'TRUCK TYPES' },
    { id: 'serv-titan', label: 'SERV TITAN' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 bg-[#2d2d2d] text-white border-0 overflow-hidden">
        {/* Header with tabs */}
        <div className="flex items-center border-b border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-3 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "text-white border-b-2 border-white"
                  : "text-gray-400 hover:text-white"
              )}
            >
              {tab.label}
            </button>
          ))}
          <button
            onClick={() => onOpenChange(false)}
            className="ml-auto p-3 text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[600px] overflow-y-auto">
          {/* SETTINGS Tab */}
          {activeTab === 'settings' && (
            <div className="p-4 space-y-4">
              {/* Sold Rates Table */}
              <div>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div></div>
                  <div className="text-xs text-gray-400 text-center">PER DAY</div>
                  <div className="text-xs text-gray-400 text-center">PER HOUR</div>
                </div>
                {settings.soldRates.map((rate, idx) => (
                  <div key={idx} className="grid grid-cols-3 gap-2 mb-1 items-center">
                    <Label className="text-sm text-gray-300">Sold Rate #{idx + 1}</Label>
                    <Input
                      value={rate.perDay}
                      onChange={(e) => {
                        const newRates = [...settings.soldRates];
                        newRates[idx].perDay = e.target.value;
                        setSettings({ ...settings, soldRates: newRates });
                      }}
                      className="h-8 bg-white text-black text-sm text-right"
                      placeholder=""
                    />
                    <Input
                      value={rate.perHour}
                      onChange={(e) => {
                        const newRates = [...settings.soldRates];
                        newRates[idx].perHour = e.target.value;
                        setSettings({ ...settings, soldRates: newRates });
                      }}
                      className="h-8 bg-white text-black text-sm text-right"
                      placeholder=""
                    />
                  </div>
                ))}
              </div>

              {/* Discounts */}
              <div className="space-y-2 pt-4 border-t border-gray-700">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-gray-300">Member discount</Label>
                  <Input
                    value={settings.memberDiscount}
                    onChange={(e) => setSettings({ ...settings, memberDiscount: e.target.value })}
                    className="w-24 h-8 bg-white text-black text-sm text-right"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-gray-300">Add-on discount</Label>
                  <Input
                    value={settings.addOnDiscount}
                    onChange={(e) => setSettings({ ...settings, addOnDiscount: e.target.value })}
                    className="w-24 h-8 bg-white text-black text-sm text-right"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-gray-300">Hrs per "sold day"</Label>
                  <Input
                    value={settings.hrsPerSoldDay}
                    onChange={(e) => setSettings({ ...settings, hrsPerSoldDay: e.target.value })}
                    className="w-24 h-8 bg-white text-black text-sm text-right"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-gray-300">Highlight cost increases above...</Label>
                  <Input
                    value={settings.highlightCostIncreasesAbove}
                    onChange={(e) => setSettings({ ...settings, highlightCostIncreasesAbove: e.target.value })}
                    className="w-24 h-8 bg-white text-black text-sm text-right"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-4 border-t border-gray-700">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-gray-300">Show inactive?</Label>
                  <Checkbox
                    checked={settings.showInactive}
                    onCheckedChange={(v) => setSettings({ ...settings, showInactive: !!v })}
                    className="border-gray-500 data-[state=checked]:bg-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-gray-300">Show "lower cost" flag?</Label>
                  <Checkbox
                    checked={settings.showLowerCostFlag}
                    onCheckedChange={(v) => setSettings({ ...settings, showLowerCostFlag: !!v })}
                    className="border-gray-500 data-[state=checked]:bg-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-gray-300">Use average vendor cost</Label>
                  <Checkbox
                    checked={settings.useAverageVendorCost}
                    onCheckedChange={(v) => setSettings({ ...settings, useAverageVendorCost: !!v })}
                    className="border-gray-500 data-[state=checked]:bg-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-gray-300">Always show linked materials</Label>
                  <Checkbox
                    checked={settings.alwaysShowLinkedMaterials}
                    onCheckedChange={(v) => setSettings({ ...settings, alwaysShowLinkedMaterials: !!v })}
                    className="border-gray-500 data-[state=checked]:bg-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-gray-300">Don't sync materials</Label>
                  <Checkbox
                    checked={settings.dontSyncMaterials}
                    onCheckedChange={(v) => setSettings({ ...settings, dontSyncMaterials: !!v })}
                    className="border-gray-500 data-[state=checked]:bg-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-gray-300">Don't push images</Label>
                  <Checkbox
                    checked={settings.dontPushImages}
                    onCheckedChange={(v) => setSettings({ ...settings, dontPushImages: !!v })}
                    className="border-gray-500 data-[state=checked]:bg-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-gray-300">Don't pull images</Label>
                  <Checkbox
                    checked={settings.dontPullImages}
                    onCheckedChange={(v) => setSettings({ ...settings, dontPullImages: !!v })}
                    className="border-gray-500 data-[state=checked]:bg-blue-500"
                  />
                </div>
              </div>

              {/* Barcode Settings */}
              <div className="space-y-3 pt-4 border-t border-gray-700">
                <div className="flex items-center gap-4">
                  <Label className="text-sm text-gray-400 w-24">Barcode style:</Label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={settings.barcodeStyle === 'code128'}
                        onCheckedChange={() => setSettings({ ...settings, barcodeStyle: 'code128' })}
                        className="border-gray-500 data-[state=checked]:bg-blue-500"
                      />
                      <span className="text-sm">Code 128</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={settings.barcodeStyle === 'qrcode'}
                        onCheckedChange={() => setSettings({ ...settings, barcodeStyle: 'qrcode' })}
                        className="border-gray-500 data-[state=checked]:bg-blue-500"
                      />
                      <span className="text-sm text-gray-400">QR Code</span>
                    </label>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Label className="text-sm text-gray-400 w-24">Barcode value:</Label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={settings.barcodeValue === 'code'}
                        onCheckedChange={() => setSettings({ ...settings, barcodeValue: 'code' })}
                        className="border-gray-500 data-[state=checked]:bg-blue-500"
                      />
                      <span className="text-sm">Code</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={settings.barcodeValue === 'upc'}
                        onCheckedChange={() => setSettings({ ...settings, barcodeValue: 'upc' })}
                        className="border-gray-500 data-[state=checked]:bg-blue-500"
                      />
                      <span className="text-sm text-gray-400">UPC</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={settings.barcodeValue === 'none'}
                        onCheckedChange={() => setSettings({ ...settings, barcodeValue: 'none' })}
                        className="border-gray-500 data-[state=checked]:bg-blue-500"
                      />
                      <span className="text-sm text-gray-400">None</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PROFIT Tab */}
          {activeTab === 'profit' && (
            <div className="p-4">
              {/* Header */}
              <div className="grid grid-cols-4 gap-2 mb-2 text-xs text-gray-400">
                <div className="text-right">From</div>
                <div>To</div>
                <div>Margin %</div>
                <div></div>
              </div>

              {/* Profit Tiers */}
              <div className="space-y-2 bg-white rounded-lg p-4 text-black">
                {profitTiers.map((tier, idx) => (
                  <div key={tier.id} className="grid grid-cols-4 gap-2 items-center">
                    <div className="text-right text-sm text-gray-500">
                      {formatCurrency(tier.from)}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400">→</span>
                      <Input
                        type="number"
                        value={tier.to}
                        onChange={(e) => {
                          const newTiers = [...profitTiers];
                          newTiers[idx].to = parseFloat(e.target.value) || 0;
                          setProfitTiers(newTiers);
                        }}
                        className="h-7 text-sm"
                      />
                    </div>
                    <div>
                      <Input
                        type="number"
                        value={tier.marginPercent}
                        onChange={(e) => {
                          const newTiers = [...profitTiers];
                          newTiers[idx].marginPercent = parseFloat(e.target.value) || 0;
                          setProfitTiers(newTiers);
                        }}
                        className="h-7 text-sm"
                      />
                    </div>
                    <div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-gray-400 hover:text-red-500"
                        onClick={() => removeProfitTier(tier.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Add New Row */}
                <div className="grid grid-cols-4 gap-2 items-center pt-2">
                  <div className="text-right text-sm text-gray-500">
                    {profitTiers.length > 0 ? formatCurrency(profitTiers[profitTiers.length - 1].to + 0.01) : '$0.00'}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400">→</span>
                    <button
                      onClick={addProfitTier}
                      className="text-green-600 text-sm font-medium hover:text-green-700"
                    >
                      + New
                    </button>
                  </div>
                  <div></div>
                  <div></div>
                </div>
              </div>

              {/* Margin/Markup Toggle */}
              <div className="flex items-center justify-center gap-8 mt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={profitMode === 'margin'}
                    onCheckedChange={() => setProfitMode('margin')}
                    className="border-gray-500 data-[state=checked]:bg-blue-500"
                  />
                  <span className="text-sm">Margin</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={profitMode === 'markup'}
                    onCheckedChange={() => setProfitMode('markup')}
                    className="border-gray-500 data-[state=checked]:bg-gray-500"
                  />
                  <span className="text-sm text-gray-400">Markup</span>
                </label>
              </div>
            </div>
          )}

          {/* ACCTS Tab */}
          {activeTab === 'accts' && (
            <div className="p-4">
              {/* Sub-tabs */}
              <div className="flex items-center gap-4 mb-4 border-b border-gray-700 pb-2">
                <button
                  onClick={() => setAcctsSubTab('service')}
                  className={cn(
                    "text-sm font-medium",
                    acctsSubTab === 'service' ? "text-white" : "text-gray-400"
                  )}
                >
                  SERVICE ACCTS
                </button>
                <button
                  onClick={() => setAcctsSubTab('material')}
                  className={cn(
                    "text-sm font-medium",
                    acctsSubTab === 'material' ? "text-white" : "text-gray-400"
                  )}
                >
                  MATERIAL ACCTS
                </button>
                <button
                  onClick={() => setAcctsSubTab('equip')}
                  className={cn(
                    "text-sm font-medium",
                    acctsSubTab === 'equip' ? "text-white" : "text-gray-400"
                  )}
                >
                  EQUIP ACCTS
                </button>
              </div>

              {/* Accounts List */}
              <div className="bg-white rounded-lg p-4 text-black min-h-[300px]">
                {acctsSubTab === 'service' && (
                  <div className="space-y-2">
                    {accounts.service.map((acct, idx) => (
                      <div key={idx} className="text-sm">{acct}</div>
                    ))}
                    <button className="text-green-600 text-sm font-medium">+ New</button>
                    <button className="text-green-600 text-sm font-medium block">+ New</button>
                  </div>
                )}
                {acctsSubTab === 'material' && (
                  <div className="space-y-2">
                    {accounts.material.map((acct, idx) => (
                      <div key={idx} className="text-sm">{acct}</div>
                    ))}
                    <button className="text-green-600 text-sm font-medium">+ New</button>
                  </div>
                )}
                {acctsSubTab === 'equip' && (
                  <div className="space-y-2">
                    {accounts.equip.map((acct, idx) => (
                      <div key={idx} className="text-sm">{acct}</div>
                    ))}
                    <button className="text-green-600 text-sm font-medium">+ New</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TRUCK TYPES Tab */}
          {activeTab === 'truck-types' && (
            <div className="p-4">
              <div className="bg-white rounded-lg p-4 text-black min-h-[300px]">
                <p className="text-gray-500 text-sm">No truck types configured</p>
                <button className="text-green-600 text-sm font-medium mt-2">+ New</button>
              </div>
            </div>
          )}

          {/* SERV TITAN Tab */}
          {activeTab === 'serv-titan' && (
            <div className="p-4 space-y-4">
              {/* Service Titan Header */}
              <div className="bg-gray-700 rounded-lg p-3 flex items-center justify-center gap-2">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold">🐯</span>
                </div>
                <span className="font-semibold">SERVICE TITAN</span>
              </div>

              {/* Pull/Push Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="bg-transparent border-gray-600 text-white hover:bg-gray-700">
                  <Download className="h-4 w-4 mr-2" />
                  Pull...
                </Button>
                <Button variant="outline" className="bg-transparent border-gray-600 text-white hover:bg-gray-700">
                  <Upload className="h-4 w-4 mr-2" />
                  Push...
                </Button>
              </div>

              {/* Settings */}
              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Inventory Tracking is ON</Label>
                  <Checkbox
                    checked={serviceTitanSettings.inventoryTrackingOn}
                    onCheckedChange={(v) => setServiceTitanSettings({ ...serviceTitanSettings, inventoryTrackingOn: !!v })}
                    className="border-gray-500 data-[state=checked]:bg-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Round service prices to nearest dollar when pushing to Service Titan?</Label>
                  <Checkbox
                    checked={serviceTitanSettings.roundServicePrices}
                    onCheckedChange={(v) => setServiceTitanSettings({ ...serviceTitanSettings, roundServicePrices: !!v })}
                    className="border-gray-500 data-[state=checked]:bg-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Append name with sold hours and material net when pushing to Service Titan? (Pull to view.)</Label>
                  <Checkbox
                    checked={serviceTitanSettings.appendNameWithSoldHours}
                    onCheckedChange={(v) => setServiceTitanSettings({ ...serviceTitanSettings, appendNameWithSoldHours: !!v })}
                    className="border-gray-500 data-[state=checked]:bg-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Append description with equipment codes when pushing to Service Titan? (Pull to view.)</Label>
                  <Checkbox
                    checked={serviceTitanSettings.appendDescWithEquipCodes}
                    onCheckedChange={(v) => setServiceTitanSettings({ ...serviceTitanSettings, appendDescWithEquipCodes: !!v })}
                    className="border-gray-500 data-[state=checked]:bg-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Append description with warranty info when pushing to Service Titan?</Label>
                  <Checkbox
                    checked={serviceTitanSettings.appendDescWithWarranty}
                    onCheckedChange={(v) => setServiceTitanSettings({ ...serviceTitanSettings, appendDescWithWarranty: !!v })}
                    className="border-gray-500 data-[state=checked]:bg-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Use preferred vendor's part description when pushing to Service Titan?</Label>
                  <Checkbox
                    checked={serviceTitanSettings.usePreferredVendorPart}
                    onCheckedChange={(v) => setServiceTitanSettings({ ...serviceTitanSettings, usePreferredVendorPart: !!v })}
                    className="border-gray-500 data-[state=checked]:bg-blue-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
