export interface Contact {
  id: number;
  st_id: number | null;
  customer_id: number | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  phone_type: string | null;
  mobile_phone: string | null;
  contact_type: string | null;
  is_primary: boolean;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  email_opt_in: boolean;
  sms_opt_in: boolean;
  do_not_contact: boolean;
  lead_source: string | null;
  lead_status: LeadStatus | null;
  assigned_to: number | null;
  tags: string[] | null;
  notes: string | null;
  custom_fields: Record<string, any>;
  st_created_on: string | null;
  st_modified_on: string | null;
  synced_at: string;
  updated_at: string;
  has_overrides: boolean;
}

export type LeadStatus = 
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'proposal'
  | 'negotiation'
  | 'won'
  | 'lost';

export interface ContactsFilters {
  search?: string;
  customerId?: number;
  leadStatus?: LeadStatus;
  assignedTo?: number;
  tags?: string[];
}

export interface ContactsSort {
  field: 'full_name' | 'email' | 'updated_at' | 'lead_status';
  direction: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ContactUpdatePayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  mobile_phone?: string;
  lead_source?: string;
  lead_status?: LeadStatus;
  assigned_to?: number;
  tags?: string[];
  notes?: string;
  custom_fields?: Record<string, any>;
}
