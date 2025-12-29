'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  X,
  Trash2,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Vendor {
  id: string;
  stId?: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  active: boolean;
  isFavorite?: boolean;
  isReplenishmentVendor?: boolean;
  acceptPOCustomerNotes?: boolean;
  contactFirstName?: string;
  contactLastName?: string;
  contactPhone?: string;
  contactEmail?: string;
  faxNumber?: string;
  notes?: string;
  defaultDeliveryMethod?: string;
  vendorPaymentTerms?: string;
  defaultTaxRate?: number;
  emailRecipients?: EmailRecipient[];
}

interface EmailRecipient {
  name: string;
  email: string;
}

interface VendorDetailPanelProps {
  vendorId: string;
  isEditing: boolean;
  onEdit: () => void;
  onClose: () => void;
  onSave: () => void;
}

const deliveryMethods = [
  'Email XLS',
  'Email PDF',
  'Email PDF Recap',
  'Email XLS and PDF',
  'Mail or Sent',
  'Maximum Delivery',
];

export function VendorDetailPanel({ 
  vendorId, 
  isEditing, 
  onEdit, 
  onClose,
  onSave,
}: VendorDetailPanelProps) {
  const queryClient = useQueryClient();
  const [selectedDeliveryMethod, setSelectedDeliveryMethod] = useState('Email PDF');

  const { data: vendor, isLoading } = useQuery({
    queryKey: ['vendor', vendorId],
    queryFn: () => fetchVendor(vendorId),
    enabled: !!vendorId,
  });

  const form = useForm<Vendor>({
    defaultValues: vendor || {},
  });

  useEffect(() => {
    if (vendor) {
      form.reset(vendor);
      setSelectedDeliveryMethod(vendor.defaultDeliveryMethod || 'Email PDF');
    }
  }, [vendor, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Vendor>) => {
      const res = await fetch(`/api/purchasing/vendors/${vendorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', vendorId] });
      onSave();
    },
  });

  const handleSave = () => {
    const data = form.getValues();
    data.defaultDeliveryMethod = selectedDeliveryMethod;
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Loading vendor details...
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Vendor not found
      </div>
    );
  }

  // View Mode
  if (!isEditing) {
    return (
      <div className="h-full overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{vendor.name} Vendor profile</h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
            <Button variant="outline" size="sm" onClick={onEdit}>Edit</Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Vendor Details Section */}
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Vendor Details</h3>
              <Button variant="link" size="sm" className="text-blue-600" onClick={onEdit}>
                Edit
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Vendor Name</span>
                <p className="font-medium">{vendor.name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Assign as Default Vendor for</span>
                <p className="font-medium">—</p>
              </div>
              <div>
                <span className="text-muted-foreground">Replenishment Vendor</span>
                <p className="font-medium">{vendor.isReplenishmentVendor ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Accept PO Customer Notes</span>
                <p className="font-medium">{vendor.acceptPOCustomerNotes ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </div>

          {/* Address Section */}
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold mb-4">Address</h3>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div className="col-span-2">
                <span className="text-muted-foreground">Street</span>
                <p className="font-medium">{vendor.address || '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Suite</span>
                <p className="font-medium">{vendor.address2 || '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">City</span>
                <p className="font-medium">{vendor.city || '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">State</span>
                <p className="font-medium">{vendor.state || '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Zip Code</span>
                <p className="font-medium">{vendor.zip || '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Country</span>
                <p className="font-medium">{vendor.country || 'USA'}</p>
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold mb-4">Contact</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">First Name</span>
                <p className="font-medium">{vendor.contactFirstName || '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Last Name</span>
                <p className="font-medium">{vendor.contactLastName || '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Phone Number</span>
                <p className="font-medium">{vendor.contactPhone || '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Email</span>
                <p className="font-medium">{vendor.contactEmail || '—'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Fax Number</span>
                <p className="font-medium">{vendor.faxNumber || '—'}</p>
              </div>
            </div>
            {vendor.notes && (
              <div className="mt-4">
                <span className="text-muted-foreground text-sm">Notes</span>
                <p className="text-sm">{vendor.notes}</p>
              </div>
            )}
          </div>

          {/* Purchase Order Details Section */}
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold mb-4">Purchase Order Details</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Default Delivery Method</span>
                <p className="font-medium">{vendor.defaultDeliveryMethod || 'Email PDF'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Default Tax Rate</span>
                <p className="font-medium">{vendor.defaultTaxRate || 0}%</p>
              </div>
              <div>
                <span className="text-muted-foreground">Vendor Payment Terms</span>
                <p className="font-medium">{vendor.vendorPaymentTerms || 'NET30'}</p>
              </div>
            </div>
          </div>

          {/* Email Recipients Section */}
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold mb-4">Email Recipients</h3>
            {vendor.emailRecipients && vendor.emailRecipients.length > 0 ? (
              <div className="space-y-2">
                {vendor.emailRecipients.map((recipient, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{recipient.name}</span>
                    <span className="text-muted-foreground">{recipient.email}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No email recipients configured</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Edit Mode
  return (
    <div className="h-full overflow-auto">
      {/* Header */}
      <div className="sticky top-0 bg-background border-b p-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h2 className="text-lg font-semibold">Edit Vendor: {vendor.name}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onSave()}>Cancel</Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Vendor Details Section */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Vendor Details</h3>
            <div className="flex items-center gap-2">
              <Switch 
                checked={form.watch('active')} 
                onCheckedChange={(v) => form.setValue('active', v)}
              />
              <span className="text-sm">Active</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Vendor Name *</Label>
              <Input {...form.register('name')} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Assign as Default Vendor for</Label>
              <Input placeholder="Search & select a material" className="mt-1" />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox 
                checked={form.watch('isReplenishmentVendor')}
                onCheckedChange={(v) => form.setValue('isReplenishmentVendor', !!v)}
              />
              <Label className="text-sm">Replenishment Vendor</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox 
                checked={form.watch('acceptPOCustomerNotes')}
                onCheckedChange={(v) => form.setValue('acceptPOCustomerNotes', !!v)}
              />
              <Label className="text-sm">Accept PO Customer Notes</Label>
            </div>
          </div>

          {/* Contact Information */}
          <div className="mt-6">
            <h4 className="font-medium mb-3">Contact Information</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">First Name</Label>
                <Input {...form.register('contactFirstName')} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Last Name</Label>
                <Input {...form.register('contactLastName')} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Fax</Label>
                <Input {...form.register('faxNumber')} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Phone</Label>
                <Input {...form.register('contactPhone')} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Ext#</Label>
                <Input className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Type</Label>
                <Input className="mt-1" placeholder="Select type" />
              </div>
              <div className="col-span-3">
                <Label className="text-xs text-muted-foreground">Notes</Label>
                <Textarea {...form.register('notes')} className="mt-1" rows={2} />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="mt-6">
            <h4 className="font-medium mb-3">Address *</h4>
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">Street</Label>
                <Input {...form.register('address')} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Suite</Label>
                <Input {...form.register('address2')} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">City *</Label>
                <Input {...form.register('city')} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">State *</Label>
                <Input {...form.register('state')} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Zip *</Label>
                <Input {...form.register('zip')} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Country *</Label>
                <Input {...form.register('country')} className="mt-1" defaultValue="USA" />
              </div>
            </div>
          </div>
        </div>

        {/* Purchase Order Details Section */}
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-semibold mb-4">Purchase Order Details</h3>
          
          <div className="grid grid-cols-2 gap-6">
            {/* Default Delivery Method */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Default Delivery Method</Label>
              <div className="space-y-2">
                {deliveryMethods.map((method) => (
                  <label key={method} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="deliveryMethod"
                      checked={selectedDeliveryMethod === method}
                      onChange={() => setSelectedDeliveryMethod(method)}
                      className="h-4 w-4 text-blue-600"
                    />
                    <span className="text-sm">{method}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Electronic delivery submits POs directly to your supplier's ERP system and is only available with integrated vendors.{' '}
                <a href="#" className="text-blue-600 underline">Explore supply chain integrations</a>
              </p>
            </div>

            {/* Costing */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Costing</Label>
              <Input placeholder="Select a costing type to override with this vendor" />
            </div>
          </div>

          {/* Vendor Payment Terms */}
          <div className="mt-6">
            <Label className="text-xs text-muted-foreground mb-2 block">Vendor Payment Terms</Label>
            <select 
              {...form.register('vendorPaymentTerms')}
              className="w-full h-9 border rounded px-3 text-sm bg-background"
            >
              <option value="NET10">NET10</option>
              <option value="NET15">NET15</option>
              <option value="NET30">NET30</option>
              <option value="NET45">NET45</option>
              <option value="NET60">NET60</option>
              <option value="COD">COD</option>
            </select>
          </div>

          {/* Default Tax Rates */}
          <div className="mt-6">
            <h4 className="font-medium mb-3">Default Tax Rates</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Default Tax Rate</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input 
                    type="number"
                    {...form.register('defaultTaxRate', { valueAsNumber: true })}
                    className="w-20"
                  />
                  <span className="text-sm">%</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Add tax rates for specific business units. Any POs, receipts, or returns associated with a PO linked vendor will use the corresponding tax rate, overriding the default.
            </p>
            
            {/* Tax Rate Table */}
            <div className="mt-4 border rounded">
              <div className="grid grid-cols-3 gap-4 p-2 bg-muted/30 text-xs font-medium text-muted-foreground">
                <div>Tax Rate</div>
                <div>Business Unit</div>
                <div></div>
              </div>
              <div className="p-2">
                <Button variant="ghost" size="sm" className="text-blue-600">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Tax Rate
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Email Recipients Section */}
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-semibold mb-4">Email Recipients</h3>
          <div className="border rounded">
            <div className="grid grid-cols-2 gap-4 p-2 bg-muted/30 text-xs font-medium text-muted-foreground">
              <div>Name</div>
              <div>Email Address</div>
            </div>
            {vendor.emailRecipients?.map((recipient, idx) => (
              <div key={idx} className="grid grid-cols-2 gap-4 p-2 border-t items-center">
                <div className="flex items-center gap-2">
                  {idx === 0 && <Badge variant="secondary" className="text-xs">Main Recipient</Badge>}
                  <span className="text-sm">{recipient.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">{recipient.email}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
            <div className="p-2 border-t">
              <Button variant="ghost" size="sm" className="text-blue-600">
                <Plus className="h-4 w-4 mr-1" />
                Add Recipient
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

async function fetchVendor(id: string): Promise<Vendor | null> {
  try {
    const res = await fetch(`/api/purchasing/vendors/${id}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
