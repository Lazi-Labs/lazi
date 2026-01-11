# LAZI Component Reference

## UI Framework

- **Library**: shadcn/ui (new-york style)
- **Icons**: Lucide React
- **Styling**: TailwindCSS
- **State**: TanStack Query + Zustand
- **Forms**: React Hook Form + Zod

---

## shadcn/ui Components (61 total)

Located in `apps/web/components/ui/`:

### Layout & Navigation
| Component | File | Usage |
|-----------|------|-------|
| `Sidebar` | `sidebar.tsx` | Main navigation sidebar |
| `NavigationMenu` | `navigation-menu.tsx` | Top navigation |
| `Breadcrumb` | `breadcrumb.tsx` | Page breadcrumbs |
| `Tabs` | `tabs.tsx` | Tab navigation |
| `Menubar` | `menubar.tsx` | Menu bar |
| `Separator` | `separator.tsx` | Visual divider |
| `ResizablePanels` | `resizable.tsx` | Resizable panels |
| `ScrollArea` | `scroll-area.tsx` | Custom scrollbars |

### Forms & Inputs
| Component | File | Usage |
|-----------|------|-------|
| `Button` | `button.tsx` | All buttons |
| `Input` | `input.tsx` | Text inputs |
| `Textarea` | `textarea.tsx` | Multi-line input |
| `Select` | `select.tsx` | Dropdowns |
| `Checkbox` | `checkbox.tsx` | Checkboxes |
| `RadioGroup` | `radio-group.tsx` | Radio buttons |
| `Switch` | `switch.tsx` | Toggle switches |
| `Slider` | `slider.tsx` | Range sliders |
| `Label` | `label.tsx` | Form labels |
| `Form` | `form.tsx` | Form wrapper |
| `Field` | `field.tsx` | Form field wrapper |
| `InputOTP` | `input-otp.tsx` | OTP input |
| `NativeSelect` | `native-select.tsx` | Native select |

### Feedback & Overlays
| Component | File | Usage |
|-----------|------|-------|
| `Dialog` | `dialog.tsx` | Modal dialogs |
| `Sheet` | `sheet.tsx` | Slide-out panels |
| `Drawer` | `drawer.tsx` | Bottom drawers |
| `Popover` | `popover.tsx` | Popovers |
| `Tooltip` | `tooltip.tsx` | Tooltips |
| `HoverCard` | `hover-card.tsx` | Hover cards |
| `Toast` | `toast.tsx` | Toast notifications |
| `Toaster` | `toaster.tsx` | Toast container |
| `Alert` | `alert.tsx` | Alert messages |
| `AlertDialog` | `alert-dialog.tsx` | Confirmation dialogs |
| `Progress` | `progress.tsx` | Progress bars |
| `Skeleton` | `skeleton.tsx` | Loading skeletons |
| `Spinner` | `spinner.tsx` | Loading spinner |

### Data Display
| Component | File | Usage |
|-----------|------|-------|
| `Table` | `table.tsx` | Data tables |
| `Card` | `card.tsx` | Content cards |
| `Badge` | `badge.tsx` | Status badges |
| `Avatar` | `avatar.tsx` | User avatars |
| `Calendar` | `calendar.tsx` | Date picker |
| `Chart` | `chart.tsx` | Tremor charts |
| `Timeline` | `timeline.tsx` | Activity timeline |
| `Empty` | `empty.tsx` | Empty state |

### Interactive
| Component | File | Usage |
|-----------|------|-------|
| `DropdownMenu` | `dropdown-menu.tsx` | Dropdown menus |
| `ContextMenu` | `context-menu.tsx` | Right-click menus |
| `Command` | `command.tsx` | Command palette (cmdk) |
| `Accordion` | `accordion.tsx` | Collapsible sections |
| `Collapsible` | `collapsible.tsx` | Collapsible content |
| `Toggle` | `toggle.tsx` | Toggle buttons |
| `ToggleGroup` | `toggle-group.tsx` | Toggle button groups |
| `Carousel` | `carousel.tsx` | Image carousel |

### Specialized
| Component | File | Usage |
|-----------|------|-------|
| `Kanban` | `kanban.tsx` | Kanban board |
| `Reel` | `reel.tsx` | Horizontal scroll |
| `ThemeToggle` | `theme-toggle.tsx` | Dark/light toggle |
| `Kbd` | `kbd.tsx` | Keyboard shortcuts |

---

## Pricebook Components (35 total)

Located in `apps/web/components/pricebook/`:

### Category Components
| Component | File | Purpose |
|-----------|------|---------|
| `CategoriesPanel` | `categories-panel.tsx` | Main category list with tree |
| `CategoryTree` | `category-tree.tsx` | Hierarchical tree view |
| `CategoryTreeFilter` | `category-tree-filter.tsx` | Category filter sidebar |
| `CategoryCard` | `CategoryCard.tsx` | Single category card |
| `CategoryImage` | `CategoryImage.tsx` | Category image display |
| `CategorySelectorModal` | `CategorySelectorModal.tsx` | Category picker modal |
| `SortableCategory` | `SortableCategory.tsx` | Drag-sortable category |
| `SortableCategoryList` | `SortableCategoryList.tsx` | Sortable category container |
| `VirtualizedCategoryList` | `VirtualizedCategoryList.tsx` | Virtualized for performance |
| `PricebookCategorySidebar` | `pricebook-category-sidebar.tsx` | Category sidebar |

### Material Components
| Component | File | Purpose |
|-----------|------|---------|
| `MaterialsPanel` | `materials-panel.tsx` | Material list view |
| `MaterialDetailPage` | `material-detail-page.tsx` | Material edit form (77KB) |
| `MaterialEditor` | `material-editor.tsx` | Inline material editor |
| `MaterialsList` | `materials-list.tsx` | Material table |
| `MaterialsTab` | `materials-tab.tsx` | Materials tab wrapper |

### Service Components
| Component | File | Purpose |
|-----------|------|---------|
| `ServicesPanel` | `services-panel.tsx` | Service list view |
| `ServiceDetailPage` | `service-detail-page.tsx` | Service edit form (82KB) |
| `ServiceEditor` | `service-editor.tsx` | Inline service editor |
| `ServicesList` | `services-list.tsx` | Service table |
| `ServicesTab` | `services-tab.tsx` | Services tab wrapper |
| `ServiceSelectorModal` | `ServiceSelectorModal.tsx` | Service picker modal |

### Equipment Components
| Component | File | Purpose |
|-----------|------|---------|
| `EquipmentPanel` | `equipment-panel.tsx` | Equipment list view |
| `EquipmentDetailPage` | `equipment-detail-page.tsx` | Equipment edit form |
| `EquipmentEditor` | `equipment-editor.tsx` | Inline equipment editor |
| `EquipmentList` | `equipment-list.tsx` | Equipment table |
| `EquipmentTab` | `equipment-tab.tsx` | Equipment tab wrapper |

### Kit Components (LAZI-only)
Located in `components/pricebook/kits/`:

| Component | File | Purpose |
|-----------|------|---------|
| `KitsPanel` | `KitsPanel.tsx` | Kit list view |
| `KitDetailPage` | `KitDetailPage.tsx` | Kit edit form |
| `KitCard` | `KitCard.tsx` | Single kit card |
| `KitSelectorModal` | `KitSelectorModal.tsx` | Kit picker modal |
| `KitGroupManager` | `KitGroupManager.tsx` | Kit group management |
| `MaterialKitBuilder` | `MaterialKitBuilder.tsx` | Kit builder UI |

### Organization Components
Located in `components/pricebook/organization/`:

| Component | File | Purpose |
|-----------|------|---------|
| `HealthDashboard` | `HealthDashboard.tsx` | Pricebook health metrics |
| `DuplicateManager` | `DuplicateManager.tsx` | Duplicate detection |
| `BulkEditor` | `BulkEditor.tsx` | Bulk operations |
| `AuditLog` | `AuditLog.tsx` | Change history |
| `ReviewedToggle` | `ReviewedToggle.tsx` | Review status toggle |
| `NeedsAttention` | `NeedsAttention.tsx` | Items needing review |

### Shared Components
| Component | File | Purpose |
|-----------|------|---------|
| `PricebookSidebar` | `pricebook-sidebar.tsx` | Main pricebook sidebar |
| `PricebookSettingsModal` | `pricebook-settings-modal.tsx` | Settings modal |
| `PendingChangesBar` | `PendingChangesBar.tsx` | Pending changes indicator |
| `EditColumnsDrawer` | `EditColumnsDrawer.tsx` | Column visibility |
| `PricingBuilderPanel` | `pricing-builder-panel.tsx` | Price calculator |
| `VendorsPanel` | `vendors-panel.tsx` | Vendor management |

---

## Layout Components

Located in `apps/web/components/layout/`:

| Component | File | Purpose |
|-----------|------|---------|
| `AppSidebar` | `app-sidebar.tsx` | Main app sidebar |
| `Header` | `header.tsx` | Page header |
| `PageContainer` | `page-container.tsx` | Page wrapper |
| `DashboardLayout` | `dashboard-layout.tsx` | Dashboard wrapper |

---

## CRM Components

### Pipeline Components
Located in `apps/web/components/pipeline/`:

| Component | File | Purpose |
|-----------|------|---------|
| `PipelineBoard` | `pipeline-board.tsx` | Kanban pipeline view |
| `PipelineCard` | `pipeline-card.tsx` | Opportunity card |
| `StageColumn` | `stage-column.tsx` | Pipeline stage column |
| `OpportunityModal` | `opportunity-modal.tsx` | Opportunity details |

### Contact Components
Located in `apps/web/components/contacts/`:

| Component | File | Purpose |
|-----------|------|---------|
| `ContactList` | `contact-list.tsx` | Contact table |
| `ContactDetail` | `contact-detail.tsx` | Contact details |
| `ContactForm` | `contact-form.tsx` | Contact edit form |

### Inbox Components
Located in `apps/web/components/inbox/`:

| Component | File | Purpose |
|-----------|------|---------|
| `InboxList` | `inbox-list.tsx` | Message list |
| `MessageThread` | `message-thread.tsx` | Conversation view |
| `ComposeMessage` | `compose-message.tsx` | New message form |

---

## Hooks

Located in `apps/web/hooks/`:

| Hook | File | Purpose |
|------|------|---------|
| `useAuth` | `use-auth.ts` | Authentication state |
| `useToast` | `use-toast.ts` | Toast notifications |
| `useSocket` | `use-socket.ts` | Socket.io connection |
| `useMobile` | `use-mobile.ts` | Mobile detection |
| `useDebugLog` | `use-debug-log.ts` | Debug logging |
| `usePricebookCategories` | `usePricebookCategories.ts` | Category data |
| `usePricebookOrganization` | `usePricebookOrganization.ts` | Organization features |
| `useContacts` | `use-contacts.ts` | Contact data |
| `useOpportunities` | `use-opportunities.ts` | Opportunity data |
| `usePipeline` | `use-pipeline.ts` | Pipeline data |
| `useMessages` | `use-messages.ts` | Message data |
| `useConversations` | `use-conversations.ts` | Conversation data |

---

## Component Patterns

### Basic Component Structure
```tsx
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MyComponentProps {
  id: string;
  onAction?: () => void;
  className?: string;
}

export function MyComponent({ id, onAction, className }: MyComponentProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const { data, isLoading } = useQuery({
    queryKey: ['entity', id],
    queryFn: () => fetchEntity(id),
  });

  if (isLoading) {
    return <Skeleton className="h-20 w-full" />;
  }

  return (
    <div className={cn('p-4 rounded-lg border', className)}>
      {/* Component content */}
    </div>
  );
}
```

### Modal Pattern
```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface MyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function MyModal({ open, onOpenChange, onConfirm }: MyModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modal Title</DialogTitle>
        </DialogHeader>
        
        {/* Modal body */}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Form Pattern
```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const schema = z.object({
  name: z.string().min(1, 'Required'),
  price: z.number().min(0),
});

type FormData = z.infer<typeof schema>;

export function MyForm({ onSubmit }: { onSubmit: (data: FormData) => void }) {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', price: 0 },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Save</Button>
      </form>
    </Form>
  );
}
```

---

## Adding New Components

### Add shadcn/ui Component
```bash
cd apps/web
npx shadcn@latest add <component-name>
```

### Create Custom Component
1. Create file in appropriate directory
2. Follow naming conventions (PascalCase)
3. Export from index.ts if needed
4. Use existing UI components
5. Follow established patterns

---

*Component reference generated from codebase analysis - January 2025*
