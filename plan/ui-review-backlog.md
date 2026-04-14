# UI Review Backlog

Non-blocking findings from review-ui runs. Periodically review this file and batch related items into polish GitHub issues.

---

*Cleared 2026-04-08 during Adaptive Replanning sprint close. 1 entry (weakness chip rendering) resolved via DemoSeeder fix; tracked in #603.*

## 2026-04-12 (task #640 review-ui)

| Severity | Screen | Finding |
|----------|--------|---------|
| Low | Sessions list | Demo seeder creates sessions at now-7 and now-14 days at seeding time. By the time review-ui runs days later, sessions fall outside the 7-day Recent window, so the visual spec only verifies empty state. Row layout (CefrBadge, Label-SM headers, no-divider rows) cannot be visually verified until seeder is updated to use -1/-3 day offsets or a fresh seed is done close to review time. |

## 2026-04-14 (task #721 review-ui)

| Severity | Screen | Finding |
|----------|--------|---------|
| Low | Student Detail / Profile tab | Ana Seed has no `SkillLevelOverrides` in seeder so horizontal Skill Assessment badges cannot be visually verified. Would need seeder update to add skill overrides to Ana Seed. Unit tests verify the badge layout. |
| Low | Student Detail / Profile tab | Ana Seed has `PersonalNotes` but no `TeachingNotes` in seeder, so Teacher's Working Memory dark section shows only Sensitivities subsection. To verify both subsections, add TeachingNotes to Ana Seed seeder entry. |
| Info | Student Detail / Profile tab | Right-column "Teacher's Working Memory" sidebar (white card with Profession/Born/Origin/Residence) has same label as left-column dark notes section. Both labeled per Stitch spec. Naming duplication may confuse reviewers but is intentional design distinction. |
| Low | Student Detail / Profile tab | Ana Visual's Teacher's Working Memory dark section shows VisualTag marker string as content (expected seeder data artifact). Not a code issue; personalNotes = VisualTag is intentionally set in seeder as a marker. |

## 2026-04-14 (task #718 review-ui)

| Severity | Screen | Finding |
|----------|--------|---------|
| Low | Students list | Alert badge color variants (amber BEHIND, purple REVIEW PENDING, dark badge) cannot be visually verified because demo seed students are all in NEW state. Unit tests verify all badge color classes. Would need seed students with `pace=behind` or `hasPendingLessonPlan=true` to show these in review. |

## 2026-04-14 (task #719 review-ui)

| Severity | Screen | Finding |
|----------|--------|---------|
| Low | Student detail / Sessions tab | review-ui text selector `text=Sessions` matches the sidebar nav item instead of the tab button, causing navigation away from the page. Pre-existing selector collision in the review tool, not a rendering regression. |
| Low | Student detail / Progress tab | Screenshot not captured due to timeout after the Sessions tab navigation issue above. Tab label renders correctly in all header screenshots. |

## 2026-04-12 (task #663 review-ui)

| Severity | Screen | Finding |
|----------|--------|---------|
| Low | Student edit / Languages card | NativeLanguages combobox shows "N selected" summary text -- no visible hint which language. Consider showing first selected name. Pre-existing combobox behavior, not introduced in #663. |
| Low | Student detail / Overview tab | When student has no native languages, the section is absent entirely with no "None specified" fallback. Tab jumps from title to Learning Goals. Arguably correct but could feel like missing data. |
