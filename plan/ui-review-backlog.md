# UI Review Backlog

Non-blocking findings from review-ui runs. Periodically review this file and batch related items into polish GitHub issues.

---

## Cleared history

*Cleared 2026-04-22 (UI Redesign close): batched into #834, #840; remaining deleted (intentional per Stitch spec, covered by tests, or pre-existing infra).*

*Cleared 2026-04-27 (Student Profile Voice Input close): DS/component findings batched into #989; nav findings into #992; seeder gap into #991.*

*Cleared 2026-05-03 (Unified Voice & Chat close): Atelier Assistant pattern findings batched into #1064 (Vera DS canonicalization).*

*Cleared 2026-05-11 (Text Correction close): batched into #1225, #1231; I4 mobile header overflow refuted; M3 native date picker logged to observed-issues.*

*Cleared 2026-05-24 during Groups sprint close. The DS-spec gaps were batched into #1363 (design-system: spec Groups + correction + Atelier patterns, Groups milestone): #1327 GroupAvatarCluster, #1328 inline typeahead glassmorphism, #1351 level-filter annotation badge token. Deleted: #1274 (M2 thumbs 44px / M3 resize-none could not be screenshotted due to the pre-existing worktree-vs-Docker limitation #1113, but both were confirmed via Playwright DOM inspection on the live stack during the live-verify step).*
| #1379 | 2026-05-26 | low | Group session navigation rows lack a trailing ChevronRight (DS §11.8). Pre-existing and consistent across GroupSessionsTab rows, GroupOverviewTab "Session History" rows, and the "Last Session" hero card. Out of scope for #1378/#1379; batch into a group-session-row polish issue (touches 3 components, decide once). |
| #1379 | 2026-05-26 | low | GroupLogSession left-rail "First session!" congratulatory card (indigo-gradient text on tinted card) is a context-rail empty-state sub-pattern not specified in design-system.md §9. Needs Vera canonicalization; not a defect. |
| #1390 | 2026-05-31 | low | ProposalCard admin callout uses `bg-yellow-50 text-yellow-800`; DS palette defines amber and indigo families, not yellow. Needs Vera confirmation: yellow-50 as caution alias or replace with amber-50 (DS §2). |
| #1390 | 2026-05-31 | low | GroupForm Aliases/Interests/FocusAreas chip inputs all use raw inline `<input>` tags in a container div rather than `<Input>` DS component. Pre-existing pattern, extended by Aliases field. Needs Vera confirmation as accepted tag-input exception (DS §11.1). |
- [#1401 review-ui] Group detail header: 'Edit Group' (ghost) paired with 'Log Session' (filled primary gradient) in the same header action row. Not covered by DS §8.5 (GroupForm context only). Whether ghost+filled is intentional for detail header rows is unspecified. Pre-existing pattern, not introduced by this PR.
