# Task 557: Validate sourcePassage on edited-content PUT endpoint

## Decision

Teacher edits are **exempt** from the `sourcePassage` validation added in #422. Teachers are authenticated owners of their content; AI-output integrity rules do not apply to them. A code comment in the PUT handler makes the exemption explicit.

## Change

Added a three-line comment above `block.EditedContent = ...` in `LessonContentBlocksController.UpdateEditedContent` explaining the exemption.

## Acceptance criteria

- [x] PUT handler has comment explaining sourcePassage validation is intentionally skipped
- [x] No behavior change
- [x] sourcePassage validator remains applied only to AI-generated content
