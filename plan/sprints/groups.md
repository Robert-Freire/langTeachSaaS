# Sprint: Groups

## The teacher's story

Jordi finishes his Monday afternoon at the academy. Seven students at B1, mixed L1: a couple of English speakers, a French speaker, two German speakers, an Arabic speaker, a Ukrainian. He has been calling them "Lunes B1" for two years, but in Atelier they have lived as a fake student row named "B1.1" because the app had no concept of a group.

He opens Atelier on the train home. The sidebar now has a Groups entry next to Students. He clicks it. There they are: B1.1 and A2.1, real groups now, not pretend students. He opens B1.1. He sees the seven members as a roster, their CEFR badges, their last-session dates with this group. The session history shows the 8 weeks he has been teaching them, properly attached to the group instead of a phantom student.

He clicks Log Session. The form opens with the group identity in the left rail: the cluster of seven avatars, the member names disclosed in a panel he can expand. He records a voice note about today's class, mentions that Yasmine and Mononika struggled with the subjunctive again, hits save. Tomorrow when he opens Yasmine's profile, the session appears in her history with a small "B1.1" pill telling him it was a group session, click-through to the full group context.

Nothing about his daily flow changed except that the workaround is gone.

## What changes for Jordi

**Before this sprint**: academy classes live as fake Student rows. Session history is misfiled. Members are invisible. The hack works but it is a hack.

**After this sprint**: groups are real. Sessions log against the actual group. Members are explicit. Per-student observations stay inline in the free-text fields the way Jordi already writes them (mentioning students by name). His individual students gain visibility into their group sessions without losing the chronological flow of their personal history.

This sprint is intentionally not a new product surface. It is a schema honesty fix that the data has been begging for. The investment compounds because every future feature (corrections at group level, group-aware reflections, eventually group-aware AI when it earns its place back) builds on this foundation.

## What this sprint delivers

**Group entity (Sophy-reviewed schema)**
A Group has a Name, a CEFR level (authoritative target, not derived from members), an optional Description, and a teacher owner. Students join groups via a many-to-many. Sessions can target either a Student or a Group, never both, enforced by a DB CHECK constraint. Existing `SessionLogs.StudentId` becomes nullable; the canonical "sessions for student X including their group sessions" query lands in the repository layer and replaces every existing per-student session query.

**Groups list + create/edit + detail screens (Vera-reviewed UX)**
The Groups list mirrors the Students list with a MEMBERS column (new 2x2 GroupAvatarCluster shared component). Create/edit inlines the member multi-select to avoid empty-group dead-ends. Group detail reuses the student-detail spine with three tabs (Overview, Members, Sessions) and a group-scoped dark Teacher's Working Memory card.

**Log session against a group**
The existing session-edit form gains a group-target variant: left rail shows the group identity with a members disclosure, the Previous Homework tri-state toggle is suppressed (group-level concept, handled inline by Jordi today), everything else identical. One session row in SessionLogs with GroupId only.

**Student profile reflects group membership**
Each student's hero shows group affiliation pills. Their session history mixes 1-to-1 and group sessions chronologically, with a pastel-lavender pill bearing the group name on group rows. A filter select toggles between All / 1-to-1 / Groups.

**Migration**
A CLI script (with `--dry-run`) converts the two known fake-student rows (B1.1, A2.1) to real Groups, reassigns their 14 historical sessions, soft-deletes the fake student rows and renames them `[MIGRATED TO GROUP] B1.1` for audit clarity. Members are left empty for Jordi to populate via the new UI. Allowlist is hardcoded to two IDs; no regex matching.

**Lesson editor hidden from nav**
Pilot user Jordi has 0 lessons across 6 months. The Lessons sidebar entry is dead weight and confuses the demo. Sidebar entry removed; routes preserved so deep links still resolve; code untouched pending a future repurpose-or-rip decision.

## What we're NOT building

- AI lesson generation calibrated to a group (epic explicitly defers; no AI work at all this sprint)
- Multi-L1 prompt construction
- Structured per-student observation fields within a group session (Jordi handles inline in free text, has not asked)
- Group-level shared difficulties / strengths tracking
- Per-student homework Done/Partial/Not done tri-state on group sessions
- Group-level redacciones rollup
- Bulk member import from CSV
- Group progress charts / analytics
- Admin preview UI for the migration (CLI dry-run is sufficient)
- Sprint-time decision on whether to repurpose, rip out, or revive the lesson editor

## How to use this document

Every task, review, and live test in this sprint should be checked against one question: **does Jordi open Atelier on a Monday afternoon, see his academy classes as first-class objects, and never again type the words "B1.1" into a student name field?** If a screen technically works but still leaks the old workaround mental model, it is not done.

The empirical truth that grounds this whole sprint: Jordi has been logging real academy sessions against fake student rows for months. The shape of his data is the spec. Trust the data over abstract pedagogical models for v1.

## Addendum (2026-05-24): corrections items added mid-sprint

After the eight Groups tasks were code-complete, Jordi gave correction feedback that Robert chose to fold into this sprint's close rather than defer (sprint close is heavy; batch it). These three are net-new and intentionally break the original "no AI work this sprint" scope line above:

- **#1349** corrections explanations always in Spanish (teacher aid). Pedagogy resolved (always Spanish, all levels).
- **#1350** flag missing paragraph breaks under the C category. Isaac rubric posted on the issue (B1+, three triggers, anti over-flag guardrails).
- **#1351** teacher view of all flagged errors (pre level-filter) + download both versions. Still gated on Sophy (schema) and Vera (toggle UI) before qa:ready.
