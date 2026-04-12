---
name: Student Profile Field Guide
description: docs/student-profile-field-guide.md is the source of truth for student profile fields, their meaning, and what belongs where. Must stay in sync with code changes.
type: reference
---

`docs/student-profile-field-guide.md` is the **source of truth** for all student profile fields: what each field is, why it exists, what data belongs in it, and what doesn't.

**Who uses it:** PM (for issue specs), Isaac (for pedagogical review), Sophy (for model design), developers (for migration and UI work).

**Sync rule:** Any task that adds, removes, renames, or changes the semantics of a student profile field MUST update this document as part of the task. If the doc and the code disagree, the doc is wrong and needs fixing.

**How to apply:** When reviewing PRs or plans that touch the Student entity, check the field guide for alignment. When creating issues for new student fields, reference the field guide definitions.
