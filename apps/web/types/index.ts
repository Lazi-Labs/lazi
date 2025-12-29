// User types
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'admin' | 'manager' | 'sales_rep' | 'technician';
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

// Contact types
export interface Contact {
  id: string;
  firstName: string;
  lastName?: string;
  displayName: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  type: 'lead' | 'prospect' | 'customer' | 'past_customer';
  status: 'active' | 'inactive' | 'do_not_contact';
  source?: string;
  assignedTo?: User | string;
  tags?: string[];
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  communicationPreferences?: {
    smsOptIn?: boolean;
    emailOptIn?: boolean;
    preferredChannel?: 'sms' | 'email' | 'phone';
  };
  serviceTitanId?: string;
  createdAt: string;
  updatedAt: string;
}

// Pipeline types
export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  pipeline: Pipeline | string;
  order: number;
  color?: string;
  probability?: number;
  isWon?: boolean;
  isLost?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Opportunity types
export interface Opportunity {
  id: string;
  title: string;
  contact: Contact | string;
  pipeline: Pipeline | string;
  stage: PipelineStage | string;
  value?: number;
  probability?: number;
  expectedCloseDate?: string;
  status: 'open' | 'won' | 'lost' | 'on_hold';
  assignedTo?: User | string;
  source?: string;
  notes?: string;
  serviceTitanId?: string;
  createdAt: string;
  updatedAt: string;
}

// Conversation types
export interface Conversation {
  id: string;
  contact: Contact | string;
  channel: 'sms' | 'email' | 'phone' | 'chat';
  status: 'open' | 'closed' | 'archived';
  assignedTo?: User | string;
  subject?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
}

// Message types
export interface Message {
  id: string;
  conversation: Conversation | string;
  direction: 'inbound' | 'outbound';
  channel: 'sms' | 'email';
  from?: string;
  to?: string;
  subject?: string;
  body: string;
  bodyHtml?: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'received';
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  externalId?: string;
  createdAt: string;
  updatedAt: string;
}

// Task types
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  assignedTo?: User | string;
  relatedTo?: {
    relationTo: 'contacts' | 'opportunities';
    value: string;
  };
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Activity types
export interface Activity {
  id: string;
  type: 'note' | 'call' | 'email' | 'meeting' | 'task' | 'stage_change' | 'status_change';
  description: string;
  relatedTo?: {
    relationTo: 'contacts' | 'opportunities';
    value: string;
  };
  performedBy?: User | string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// Automation types
export interface Automation {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  trigger: {
    type: string;
    pipeline?: string;
    fromStage?: string;
    toStage?: string;
    messageChannel?: string;
    schedule?: string;
    webhookSecret?: string;
    filters?: Record<string, unknown>;
  };
  steps: AutomationStep[];
  flowData?: Record<string, unknown>;
  runCount?: number;
  successCount?: number;
  failureCount?: number;
  lastRunAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationStep {
  order: number;
  type: string;
  name?: string;
  to?: string;
  subject?: string;
  body?: string;
  templateName?: string;
  templateChannel?: 'sms' | 'email';
  fieldName?: string;
  fieldValue?: string;
  targetStage?: string;
  taskTitle?: string;
  taskDescription?: string;
  taskDueInHours?: number;
  delayMinutes?: number;
  delayUntilTime?: string;
  conditionField?: string;
  conditionOperator?: string;
  conditionValue?: string;
  onTrueGoToStep?: number;
  onFalseGoToStep?: number;
  webhookUrl?: string;
  webhookMethod?: string;
  continueOnError?: boolean;
  retryCount?: number;
}

// API Response types
export interface PaginatedResponse<T> {
  docs: T[];
  totalDocs: number;
  limit: number;
  totalPages: number;
  page: number;
  pagingCounter: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number | null;
  nextPage: number | null;
}

export interface ApiError {
  message: string;
  errors?: Array<{ message: string; field?: string }>;
}

// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  exp: number;
}
