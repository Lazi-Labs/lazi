# Command: /commit

Generate and execute a conventional commit.

## Usage
```
/commit                    # Auto-analyze staged changes
/commit [hint]             # With description hint
```

## Process
1. Run `git status` 
2. Run `git diff --staged` (or `git diff`)
3. Generate message following conventional format

## Format
```
<type>(<scope>): <description>

[body]

[footer]
```

## Types
| Type | Use |
|------|-----|
| feat | New feature |
| fix | Bug fix |
| refactor | Refactoring |
| perf | Performance |
| docs | Documentation |
| test | Tests |
| chore | Maintenance |

## LAZI Scopes
`pricebook`, `api`, `db`, `ui`, `st`, `temporal`, `docker`, `auth`, `crm`, `sync`, `images`

## Example
```
feat(pricebook): add material kit bulk operations

- Implement batch create/update for kits
- Add validation for circular dependencies

Closes #234
```

## Execution
```bash
git add -A  # if needed
git commit -m "<generated message>"
```
