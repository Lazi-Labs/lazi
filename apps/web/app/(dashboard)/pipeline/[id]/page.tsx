'use client';

import { useParams, useRouter } from 'next/navigation';
import { useOpportunity } from '@/hooks/use-opportunities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  User, 
  Building, 
  Phone, 
  Mail,
  MapPin,
  Clock,
  Edit,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';

export default function OpportunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const { data: opportunity, isLoading, error } = useOpportunity(id);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error || !opportunity) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">
              {error ? 'Error loading opportunity' : 'Opportunity not found'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Pipeline
          </Button>
          <h1 className="text-2xl font-bold">{opportunity.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="destructive" size="sm">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center gap-4">
        {opportunity.pipeline_name && (
          <Badge variant="outline">{opportunity.pipeline_name}</Badge>
        )}
        {opportunity.stage_name && (
          <Badge 
            style={{ backgroundColor: opportunity.stage_color || '#6b7280', color: 'white' }}
          >
            {opportunity.stage_name}
          </Badge>
        )}
        <Badge variant={opportunity.status === 'Won' ? 'default' : opportunity.status === 'Lost' ? 'destructive' : 'secondary'}>
          {opportunity.status || 'Open'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Opportunity Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Opportunity Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Value</p>
                <p className="font-semibold text-lg">
                  ${(opportunity.value || 0).toLocaleString()}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Expected Close Date</p>
                <p className="font-medium">
                  {opportunity.expected_close_date 
                    ? format(new Date(opportunity.expected_close_date), 'MMM d, yyyy')
                    : 'Not set'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">
                  {opportunity.created_at 
                    ? format(new Date(opportunity.created_at), 'MMM d, yyyy h:mm a')
                    : 'Unknown'}
                </p>
              </div>
            </div>

                      </CardContent>
        </Card>

        {/* Contact Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {opportunity.contact_name ? (
              <>
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-semibold">
                      {opportunity.contact_name}
                    </p>
                  </div>
                </div>

                {opportunity.contact_email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <a href={`mailto:${opportunity.contact_email}`} className="font-medium text-primary hover:underline">
                        {opportunity.contact_email}
                      </a>
                    </div>
                  </div>
                )}

                {opportunity.contact_phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <a href={`tel:${opportunity.contact_phone}`} className="font-medium text-primary hover:underline">
                        {opportunity.contact_phone}
                      </a>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">No contact information available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notes/Description */}
      {opportunity.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{opportunity.description}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
