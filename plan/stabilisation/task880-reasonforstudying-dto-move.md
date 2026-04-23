# Task #880: Move ReasonForStudying from StudentIdentityDto to StudentProfileDto

## Summary

Pure field move. No DB migration needed (field stays on the `Student` table; only the DTO/response shape changes).

## Files to change

### Backend
- `backend/LangTeach.Api/DTOs/StudentDto.cs` — remove from `StudentIdentityDto`, add to `StudentProfileDto`
- `backend/LangTeach.Api/Services/StudentService.cs` line 250 — move `s.ReasonForStudying` from Identity ctor to Profile ctor
- `backend/LangTeach.Api/Controllers/GenerateController.cs` lines 201, 372 — `student?.Identity.ReasonForStudying` → `student?.Profile.ReasonForStudying`

### Frontend type
- `frontend/src/api/students.ts` — remove from `StudentIdentity`, add to `StudentProfile`

### Frontend consumers
- `frontend/src/pages/StudentForm.tsx` line 266 — `existing.identity.reasonForStudying` → `existing.profile.reasonForStudying`
- `frontend/src/pages/StudentDetail.tsx` line 158 — `student.identity.reasonForStudying` → `student.profile.reasonForStudying`
- `frontend/src/components/student/StudentProfileTab.tsx` — 10 occurrences of `student.identity.reasonForStudying` → `student.profile.reasonForStudying`

### Tests (mock data)
- `frontend/src/components/student/StudentProfileTab.test.tsx` — move field in FULL_STUDENT and EMPTY_STUDENT mocks
- `frontend/src/pages/StudentDetail.test.tsx` — move field in MOCK_STUDENT mocks
- `frontend/src/pages/StudentForm.test.tsx` — move field in builder
- `frontend/src/pages/CourseNew.test.tsx` — 3 occurrences
- `frontend/src/pages/LessonNew.test.tsx` — 1 occurrence
- `frontend/src/pages/Onboarding.test.tsx` — 2 occurrences
- `frontend/src/pages/onboarding/OnboardingStep3.test.tsx` — 1 occurrence
- `frontend/src/components/StudentProfileSummary.test.tsx` — 1 occurrence
- `frontend/src/components/student/ProgressDashboard.test.tsx` — 1 occurrence
- `frontend/src/components/student/StudentProfileOverview.test.tsx` — 1 occurrence
- `frontend/src/components/student/StudentOverviewTab.test.tsx` — 1 occurrence

## AC checklist
- [ ] `StudentIdentityDto` no longer contains `ReasonForStudying`
- [ ] `StudentProfileDto` contains `ReasonForStudying`
- [ ] `GET /api/students/:id` returns `reasonForStudying` under `profile`
- [ ] Frontend TS type matches
- [ ] All frontend consumers updated
- [ ] No runtime errors (null-safe access preserved)
