'use client';

import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { X, Save, Trash2, Copy } from 'lucide-react';

interface Material {
  id: string;
  stId: string;
  code: string;
  name: string;
  displayName: string;
  description: string;
  cost: number;
  price: number;
  memberPrice: number;
  active: boolean;
  taxable: boolean;
  defaultImageUrl: string | null;
  primaryVendor: {
    vendorName?: string;
    vendorId?: number;
    cost?: number;
    vendorPart?: string;
  } | null;
  otherVendors: Array<{
    vendorName?: string;
    vendorId?: number;
    cost?: number;
  }>;
}

interface MaterialEditorProps {
  material: Material | null;
  onClose: () => void;
  onSave: () => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function MaterialEditor({ material, onClose, onSave }: MaterialEditorProps) {
  const queryClient = useQueryClient();

  const form = useForm({
    defaultValues: {
      code: material?.code || '',
      name: material?.name || '',
      displayName: material?.displayName || '',
      description: material?.description || '',
      cost: material?.cost || 0,
      price: material?.price || 0,
      memberPrice: material?.memberPrice || 0,
      active: material?.active ?? true,
      taxable: material?.taxable ?? true,
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = material?.id 
        ? `/api/pricebook/materials/${material.id}` 
        : '/api/pricebook/materials';
      
      const res = await fetch(url, {
        method: material?.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricebook-materials'] });
      onSave();
    },
  });

  const cost = form.watch('cost');
  const price = form.watch('price');
  const margin = price > 0 ? ((price - cost) / price * 100).toFixed(1) : '0';

  return (
    <div className="h-full flex flex-col bg-card">
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h2 className="font-semibold">
            {material ? 'Edit Material' : 'New Material'}
          </h2>
          {material && (
            <p className="text-sm text-muted-foreground">{material.code}</p>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {material?.defaultImageUrl && (
            <div className="flex justify-center">
              <img 
                src={material.defaultImageUrl} 
                alt={material.name}
                className="w-32 h-32 rounded-lg object-cover border"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>SKU / Code</Label>
            <Input {...form.register('code')} placeholder="MAT-001" />
          </div>

          <div className="space-y-2">
            <Label>Material Name</Label>
            <Input {...form.register('name')} placeholder="Material name" />
          </div>

          <div className="space-y-2">
            <Label>Display Name</Label>
            <Input {...form.register('displayName')} placeholder="Display name for customers" />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea 
              {...form.register('description')} 
              placeholder="Detailed description..."
              rows={3}
            />
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold mb-4">Pricing</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cost</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input 
                    type="number"
                    step="0.01"
                    {...form.register('cost', { valueAsNumber: true })}
                    className="pl-7"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input 
                    type="number"
                    step="0.01"
                    {...form.register('price', { valueAsNumber: true })}
                    className="pl-7"
                  />
                </div>
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Member Price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input 
                    type="number"
                    step="0.01"
                    {...form.register('memberPrice', { valueAsNumber: true })}
                    className="pl-7"
                  />
                </div>
              </div>
            </div>

            <Card className="mt-4 bg-muted/50">
              <CardContent className="p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Cost</p>
                    <p className="text-lg font-semibold">{formatCurrency(cost || 0)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Price</p>
                    <p className="text-lg font-semibold text-green-600">{formatCurrency(price || 0)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Margin</p>
                    <p className="text-lg font-semibold">{margin}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {material?.primaryVendor && (
            <div>
              <h3 className="font-semibold mb-4">Vendors</h3>
              <div className="space-y-3">
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <Badge variant="default" className="mb-1">Primary</Badge>
                      <p className="font-medium">{material.primaryVendor.vendorName}</p>
                      {material.primaryVendor.vendorPart && (
                        <p className="text-sm text-muted-foreground">
                          Part #: {material.primaryVendor.vendorPart}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(material.primaryVendor.cost || 0)}</p>
                    </div>
                  </div>
                </div>

                {material.otherVendors?.map((vendor, idx) => (
                  <div key={idx} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{vendor.vendorName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-muted-foreground">{formatCurrency(vendor.cost || 0)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          <div>
            <h3 className="font-semibold mb-4">Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Active</Label>
                  <p className="text-sm text-muted-foreground">Material is available for use</p>
                </div>
                <Switch 
                  checked={form.watch('active')}
                  onCheckedChange={(v) => form.setValue('active', v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Taxable</Label>
                  <p className="text-sm text-muted-foreground">Apply tax to this material</p>
                </div>
                <Switch 
                  checked={form.watch('taxable')}
                  onCheckedChange={(v) => form.setValue('taxable', v)}
                />
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>

      <div className="p-4 border-t flex items-center justify-between">
        <div className="flex items-center gap-2">
          {material && (
            <>
              <Button variant="outline" size="sm">
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </Button>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={form.handleSubmit((data) => saveMutation.mutate(data))}
            disabled={saveMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? 'Saving...' : 'Save Material'}
          </Button>
        </div>
      </div>
    </div>
  );
}
