# Command: /refactor

Refactor code while maintaining functionality.

## Usage
```
/refactor <file-or-pattern>          # Refactor specific file
/refactor <description>              # Refactor by description
```

## Process

### 1. UNDERSTAND
- Read the code thoroughly
- Identify what it does
- Note all callers/dependencies

### 2. PLAN
- Define refactoring goals
- Identify risks
- Plan incremental steps

### 3. REFACTOR

#### Extract Function
```javascript
// Before
function processData(data) {
    // 50 lines of validation
    // 50 lines of transformation
    // 50 lines of saving
}

// After
function processData(data) {
    const validated = validateData(data);
    const transformed = transformData(validated);
    return saveData(transformed);
}
```

#### Extract Component
```tsx
// Before: 500-line component

// After: Split into smaller components
<MaterialDetailPage>
    <MaterialHeader />
    <MaterialForm />
    <MaterialActions />
</MaterialDetailPage>
```

#### Consolidate Duplicates
```javascript
// Before: Same logic in 3 files

// After: Shared utility
// lib/utils/pricing.js
export function calculateMargin(cost, price) {
    return ((price - cost) / price) * 100;
}
```

### 4. VALIDATE
- Run tests
- Manual verification
- Check for regressions

### 5. COMMIT
- Use `refactor` type
- Document what changed

## LAZI Refactoring Targets

### Common Patterns to Apply
- Extract repeated DB queries to helpers
- Consolidate API error handling
- Share React Query patterns
- Unify form validation

### Files Often Needing Refactor
- Large detail pages (>500 lines)
- Route files with repeated patterns
- Utility functions with duplication

## Safety Rules
- Never refactor and add features simultaneously
- Keep commits atomic
- Test after each change
- Preserve existing behavior
