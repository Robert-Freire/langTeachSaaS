---
name: Sophy reviews hardcoded rules
description: Sophy must be called whenever a PR adds hardcoded conditional logic (if/else, switch) based on language, level, template, or student properties to PromptService or generation code — not just on data model changes
type: feedback
---

Sophy's primary purpose is to catch config-vs-code violations. Any time a PR adds a hardcoded rule that belongs in a JSON config file (e.g. language-specific if blocks, level-specific switch statements, template-specific conditionals in PromptService.cs or prompt builders), Sophy must be called.

This is more important than the data model trigger. The data model trigger is about structural correctness; the hardcoded-rules trigger is about architectural discipline — preventing logic from being buried in C# when it belongs in `data/pedagogy/*.json` or section profiles.

Example that triggered this feedback: PR #383 added `if (Language == "Spanish")` to ExercisesUserPrompt() for subjunctive temporal correlation — that constraint belongs in a pedagogy config file, not hardcoded in C#. Sophy was not called because the routing rule only listed data model files.

The review-routing.md procedure was updated 2026-03-29 to add this trigger.
