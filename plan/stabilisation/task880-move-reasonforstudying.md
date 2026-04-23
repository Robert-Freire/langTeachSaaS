# Task #880: Move ReasonForStudying from StudentIdentityDto to StudentProfileDto

## Goal
Move `ReasonForStudying` from the `StudentIdentityDto` sub-record to `StudentProfileDto`.
No behaviour change; purely a semantic DTO restructuring.

## Files to Change

### Backend
1. `backend/LangTeach.Api/DTOs/StudentDto.cs`
   - Remove `ReasonForStudying` from `StudentIdentityDto`
   - Add `ReasonForStudying` as last positional param of `StudentProfileDto`

2. `backend/LangTeach.Api/Services/StudentService.cs` (line ~242-263)
   - Remove `s.ReasonForStudying` from `new StudentIdentityDto(...)` call
   - Add `s.ReasonForStudying` to `new StudentProfileDto(...)` call (after `teachingTodos` list)

### Frontend
3. `frontend/src/api/students.ts`
   - Move `reasonForStudying: string | null` from `StudentIdentity` to `StudentProfile`

4. `frontend/src/components/student/StudentProfileTab.tsx`
   - Replace all `student.identity.reasonForStudying` with `student.profile.reasonForStudying` (~10 occurrences)

5. `frontend/src/pages/StudentDetail.tsx` (line ~158)
   - Replace `student.identity.reasonForStudying` with `student.profile.reasonForStudying`

6. `frontend/src/pages/StudentForm.tsx` (line ~266)
   - Replace `existing.identity.reasonForStudying` with `existing.profile.reasonForStudying`

3b. `backend/LangTeach.Api/Controllers/GenerateController.cs`
   - Two sites read `student?.Identity.ReasonForStudying` — update both to `student?.Profile.ReasonForStudying`

### Tests
7. `frontend/src/components/student/StudentProfileTab.test.tsx`
   - Move `reasonForStudying` from `identity` spread to `profile` spread

8. `frontend/src/pages/StudentDetail.test.tsx`
   - Move `reasonForStudying` from `identity` spread in MOCK_STUDENT (line ~54) and inline overrides (line ~483)

9. `e2e/tests/courses.spec.ts`
   - Move `reasonForStudying: null` from `identity` object to `profile` object

10. Additional test files with stale mock shapes (TypeScript compile errors if not updated):
    - `frontend/src/pages/CourseNew.test.tsx`
    - `frontend/src/components/StudentProfileSummary.test.tsx`
    - `frontend/src/pages/Onboarding.test.tsx`
    - `frontend/src/pages/LessonNew.test.tsx`
    - `frontend/src/pages/StudentForm.test.tsx`
    - `frontend/src/pages/onboarding/OnboardingStep3.test.tsx`
    - `frontend/src/components/student/ProgressDashboard.test.tsx`
    - `frontend/src/components/student/StudentOverviewTab.test.tsx`
    - `frontend/src/components/student/StudentProfileOverview.test.tsx`
    - `frontend/src/pages/LessonEditor.test.tsx`

## No-change files
- `StudentFormData` in `students.ts` — flat struct, not nested, no change needed
- Backend model `Student.cs` — field is on the entity, not touched
- `StudentService.cs` lines 140, 194 — these read/write the entity field, not the DTO, no change

## Acceptance Criteria
- [ ] `StudentIdentityDto` no longer contains `ReasonForStudying`
- [ ] `StudentProfileDto` contains `ReasonForStudying`
- [ ] `GET /api/students/:id` returns `reasonForStudying` under `profile`
- [ ] Frontend TypeScript type matches new shape
- [ ] All frontend consumers updated
- [ ] No runtime errors for student with or without `reasonForStudying`
- [ ] All tests pass
