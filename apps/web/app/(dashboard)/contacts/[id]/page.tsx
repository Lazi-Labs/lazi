'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Mail, Phone, MapPin, Building, Pencil, ArrowLeft, Plus, 
  MessageSquare, FileText, CreditCard, Calendar, CheckSquare, 
  FolderOpen, MapPinned, Briefcase, Clock, User, ChevronDown,
  Send, ExternalLink, Inbox, Search, Upload, Grid, List,
  Image, Video, File, FileSpreadsheet, FileType, MoreHorizontal,
  Filter, Download, Trash2
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';
import { useState } from 'react';
import { crmApi, type CRMContact } from '@/lib/api';

interface Activity {
  id: string;
  type: 'proposal_viewed' | 'email_sent' | 'call' | 'note' | 'document' | 'stage_change';
  title: string;
  description?: string;
  user?: string;
  timestamp: string;
  amount?: number;
}

interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  taxRate?: number;
  accountName?: string;
}

interface ContactPerson {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  isPrimary?: boolean;
}

interface Message {
  id: string;
  from: string;
  subject: string;
  preview: string;
  date: string;
  job?: string;
  changeOrder?: string;
  isRead: boolean;
}

interface Document {
  id: string;
  job: string;
  jobAddress: string;
  name: string;
  type: string;
  subject: string;
  status: 'PAID' | 'APPROVED' | 'PENDING' | 'DRAFT';
  statusDate: string;
  amount: number;
}

interface Payment {
  id: string;
  date: string;
  accountType: string;
  accountName: string;
  received: number;
  paidOut?: number;
  unappliedAmount?: number;
  method: string;
  referenceNumber?: string;
}

interface Todo {
  id: string;
  name: string;
  due?: string;
  type: string;
  assignees: string[];
  completed: boolean;
}

interface FileItem {
  id: string;
  name: string;
  location: string;
  job: string;
  relatedTo: string;
  tags?: string;
  type: 'Image' | 'PDF' | 'Video' | 'Excel' | 'Word' | 'Other';
  uploadedBy: string;
  uploadedAt: string;
}

interface Job {
  id: string;
  number: string;
  name: string;
  location: string;
  status: string;
  scheduledDate?: string;
  total?: number;
}

// ═══════════════════════════════════════════════════════════════
// MESSAGES TAB COMPONENT
// ═══════════════════════════════════════════════════════════════
function MessagesTab({ contactName }: { contactName: string }) {
  const [messageFilter, setMessageFilter] = useState<'inbox' | 'unread' | 'sent'>('inbox');
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);

  const messages: Message[] = [
    { id: '1', from: contactName, subject: 'Gate - Pool Remodel: Change Order 9-47', preview: 'still need drain cover. Thanks', date: 'Dec 6, 2024', job: 'Gate - Pool Remodel', changeOrder: 'Change Order 9-47', isRead: false },
    { id: '2', from: contactName, subject: 'Gate - Pool Remodel: Change Order 9-47', preview: 'still need drain cover on lanai', date: 'Dec 6, 2024', job: 'Gate - Pool Remodel', changeOrder: 'Change Order 9-47', isRead: true },
  ];

  const selected = messages.find(m => m.id === selectedMessage) || messages[0];

  return (
    <div className="flex h-[600px] border rounded-lg overflow-hidden">
      {/* Left sidebar - message list */}
      <div className="w-80 border-r flex flex-col">
        <div className="flex items-center gap-2 p-2 border-b">
          <Button variant={messageFilter === 'inbox' ? 'secondary' : 'ghost'} size="sm" onClick={() => setMessageFilter('inbox')}>
            <Inbox className="h-4 w-4 mr-1" />
            Inbox
          </Button>
          <Button variant={messageFilter === 'unread' ? 'secondary' : 'ghost'} size="sm" onClick={() => setMessageFilter('unread')}>
            <Mail className="h-4 w-4 mr-1" />
            Unread
          </Button>
          <Button variant={messageFilter === 'sent' ? 'secondary' : 'ghost'} size="sm" onClick={() => setMessageFilter('sent')}>
            <Send className="h-4 w-4 mr-1" />
            Sent
          </Button>
          <div className="flex-1" />
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search" className="pl-8 h-8 w-32" />
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-3 border-b cursor-pointer hover:bg-muted/50 ${selectedMessage === msg.id || (!selectedMessage && msg.id === messages[0].id) ? 'bg-purple-50 border-l-4 border-l-purple-500' : ''}`}
              onClick={() => setSelectedMessage(msg.id)}
            >
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8 bg-purple-500">
                  <AvatarFallback className="text-white text-xs">{msg.from.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${!msg.isRead ? 'font-semibold' : ''}`}>{msg.from}</span>
                    <span className="text-xs text-muted-foreground">{msg.date}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{msg.subject}</p>
                  <p className="text-xs text-muted-foreground truncate">{msg.preview}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right side - message detail */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">←</span>
            <span className="text-sm">🔧 {selected?.job}</span>
            <span className="text-sm">📋 {selected?.changeOrder}</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-muted-foreground">👁 All Document Viewers</span>
            <Avatar className="h-6 w-6 bg-purple-500">
              <AvatarFallback className="text-white text-xs">{selected?.from.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            <span className="text-sm">{selected?.from}</span>
            <Avatar className="h-6 w-6 bg-green-500">
              <AvatarFallback className="text-white text-xs">YR</AvatarFallback>
            </Avatar>
            <span className="text-sm">Yanni Ramos</span>
          </div>
        </div>
        <div className="flex-1 p-4 overflow-auto">
          {/* Message content area */}
        </div>
        <div className="p-4 border-t">
          <div className="flex items-center gap-2 mb-2">
            <Avatar className="h-8 w-8 bg-purple-500">
              <AvatarFallback className="text-white text-xs">{selected?.from.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{selected?.from}</p>
              <p className="text-xs text-muted-foreground">{selected?.preview}</p>
            </div>
            <span className="ml-auto text-xs text-muted-foreground">{selected?.date}, 8:34 AM</span>
          </div>
          <div className="flex items-center gap-2">
            <Input placeholder="Message" className="flex-1" />
            <Button variant="ghost" size="icon"><Upload className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon"><FolderOpen className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon"><FileText className="h-4 w-4" /></Button>
            <Button className="bg-cyan-500 hover:bg-cyan-600">Send</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DOCUMENTS TAB COMPONENT
// ═══════════════════════════════════════════════════════════════
function DocumentsTab() {
  const documents: Document[] = [
    { id: '1', job: 'Gate - Pool Remodel', jobAddress: '5927 Bayview Circle South', name: 'Invoice 9-55', type: 'CUSTOMER INVOICE', subject: 'Change Order Jets', status: 'PAID', statusDate: 'Sun, Jan 19', amount: 400.00 },
    { id: '2', job: 'Gate - Pool Remodel', jobAddress: '5927 Bayview Circle South', name: 'Invoice 9-52', type: 'CUSTOMER INVOICE', subject: 'Change Order', status: 'PAID', statusDate: 'Dec 29, 2024', amount: 1575.00 },
    { id: '3', job: 'Gate - Pool Remodel', jobAddress: '5927 Bayview Circle South', name: 'Change Order 9-47', type: 'CUSTOMER ORDER', subject: 'Change Order', status: 'APPROVED', statusDate: 'Dec 6, 2024', amount: 1575.00 },
    { id: '4', job: 'Gate - Pool Remodel', jobAddress: '5927 Bayview Circle South', name: 'Progress Invoice 9-34', type: 'CUSTOMER INVOICE', subject: 'Spa Interior Change Order', status: 'PAID', statusDate: 'Nov 29, 2024', amount: 300.00 },
    { id: '5', job: 'Gate - Pool Remodel', jobAddress: '5927 Bayview Circle South', name: 'Invoice 9-33', type: 'CUSTOMER INVOICE', subject: 'Pool Interior Change Order', status: 'PAID', statusDate: 'Nov 29, 2024', amount: 1395.00 },
    { id: '6', job: 'Gate - Pool Remodel', jobAddress: '5927 Bayview Circle South', name: 'Selections 9-30', type: 'CUSTOMER ORDER', subject: 'Spa Interior', status: 'APPROVED', statusDate: 'Nov 22, 2024', amount: 300.00 },
    { id: '7', job: 'Gate - Pool Remodel', jobAddress: '5927 Bayview Circle South', name: 'Selections 9-29', type: 'CUSTOMER ORDER', subject: 'Pool Interior', status: 'APPROVED', statusDate: 'Nov 22, 2024', amount: 1395.00 },
    { id: '8', job: 'Gate - Pool Remodel', jobAddress: '5927 Bayview Circle South', name: 'Proposal 9-1', type: 'CUSTOMER ORDER', subject: '', status: 'APPROVED', statusDate: 'Nov 11, 2024', amount: 52728.10 },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search" className="pl-9" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full">
          <thead className="bg-slate-800 text-white">
            <tr>
              <th className="text-left p-3 font-medium text-sm">JOB</th>
              <th className="text-left p-3 font-medium text-sm">NAME</th>
              <th className="text-left p-3 font-medium text-sm">SUBJECT</th>
              <th className="text-left p-3 font-medium text-sm">STATUS</th>
              <th className="text-right p-3 font-medium text-sm">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc, i) => (
              <tr key={doc.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="p-3">
                  <div>
                    <p className="text-sm font-medium text-cyan-600">{doc.job}</p>
                    <p className="text-xs text-muted-foreground">{doc.jobAddress}</p>
                  </div>
                </td>
                <td className="p-3">
                  <div>
                    <p className="text-sm font-medium text-cyan-600">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">{doc.type}</p>
                  </div>
                </td>
                <td className="p-3 text-sm">{doc.subject}</td>
                <td className="p-3">
                  <div>
                    <Badge variant="outline" className={doc.status === 'PAID' ? 'text-green-600 border-green-600' : 'text-green-600 border-green-600'}>
                      {doc.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">{doc.statusDate}</p>
                  </div>
                </td>
                <td className="p-3 text-right text-sm font-medium">${doc.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// PAYMENTS TAB COMPONENT
// ═══════════════════════════════════════════════════════════════
function PaymentsTab({ contactName }: { contactName: string }) {
  const payments: Payment[] = [
    { id: '1', date: 'Wed, Jan 15, 12 AM', accountType: 'Customer', accountName: contactName, received: 400.00, method: 'qbo' },
    { id: '2', date: 'Dec 17, 2024, 12 AM', accountType: 'Customer', accountName: contactName, received: 1574.00, method: 'qbo' },
    { id: '3', date: 'Nov 27, 2024, 12 AM', accountType: 'Customer', accountName: contactName, received: 14220.62, method: 'qbo' },
    { id: '4', date: 'Nov 18, 2024, 12 AM', accountType: 'Customer', accountName: contactName, received: 26364.05, method: 'qbo' },
    { id: '5', date: 'Nov 18, 2024, 12 AM', accountType: 'Customer', accountName: contactName, received: 1.00, method: '' },
    { id: '6', date: 'Oct 29, 2024, 12 AM', accountType: 'Customer', accountName: contactName, received: 15818.43, method: '', referenceNumber: '1068' },
  ];

  const totalReceived = payments.reduce((sum, p) => sum + p.received, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Select defaultValue="all">
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Payments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="paid">Paid Out</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search Payments" className="pl-9 w-64" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />
              Import
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Payment
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full">
          <thead className="border-b">
            <tr className="text-left text-sm text-muted-foreground">
              <th className="p-3 font-medium">Payment Date</th>
              <th className="p-3 font-medium">Account: Type</th>
              <th className="p-3 font-medium">Account: Name</th>
              <th className="p-3 font-medium text-right">Received</th>
              <th className="p-3 font-medium text-right">Paid Out</th>
              <th className="p-3 font-medium text-right">Unapplied Amount</th>
              <th className="p-3 font-medium">Method</th>
              <th className="p-3 font-medium">Reference Number</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="border-b hover:bg-muted/50">
                <td className="p-3 text-sm">{payment.date}</td>
                <td className="p-3 text-sm">{payment.accountType}</td>
                <td className="p-3 text-sm">{payment.accountName}</td>
                <td className="p-3 text-sm text-right text-green-600">${payment.received.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className="p-3 text-sm text-right">{payment.paidOut ? `$${payment.paidOut.toFixed(2)}` : ''}</td>
                <td className="p-3 text-sm text-right">{payment.unappliedAmount ? `$${payment.unappliedAmount.toFixed(2)}` : ''}</td>
                <td className="p-3 text-sm">{payment.method}</td>
                <td className="p-3 text-sm">{payment.referenceNumber || ''}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-muted/30">
            <tr>
              <td className="p-3 text-sm font-medium">COUNT</td>
              <td className="p-3 text-sm font-medium">{payments.length}</td>
              <td className="p-3"></td>
              <td className="p-3 text-sm font-medium text-right">SUM</td>
              <td className="p-3 text-sm font-medium text-right text-green-600">${totalReceived.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td className="p-3 text-sm font-medium text-right">SUM</td>
              <td className="p-3 text-sm font-medium">$0.00</td>
              <td className="p-3 text-sm font-medium">SUM</td>
            </tr>
          </tfoot>
        </table>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// TO-DOS TAB COMPONENT
// ═══════════════════════════════════════════════════════════════
function TodosTab() {
  const todos: Todo[] = [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Select defaultValue="incomplete">
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Incomplete" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="incomplete">All Incomplete</SelectItem>
                <SelectItem value="complete">Completed</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <List className="h-4 w-4 mr-1" />
              List
            </Button>
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search" className="pl-9" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon"><Filter className="h-4 w-4" /></Button>
            <span className="text-sm text-muted-foreground">Save</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full">
          <thead className="border-b">
            <tr className="text-left text-sm text-muted-foreground">
              <th className="p-3 w-8"><Checkbox /></th>
              <th className="p-3 w-8">✓</th>
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Due</th>
              <th className="p-3 font-medium">Type</th>
              <th className="p-3 font-medium">Assignees</th>
            </tr>
          </thead>
          <tbody>
            {todos.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  There are no to-dos that match the filters above.
                </td>
              </tr>
            ) : (
              todos.map((todo) => (
                <tr key={todo.id} className="border-b hover:bg-muted/50">
                  <td className="p-3"><Checkbox /></td>
                  <td className="p-3"><Checkbox checked={todo.completed} /></td>
                  <td className="p-3 text-sm">{todo.name}</td>
                  <td className="p-3 text-sm">{todo.due || '-'}</td>
                  <td className="p-3 text-sm">{todo.type}</td>
                  <td className="p-3 text-sm">{todo.assignees.join(', ')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="p-4 flex items-center gap-2">
          <Button className="bg-cyan-600 hover:bg-cyan-700">
            <Plus className="h-4 w-4 mr-1" />
            To-Do
          </Button>
          <Button variant="outline">
            <Plus className="h-4 w-4 mr-1" />
            Group
          </Button>
          <Button variant="ghost" size="icon">
            <Calendar className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// FILES TAB COMPONENT
// ═══════════════════════════════════════════════════════════════
function FilesTab() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const files: FileItem[] = [
    { id: '1', name: 'invoice-55933878...', location: '5927 Bayview Circle S...', job: 'Gate - Pool R...', relatedTo: 'Bill 9-59', type: 'PDF', uploadedBy: 'Corey Braaten', uploadedAt: 'Fri, Apr 18, 2:41 PM' },
    { id: '2', name: 'invoice-KE222005...', location: '5927 Bayview Circle S...', job: 'Gate - Pool R...', relatedTo: 'Bill 9-54', type: 'PDF', uploadedBy: 'Yanni Ramos', uploadedAt: 'Thu, Jan 2, 3:37 PM' },
    { id: '3', name: 'invoice-55915505...', location: '5927 Bayview Circle S...', job: 'Gate - Pool R...', relatedTo: 'Bill 9-51', type: 'PDF', uploadedBy: 'Yanni Ramos', uploadedAt: 'Dec 17, 2024, 4:10 PM' },
    { id: '4', name: 'Photo 4', location: '5927 Bayview Circle S...', job: 'Gate - Pool R...', relatedTo: 'Daily Log for Tue, Dec 17, 2024', type: 'Image', uploadedBy: 'Kevin Grady', uploadedAt: 'Dec 17, 2024, 10:50 AM' },
    { id: '5', name: 'Photo 3', location: '5927 Bayview Circle S...', job: 'Gate - Pool R...', relatedTo: 'Daily Log for Tue, Dec 17, 2024', type: 'Image', uploadedBy: 'Kevin Grady', uploadedAt: 'Dec 17, 2024, 10:50 AM' },
    { id: '6', name: 'Photo 2', location: '5927 Bayview Circle S...', job: 'Gate - Pool R...', relatedTo: 'Daily Log for Tue, Dec 17, 2024', type: 'Image', uploadedBy: 'Kevin Grady', uploadedAt: 'Dec 17, 2024, 10:50 AM' },
    { id: '7', name: 'Photo 1', location: '5927 Bayview Circle S...', job: 'Gate - Pool R...', relatedTo: 'Daily Log for Tue, Dec 17, 2024', type: 'Image', uploadedBy: 'Kevin Grady', uploadedAt: 'Dec 17, 2024, 10:50 AM' },
  ];

  const categories = [
    { id: 'locations', label: 'Locations', icon: MapPin },
    { id: 'jobs', label: 'Jobs', icon: Briefcase },
    { id: 'dailylogs', label: 'Daily Logs', icon: Calendar },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'contacts', label: 'Contacts', icon: User },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  ];

  const fileTypes = [
    { id: 'bills', label: 'Bills', icon: FileText },
  ];

  const typeFilters = [
    { id: 'image', label: 'Image', icon: Image },
    { id: 'video', label: 'Video', icon: Video },
    { id: 'pdf', label: 'PDF', icon: File },
    { id: 'excel', label: 'Excel', icon: FileSpreadsheet },
    { id: 'word', label: 'Word', icon: FileType },
    { id: 'other', label: 'Other', icon: File },
  ];

  return (
    <div className="flex h-[600px] border rounded-lg overflow-hidden">
      {/* Left sidebar */}
      <div className="w-48 border-r bg-muted/30 p-2">
        <div className="space-y-1">
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? 'secondary' : 'ghost'}
              className="w-full justify-start text-sm"
              onClick={() => setSelectedCategory(cat.id)}
            >
              <cat.icon className="h-4 w-4 mr-2" />
              {cat.label}
            </Button>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs font-medium text-cyan-600 mb-2">TAGS</p>
          {fileTypes.map((type) => (
            <Button
              key={type.id}
              variant="ghost"
              className="w-full justify-start text-sm"
            >
              <type.icon className="h-4 w-4 mr-2" />
              {type.label}
            </Button>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs font-medium text-cyan-600 mb-2">TYPE</p>
          {typeFilters.map((type) => (
            <Button
              key={type.id}
              variant="ghost"
              className="w-full justify-start text-sm"
            >
              <type.icon className="h-4 w-4 mr-2" />
              {type.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-2 p-2 border-b">
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-1" />
            Upload
          </Button>
          <Button variant="ghost" size="sm">
            <FolderOpen className="h-4 w-4 mr-1" />
          </Button>
          <Button variant="outline" size="sm">
            <List className="h-4 w-4 mr-1" />
            List
          </Button>
          <Button variant="ghost" size="sm">
            <Grid className="h-4 w-4" />
            Grid
          </Button>
          <div className="flex-1" />
          <Select defaultValue="all">
            <SelectTrigger className="w-24">
              <SelectValue placeholder="All Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search" className="pl-9 w-40" />
          </div>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Folder
          </Button>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="border-b sticky top-0 bg-white">
              <tr className="text-left text-sm text-muted-foreground">
                <th className="p-2 w-8"><Checkbox /></th>
                <th className="p-2 font-medium">📁 ALL FILES</th>
                <th className="p-2 font-medium">Name</th>
                <th className="p-2 font-medium">Location</th>
                <th className="p-2 font-medium">Job</th>
                <th className="p-2 font-medium">Related To</th>
                <th className="p-2 font-medium">Tags</th>
                <th className="p-2 font-medium">Type</th>
                <th className="p-2 font-medium">Uploaded By</th>
                <th className="p-2 font-medium">Uploaded At ↓</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file, i) => (
                <tr key={file.id} className={`border-b hover:bg-cyan-50 ${i === 3 ? 'bg-cyan-100' : ''}`}>
                  <td className="p-2"><Checkbox /></td>
                  <td className="p-2">
                    {file.type === 'Image' ? <Image className="h-4 w-4 text-muted-foreground" /> : <File className="h-4 w-4 text-muted-foreground" />}
                  </td>
                  <td className="p-2 text-sm text-cyan-600">{file.name}</td>
                  <td className="p-2 text-sm text-cyan-600">{file.location}</td>
                  <td className="p-2 text-sm text-cyan-600">{file.job}</td>
                  <td className="p-2 text-sm text-cyan-600">{file.relatedTo}</td>
                  <td className="p-2 text-sm">{file.tags || ''}</td>
                  <td className="p-2 text-sm">{file.type}</td>
                  <td className="p-2 text-sm">
                    <div className="flex items-center gap-1">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-xs">{file.uploadedBy.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      {file.uploadedBy}
                    </div>
                  </td>
                  <td className="p-2 text-sm">{file.uploadedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// JOBS TAB COMPONENT
// ═══════════════════════════════════════════════════════════════
function JobsTab() {
  const jobs: Job[] = [
    { id: '1', number: '9', name: 'Gate - Pool Remodel', location: '5927 Bayview Circle South', status: 'In Progress', total: 52728.10 },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search Jobs" className="pl-9" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full">
          <thead className="border-b">
            <tr className="text-left text-sm text-muted-foreground">
              <th className="p-3 font-medium">Job #</th>
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Location</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  No jobs yet
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr key={job.id} className="border-b hover:bg-muted/50">
                  <td className="p-3 text-sm text-cyan-600">{job.number}</td>
                  <td className="p-3 text-sm text-cyan-600">{job.name}</td>
                  <td className="p-3 text-sm">{job.location}</td>
                  <td className="p-3">
                    <Badge variant="outline">{job.status}</Badge>
                  </td>
                  <td className="p-3 text-sm text-right font-medium">
                    {job.total ? `$${job.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export default function ContactDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const contactId = params.id as string;
  const activeTab = searchParams.get('tab') || 'details';
  
  const [subject, setSubject] = useState('');
  const [noteValue, setNoteValue] = useState('');

  const { data: contact, isLoading } = useQuery({
    queryKey: ['contact', contactId],
    queryFn: async () => {
      const response = await crmApi.getContact(contactId);
      return response.contact;
    },
    enabled: !!contactId,
  });

  // Mock activities - in production, fetch from API
  const activities: Activity[] = [
    { id: '1', type: 'proposal_viewed', title: 'Proposal viewed by Andrea Ortego', description: 'At Cattle Baron Dr, Job 01 on Proposal 63-2', timestamp: '2025-04-03T10:15:00', user: 'Andrea Ortego' },
    { id: '2', type: 'proposal_viewed', title: 'Proposal viewed by Greg Ortego', description: 'At Cattle Baron Dr, Job 02 on Proposal 63-1', timestamp: '2025-04-02T11:07:00', user: 'Greg Ortego' },
    { id: '3', type: 'proposal_viewed', title: 'Proposal viewed by Andrea Ortego', description: 'At Cattle Baron Dr, Job 03 on Proposal 63-2', timestamp: '2025-04-02T10:45:00', user: 'Andrea Ortego' },
    { id: '4', type: 'document', title: '3 Documents uploaded to Proposal 63-2', description: 'Added by Yosel Ramos at Cattle Baron Dr, Job 02', timestamp: '2025-03-28T10:23:00', amount: 995062.29 },
    { id: '5', type: 'proposal_viewed', title: 'Andrea Ortego in Proposal 63-2', description: 'Viewed at 3:40 PM, Yosel Ramos at Cattle Baron Dr, Job 03', timestamp: '2025-03-28T09:40:00' },
  ];

  // Mock locations - in production, fetch from API
  const locations: Location[] = [
    { id: '1', name: 'Cattle Baron Dr', address: 'Cattle Baron Dr 1', city: 'Wila', state: 'FL', zip: '33647', taxRate: 0.075, accountName: contact?.name || '' },
  ];

  // Mock contacts - in production, fetch from API
  const contactPersons: ContactPerson[] = [
    { id: '1', name: 'Andrea Ortego', isPrimary: true, email: 'andrea@example.com', phone: '(555) 123-4567' },
    { id: '2', name: 'Greg Ortego', email: 'greg@example.com', phone: '(555) 234-5678' },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-64" />
            <Skeleton className="h-96" />
          </div>
          <Skeleton className="h-[600px]" />
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-muted-foreground">Contact not found</p>
        <Button asChild className="mt-4">
          <Link href="/contacts">Back to Contacts</Link>
        </Button>
      </div>
    );
  }

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const fullAddress = [contact.address_line1, contact.city, contact.state].filter(Boolean).join(', ');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/contacts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <p className="text-xs text-orange-500 font-medium uppercase tracking-wide">CUSTOMER</p>
            <h1 className="text-2xl font-semibold">{contact.name}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Message
          </Button>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            To-Do
          </Button>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Task
          </Button>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Location
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Job
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs defaultValue={activeTab} className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
          <TabsTrigger value="details" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
            Details
          </TabsTrigger>
          <TabsTrigger value="messages" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
            Messages
          </TabsTrigger>
          <TabsTrigger value="documents" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
            Documents
          </TabsTrigger>
          <TabsTrigger value="payments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
            Payments
          </TabsTrigger>
          <TabsTrigger value="schedule" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
            Schedule
          </TabsTrigger>
          <TabsTrigger value="todos" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
            To-Dos
          </TabsTrigger>
          <TabsTrigger value="files" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
            Files
          </TabsTrigger>
          <TabsTrigger value="locations" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
            Locations
          </TabsTrigger>
          <TabsTrigger value="jobs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
            Jobs
          </TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column - Activity */}
            <div className="lg:col-span-2 space-y-4">
              {/* Quick Actions */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">TO</span>
                    <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      <Mail className="h-3 w-3" />
                      {contact.email || 'No email'}
                    </div>
                    <span className="text-muted-foreground">+</span>
                    <span className="text-sm text-muted-foreground">Add</span>
                  </div>
                  <div className="mt-3">
                    <Input 
                      placeholder="SUBJECT" 
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="border-0 border-b rounded-none px-0 focus-visible:ring-0"
                    />
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {contact.balance && parseFloat(contact.balance) > 0 ? (
                      <span className="text-red-500">Balance: ${parseFloat(contact.balance).toFixed(2)}</span>
                    ) : (
                      <span>No balance</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Calendar className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Activity Timeline */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-orange-500 text-sm font-medium">ACTIVITY</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {activities.map((activity, index) => {
                      const showDate = index === 0 || formatDate(activities[index - 1].timestamp) !== formatDate(activity.timestamp);
                      return (
                        <div key={activity.id}>
                          {showDate && (
                            <div className="text-right text-xs text-muted-foreground mb-2">
                              {formatDate(activity.timestamp)}
                            </div>
                          )}
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-1">
                              <div className={`w-2 h-2 rounded-full ${
                                activity.type === 'proposal_viewed' ? 'bg-blue-500' :
                                activity.type === 'document' ? 'bg-green-500' :
                                'bg-gray-400'
                              }`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium">{activity.title}</p>
                                <span className="text-xs text-muted-foreground">{formatTime(activity.timestamp)}</span>
                              </div>
                              {activity.description && (
                                <p className="text-xs text-muted-foreground mt-0.5">{activity.description}</p>
                              )}
                              {activity.amount && (
                                <p className="text-sm font-semibold text-green-600 mt-1">
                                  ${activity.amount.toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Info */}
            <div className="space-y-4">
              {/* Primary Location */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">PRIMARY LOCATION</CardTitle>
                    <Button variant="link" size="sm" className="text-orange-500 p-0 h-auto">
                      Send
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Map placeholder */}
                  <div className="h-32 bg-gray-100 rounded-lg flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-100 to-blue-100" />
                    <MapPin className="h-8 w-8 text-red-500 relative z-10" />
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    {fullAddress || 'No address'}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">⚡ Type</span>
                      <span className="ml-auto">Residential</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">📅 Appointment</span>
                      <span className="ml-auto text-orange-500">Appointment Set</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">📊 Status</span>
                      <span className="ml-auto">{contact.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">🏷️ Needs</span>
                      <span className="ml-auto">-</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">📍 Lead Source</span>
                      <span className="ml-auto">{contact.lead_source || '-'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Account Access */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-orange-500 text-sm font-medium">ACCOUNT ACCESS</CardTitle>
                    <Button variant="link" size="sm" className="text-orange-500 p-0 h-auto">
                      + Link
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm">
                    <span className="text-muted-foreground">INTERNAL</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs bg-green-500 text-white">YR</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">Yosel Ramos</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    OTHER USERS WITH ACCESS
                  </div>
                </CardContent>
              </Card>

              {/* Contacts */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">CONTACTS</CardTitle>
                    <Button variant="link" size="sm" className="text-orange-500 p-0 h-auto">
                      + Contact
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {contactPersons.map((person) => (
                    <div key={person.id} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{person.name}</span>
                        {person.isPrimary && (
                          <Badge variant="outline" className="text-xs text-orange-500 border-orange-500">
                            Primary Contact
                          </Badge>
                        )}
                      </div>
                      {person.email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <a href={`mailto:${person.email}`} className="text-orange-500 hover:underline">
                            {person.email}
                          </a>
                        </div>
                      )}
                      {person.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          <span>{person.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          SEND BY INVOICE LANGUAGE
                        </span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Locations Tab */}
        <TabsContent value="locations" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">All Locations</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Input placeholder="Search Locations" className="w-64 h-8" />
                </div>
                <Button variant="ghost" size="icon">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-muted-foreground">
                    <th className="pb-2 font-medium">Display Name</th>
                    <th className="pb-2 font-medium">Address</th>
                    <th className="pb-2 font-medium">Tax Rate</th>
                    <th className="pb-2 font-medium">Account Name</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.map((location) => (
                    <tr key={location.id} className="border-b">
                      <td className="py-3">
                        <span className="text-orange-500 hover:underline cursor-pointer">
                          {location.name}
                        </span>
                      </td>
                      <td className="py-3 text-sm">{location.address}</td>
                      <td className="py-3 text-sm">{location.taxRate ? `${(location.taxRate * 100).toFixed(1)}%` : '-'}</td>
                      <td className="py-3 text-sm">{location.accountName || contact.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages" className="mt-4">
          <MessagesTab contactName={contact.name} />
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-4">
          <DocumentsTab />
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="mt-4">
          <PaymentsTab contactName={contact.name} />
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="mt-4">
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No scheduled items
            </CardContent>
          </Card>
        </TabsContent>

        {/* To-Dos Tab */}
        <TabsContent value="todos" className="mt-4">
          <TodosTab />
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files" className="mt-4">
          <FilesTab />
        </TabsContent>

        {/* Jobs Tab */}
        <TabsContent value="jobs" className="mt-4">
          <JobsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
