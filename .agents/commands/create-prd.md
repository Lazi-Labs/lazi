# Command: /create-prd

Generate a PRD for a new feature.

## Usage
```
/create-prd <feature-name>
```

## Process
1. Gather context (problem, users, success criteria)
2. Research codebase (related features, tables, endpoints)
3. Generate PRD using `docs/features/TEMPLATE.md`
4. Save to `docs/features/<feature-name>.md`

## Questions to Ask
- What problem does this solve?
- Who are the users?
- What does success look like?
- What are the constraints?

## LAZI Considerations
- Does this need ServiceTitan data?
- Which schema? (raw/master/crm)
- Mobile/offline requirements?
- Real-time updates needed?
- Affects existing sync flows?

## Output Location
```
docs/features/<feature-name>.md
```

## Template Reference
See `docs/features/TEMPLATE.md` for full structure.
