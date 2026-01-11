---
description: Execute an implementation plan
argument-hint: [path-to-plan]
allowed-tools: Read, Write, Edit, Bash(pnpm:*), Bash(npm:*), Bash(git:*)
---

# Execute: Implement from Plan

Read the plan file and fully understand it.

Plan file: $ARGUMENTS

Read all the reference files and documentation to validate the plan is sound.

Think hard about the plan and then create detailed todos before you start implementing.

Make sure you run all validations including running the server and e2e testing with curl.

You must implement the entire plan in one go, do not stop until its complete and all validations pass.

When you are done, report back:
- [List of files added and modified]
- [Number of lines changed]
- [All validations passed] (don't lie about this)

---

## POST-IMPLEMENTATION: Run /verify

After completing all tasks, you MUST:

1. Run verification steps (or full `/verify [feature]`)
2. Create test data
3. Show database proof  
4. Complete CRUD cycle
5. Audit UI bindings

**Include verification evidence in completion report.**
