'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Trash2, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Opportunity, Contact, PipelineStage } from '@/types';

interface OpportunityDetailModalProps {
  opportunity: Opportunity | null;
  stages: PipelineStage[];
  pipelines: { id: string; name: string }[];
  open: boolean;
  onClose: () => void;
  onUpdate: (data: Partial<Opportunity>) => void;
  onDelete: () => void;
}

type TabType = 'details' | 'servicetitan' | 'appointment' | 'tasks' | 'notes' | 'payments' | 'objects';

const tabs: { id: TabType; label: string }[] = [
  { id: 'details', label: 'Opportunity Details' },
  { id: 'servicetitan', label: 'ServiceTitan Opportunity Fields' },
  { id: 'appointment', label: 'Book/Update Appointment' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'notes', label: 'Notes' },
  { id: 'payments', label: 'Payments' },
  { id: 'objects', label: 'Associated Objects' },
];

export function OpportunityDetailModal({
  opportunity,
  stages,
  pipelines,
  open,
  onClose,
  onUpdate,
  onDelete,
}: OpportunityDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [hideEmptyFields, setHideEmptyFields] = useState(false);
  
  const contact = opportunity?.contact as Contact | undefined;
  const currentStageId = typeof opportunity?.stage === 'object' 
    ? opportunity.stage.id 
    : opportunity?.stage;

  const [formData, setFormData] = useState({
    primaryContactName: '',
    primaryEmail: '',
    primaryPhone: '',
    opportunityName: '',
    pipelineId: '',
    stageId: '',
    status: 'open',
    value: 0,
    owner: '',
    followers: '',
    businessName: '',
    source: '',
    tags: '',
  });

  // Update form data when opportunity changes
  useEffect(() => {
    if (opportunity) {
      const contact = opportunity.contact as Contact | undefined;
      const currentStageId = typeof opportunity.stage === 'object' 
        ? opportunity.stage.id 
        : opportunity.stage;
      const currentPipelineId = typeof opportunity.pipeline === 'object'
        ? opportunity.pipeline.id
        : opportunity.pipeline;
      
      setFormData({
        primaryContactName: contact?.displayName || contact?.firstName || '',
        primaryEmail: contact?.email || '',
        primaryPhone: contact?.phone || '',
        opportunityName: opportunity.title || '',
        pipelineId: String(currentPipelineId || ''),
        stageId: String(currentStageId || ''),
        status: opportunity.status || 'open',
        value: opportunity.value || 0,
        owner: '',
        followers: '',
        businessName: '',
        source: opportunity.source || '',
        tags: '',
      });
    }
  }, [opportunity]);

  const handleFieldChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleUpdate = () => {
    onUpdate({
      title: formData.opportunityName,
      stage: formData.stageId,
      status: formData.status as 'open' | 'won' | 'lost',
      value: formData.value,
      source: formData.source,
    });
  };

  if (!opportunity) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">
                Edit "{opportunity.title}"
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Add and edit opportunity details, tasks, notes and appointments.
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex h-[calc(90vh-180px)]">
          {/* Left Sidebar - Tabs */}
          <div className="w-56 border-r bg-muted/30 p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                  activeTab === tab.id
                    ? "bg-primary/10 text-primary border-l-2 border-l-primary font-medium"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {tab.label}
              </button>
            ))}
            
            <div className="mt-auto pt-4 border-t mt-4">
              <button className="flex items-center gap-2 text-sm text-primary px-3 py-2">
                <Settings className="h-4 w-4" />
                Add/Manage Fields
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'details' && (
              <div className="space-y-6">
                {/* Contact Details */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      Contact details
                      <span className="text-muted-foreground">👤</span>
                    </h3>
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="hideEmpty" 
                        checked={hideEmptyFields}
                        onCheckedChange={(checked) => setHideEmptyFields(!!checked)}
                      />
                      <Label htmlFor="hideEmpty" className="text-sm">Hide Empty Fields</Label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">
                        Primary Contact Name <span className="text-red-500">*</span>
                      </Label>
                      <Select 
                        value={formData.primaryContactName}
                        onValueChange={(v) => handleFieldChange('primaryContactName', v)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select contact" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={formData.primaryContactName || 'contact'}>
                            {formData.primaryContactName || 'Select contact'}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm">Primary Email</Label>
                      <Input 
                        placeholder="Enter Email" 
                        value={formData.primaryEmail}
                        onChange={(e) => handleFieldChange('primaryEmail', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Primary Phone</Label>
                      <Input 
                        placeholder="Phone" 
                        value={formData.primaryPhone}
                        onChange={(e) => handleFieldChange('primaryPhone', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Additional Contacts (Max: 10)</Label>
                      <Select>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Add additional contacts" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Add additional contacts</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Opportunity Details */}
                <div>
                  <h3 className="font-semibold mb-4">Opportunity Details</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm">
                        Opportunity Name <span className="text-red-500">*</span>
                      </Label>
                      <Input 
                        value={formData.opportunityName}
                        onChange={(e) => handleFieldChange('opportunityName', e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm">Pipeline</Label>
                        <Select 
                          value={formData.pipelineId}
                          onValueChange={(v) => handleFieldChange('pipelineId', v)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select pipeline" />
                          </SelectTrigger>
                          <SelectContent>
                            {pipelines.map((p) => (
                              <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm">Stage</Label>
                        <Select 
                          value={formData.stageId}
                          onValueChange={(v) => handleFieldChange('stageId', v)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select stage" />
                          </SelectTrigger>
                          <SelectContent>
                            {stages.map((s) => (
                              <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm">Status</Label>
                        <Select 
                          value={formData.status}
                          onValueChange={(v) => handleFieldChange('status', v)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="won">Won</SelectItem>
                            <SelectItem value="lost">Lost</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm">Opportunity Value</Label>
                        <div className="relative mt-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <Input 
                            type="number"
                            value={formData.value}
                            onChange={(e) => handleFieldChange('value', parseFloat(e.target.value) || 0)}
                            className="pl-7"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm">Owner</Label>
                        <Select>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Unassigned" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm">Followers</Label>
                        <Select>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Add Followers" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Add Followers</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm">Business Name</Label>
                        <Input 
                          placeholder="Enter Business Name"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Opportunity Source</Label>
                        <Input 
                          placeholder="Enter Source"
                          value={formData.source}
                          onChange={(e) => handleFieldChange('source', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm">Tags</Label>
                      <Select>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Add tags" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Add tags</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'servicetitan' && (
              <div className="text-center text-muted-foreground py-12">
                ServiceTitan opportunity fields will appear here
              </div>
            )}

            {activeTab === 'appointment' && (
              <div className="text-center text-muted-foreground py-12">
                Book or update appointments here
              </div>
            )}

            {activeTab === 'tasks' && (
              <div className="text-center text-muted-foreground py-12">
                Tasks associated with this opportunity
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="text-center text-muted-foreground py-12">
                Notes for this opportunity
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="text-center text-muted-foreground py-12">
                Payment information
              </div>
            )}

            {activeTab === 'objects' && (
              <div className="text-center text-muted-foreground py-12">
                Associated objects
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex items-center justify-between bg-muted/30">
          <div className="text-xs text-muted-foreground">
            <p>Created By: <span className="text-primary">Opportunities Details</span></p>
            <p>Created on: {opportunity.createdAt ? new Date(opportunity.createdAt).toLocaleString() : 'Unknown'}</p>
            <p>Audit Logs: <span className="text-primary cursor-pointer">{opportunity.id.slice(0, 20)}...</span></p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="destructive" size="icon" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleUpdate}>Update</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
