'use client';

import { ContactTable } from '@/components/contacts';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { BuilderSection } from '@/components/builder';
import { PageHeader } from '@/components/shared';

export default function ContactsPage() {
  return (
    <div className="space-y-6">
      <BuilderSection>
        <PageHeader 
          title="Contacts" 
          description="Manage your leads, prospects, and customers"
        >
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Contact
          </Button>
        </PageHeader>
      </BuilderSection>

      <BuilderSection>
        <ContactTable />
      </BuilderSection>
    </div>
  );
}
