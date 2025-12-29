# LAZI AI - Developer Mode / Visual Spec Builder

Click on any UI element to define its behavior, then export to Windsurf for implementation.

## Quick Start

### 1. Copy files to your project

```bash
cp -r lazi-dev-mode /opt/docker/apps/lazi/apps/web/src/components/dev-mode
```

### 2. Wrap your app with DevMode

In your root layout (`app/layout.tsx` or `app/dashboard/layout.tsx`):

```tsx
import { DevMode } from '@/components/dev-mode';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <DevMode devOnly={true}>
          {children}
        </DevMode>
      </body>
    </html>
  );
}
```

### 3. Use It

1. Press `Ctrl+Shift+D` or click the 🛠️ button to enable Developer Mode
2. Click "Start Inspecting" in the toolbar
3. Hover over any element - it will highlight
4. Click an element to open the configuration modal
5. Define what the element should do
6. Save the specification
7. Export to Windsurf when ready

## Features

### Element Inspector
- Hover over any element to see its type and text
- Click to select and configure
- Automatically detects buttons, links, inputs, table rows, etc.

### Configuration Modal
- **Behavior Tab**: Define what the element should do
  - API Call (method, endpoint, payload)
  - Navigate to page
  - Trigger n8n workflow
  - Run sync job (ServiceTitan)
  - Open modal
  - Custom description
  
- **UI Feedback Tab**: Define loading states and messages
  - Show loading spinner
  - Success/error toast messages
  - Refresh after completion

- **Windsurf Tab**: Generate and copy implementation prompt

### Specs Panel
- View all saved specifications
- Filter by page, status, or search
- Bulk select and export
- Track implementation status (draft → testing → implemented → production)

### Export Formats
- **Windsurf Prompt**: Markdown formatted for Windsurf
- **JSON**: Full spec data for backup/import

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+D` | Toggle Developer Mode |
| `ESC` | Cancel inspection |

## Props

### DevMode

```tsx
<DevMode
  devOnly={true}              // Only show in development (default: true)
  storageKey="my-specs"       // localStorage key (default: 'lazi-dev-mode-specs')
  defaultEnabled={false}      // Enable on mount (default: false)
>
  {children}
</DevMode>
```

### useDevMode Hook

```tsx
import { useDevMode } from '@/components/dev-mode';

function MyComponent() {
  const {
    isEnabled,           // DevMode is active
    isInspecting,        // Currently inspecting elements
    savedSpecs,          // All saved specifications
    currentPage,         // Current route
    toggleDevMode,       // Toggle on/off
    startInspecting,     // Start element selection
    exportToWindsurf,    // Export specs as markdown
  } = useDevMode();
}
```

## Example Windsurf Export

```markdown
# LAZI CRM - UI Specifications

Generated: 2024-12-26T04:00:00.000Z

---

## Page: /dashboard/categories

### button: "Pull From ST"

- **Type:** button
- **Location:** Header
- **Selector:** `button.pull-from-st`
- **Priority:** high
- **Status:** draft

**Behavior:**

1. Call `POST /api/sync/pricebook-categories`
2. Show loading spinner during operation
3. On success: Show toast "Successfully synced categories"
4. On error: Show toast "Failed to sync. Please try again."
5. Refresh table data after completion

**Description:**

When clicked, fetch all pricebook categories from ServiceTitan API 
and upsert to raw.st_pricebook_categories table. Update the UI 
to show sync progress and final count.

---
```

## Storage

Specs are stored in localStorage by default. They persist across browser sessions.

To export/backup all specs:
1. Open the toolbar
2. Click "Export Specs"
3. Choose "Download JSON"

To import specs:
```tsx
const { importFromJSON } = useDevMode();
importFromJSON(jsonString);
```

## Customization

### Adding Custom Action Types

Edit `DevModeProvider.tsx`:

```tsx
export interface ElementSpec {
  // ...
  actionType: 'api-call' | 'navigate' | 'modal' | 'workflow' | 'sync-job' | 'custom' | 'your-new-type';
  // Add new config fields
  yourNewConfig?: string;
}
```

Then update `ConfigModal.tsx` to add UI for the new action type.

### Styling

All components use inline styles for portability. To customize:
1. Replace inline styles with your design system classes
2. Or wrap components and override styles

## File Structure

```
dev-mode/
├── index.ts              # Exports
├── DevMode.tsx           # Main wrapper component
├── DevModeProvider.tsx   # Context and state management
├── ElementInspector.tsx  # Hover/click overlay
├── ConfigModal.tsx       # Configuration form
├── DevModeToolbar.tsx    # Floating controls
├── SpecsPanel.tsx        # View saved specs
└── README.md             # This file
```

## Integration with Windsurf

1. Configure your elements in DevMode
2. Click "Export Specs" → "Copy Windsurf Prompt"
3. Paste into Windsurf
4. Windsurf implements the behavior
5. Mark specs as "implemented" in DevMode
6. Repeat!

This creates a feedback loop:
- **You**: Define what UI should do
- **Windsurf**: Implements the code
- **DevMode**: Tracks progress
