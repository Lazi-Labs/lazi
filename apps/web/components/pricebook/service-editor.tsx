'use client';

import { useState } from 'react';
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
import { X, Save, Trash2, Copy } from 'lucide-react';

interface Service {
  id: string;
  stId: string;
  code: string;
  name: string;
  displayName: string;
  description: string;
  price: number;
  memberPrice: number;
  addOnPrice: number;
  durationHours: number;
  active: boolean;
  taxable: boolean;
  defaultImageUrl: string | null;
}

interface ServiceEditorProps {
  service: Service | null;
  onClose: () => void;
  onSave: () => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function ServiceEditor({ service, onClose, onSave }: ServiceEditorProps) {
  const queryClient = useQueryClient();

  const form = useForm({
    defaultValues: {
      code: service?.code || '',
      name: service?.name || '',
      displayName: service?.displayName || '',
      description: service?.description || '',
      price: service?.price || 0,
      memberPrice: service?.memberPrice || 0,
      addOnPrice: service?.addOnPrice || 0,
      durationHours: service?.durationHours || 0,
      active: service?.active ?? true,
      taxable: service?.taxable ?? true,
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = service?.id 
        ? `/api/pricebook/services/${service.id}` 
        : '/api/pricebook/services';
      
      const res = await fetch(url, {
        method: service?.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricebook-services'] });
      onSave();
    },
  });

  const price = form.watch('price');
  const memberPrice = form.watch('memberPrice');

  return (
    <div className="h-full flex flex-col bg-card">
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h2 className="font-semibold">
            {service ? 'Edit Service' : 'New Service'}
          </h2>
          {service && (
            <p className="text-sm text-muted-foreground">{service.code}</p>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {service?.defaultImageUrl && (
            <div className="flex justify-center">
              <img 
                src={service.defaultImageUrl} 
                alt={service.name}
                className="w-32 h-32 rounded-lg object-cover border"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>SKU / Code</Label>
              <Input {...form.register('code')} placeholder="SVC-001" />
            </div>
            <div className="space-y-2">
              <Label>Duration (Hours)</Label>
              <Input 
                type="number"
                step="0.25"
                {...form.register('durationHours', { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Service Name</Label>
            <Input {...form.register('name')} placeholder="Service name" />
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
              <div className="space-y-2">
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
              <div className="space-y-2 col-span-2">
                <Label>Add-On Price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input 
                    type="number"
                    step="0.01"
                    {...form.register('addOnPrice', { valueAsNumber: true })}
                    className="pl-7"
                  />
                </div>
              </div>
            </div>

            <Card className="mt-4 bg-muted/50">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Standard Price</p>
                    <p className="text-lg font-semibold text-green-600">{formatCurrency(price || 0)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Member Price</p>
                    <p className="text-lg font-semibold text-blue-600">{formatCurrency(memberPrice || 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold mb-4">Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Active</Label>
                  <p className="text-sm text-muted-foreground">Service is available for use</p>
                </div>
                <Switch 
                  checked={form.watch('active')}
                  onCheckedChange={(v) => form.setValue('active', v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Taxable</Label>
                  <p className="text-sm text-muted-foreground">Apply tax to this service</p>
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
          {service && (
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
            {saveMutation.isPending ? 'Saving...' : 'Save Service'}
          </Button>
        </div>
      </div>
    </div>
  );
}
