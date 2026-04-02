# Task 364: Relax A2 Practice CE-* Blanket Ban

## Problem
A1-A2 practice profiles had a blanket CE-* forbidden pattern at A1. At A2, CE-01 and CE-02 were already allowed in `validExerciseTypes` but the issue needed verification.

## Findings
- **A2**: CE-01, CE-02 already in `validExerciseTypes` in practice.json (pre-existing, before #363). A2 CEFR level file includes CE-01, CE-02, CE-03, CE-06. The intersection passes CE-01/CE-02 through correctly. AC1 is already met.
- **A1**: CE-01 is in A1's CEFR appropriate types (`a1.json`) but NOT in A1 practice `validExerciseTypes`. The old CE-* blanket ban (in `forbiddenExerciseTypes`) was removed by task #363, but CE-01 was never added to A1's section valid list.
- **A1 decision**: Add CE-01 to A1 practice `validExerciseTypes`. Rationale: CE-01 (global comprehension/gist reading) starts at A1 in the catalog. At A1, read-and-match exercises using very short texts (picture-word matching, simple True/False) are pedagogically valid. Constrain via `levelSpecificNotes` to max 2-3 sentences, picture-supported where possible.

## Changes

### data/section-profiles/practice.json
- Add CE-01 to A1 `validExerciseTypes`
- Add levelSpecificNote for CE-01 at A1: constrain to very short texts (2-3 sentences), picture-supported match or True/False

### backend/LangTeach.Api.Tests/Services/PedagogyConfigServiceTests.cs
- Add test: `GetValidExerciseTypes_Practice_A2_ContainsCE01AndCE02`
- Add test: `GetValidExerciseTypes_Practice_A1_ContainsCE01`

## Acceptance Criteria
- [ ] A2 practice surfaces CE-01 and CE-02 via GetValidExerciseTypes (already true, test confirms it)
- [ ] A1 decision documented (add CE-01 with levelSpecificNote)
- [ ] All backend tests pass
