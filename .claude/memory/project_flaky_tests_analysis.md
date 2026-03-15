---
name: Flaky e2e test analysis
description: Two e2e tests fail on fresh DB due to Auth0 userinfo fetch failure and AI response format variability
type: project
---

## Failing tests (as of 2026-03-15)

### 1. `registration.spec.ts` — "first login creates teacher record with email"

**Symptom:** `me.email` is empty string, test expects it to be truthy.

**Root cause (confirmed):**
- The JWT access token doesn't carry `email` or `name` claims (confirmed in AuthController.ResolveUserInfoAsync)
- Fallback calls `UserInfoService.GetUserInfoAsync` which hits `https://{domain}/userinfo`
- `UserInfoService` catches all exceptions and returns empty strings (confirmed: lines 54-58)
- On fresh DB, teacher record is created with empty email

**Unconfirmed hypothesis:** The `/userinfo` call fails from inside Docker due to DNS or outbound connectivity. Docker-compose has no explicit network isolation, so the cause could be DNS resolution, firewall, or proxy settings. Needs live debugging to confirm.

**Why it passed before:** On an existing DB, the teacher record already had the email from a previous successful `/userinfo` call.

**Fix options:**
1. Debug Docker outbound connectivity to Auth0 (test DNS resolution, curl from container)
2. Configure Auth0 to include email in the access token claims (Auth0 Action or Rule)
3. Make the e2e auth helper inject the email directly via SQL after teacher creation

**Related test:** `auth-me.spec.ts` has the same issue but passes intermittently because it doesn't delete/recreate the teacher.

### 2. `typed-content-view.spec.ts` — "vocabulary renders as table and student preview shows study view"

**Symptom:** After AI generation + insert, `vocabulary-table` testid is not found. The content block is inserted but doesn't render as a vocabulary table.

**Root cause (confirmed):**
- `isVocabularyContent` only checks for object with `items` array (contentTypes.ts lines 108-110)
- When validation fails, fallback to `FreeTextRenderer` (confirmed in VocabularyRenderer.tsx and ContentRegistry.tsx)
- Vocabulary schema expects `{ items: [{ word, definition, exampleSentence, translation }] }` (confirmed)

**Previous analysis correction:** The backend `TryParseContent` in `LessonContentBlocksController.cs` already strips markdown code fences. The AI prompt also explicitly instructs "no code fences." The flakiness is NOT from code fence wrapping but from the AI occasionally returning malformed JSON or responses missing the `items` array structure.

**Fix options:**
1. Mock the AI endpoint in e2e tests to return a known-good response (most reliable)
2. Add resilience to the content parser (normalize field names, handle edge cases)
3. Add a retry mechanism in the test (regenerate if vocabulary table doesn't appear)

---

## Fix Plan

### Issue 1 fix: Add email to Auth0 access token

**Investigation (manual, before coding):**
1. `docker exec langteachsaas-api-1 curl -v https://<AUTH0_DOMAIN>/userinfo` to confirm whether Auth0 is reachable from the container
2. Decode the JWT access token from e2e login to verify email claim is absent

**Auth0 Dashboard (manual):**
- Actions > Library > Build Custom > "Add email to access token"
- Post-login action that copies `event.user.email` and `event.user.name` into the access token as custom claims (namespaced under the API audience)

**Code change (improve logging):**
- `backend/LangTeach.Api/Services/UserInfoService.cs`: Change catch block from `LogWarning` to `LogError` for `HttpRequestException`, so network failures are more visible in logs

### Issue 2 fix: Mock AI streaming endpoint in e2e test

Use Playwright `page.route()` to intercept `POST */api/generate/*/stream` and return deterministic SSE response.

**SSE format (from GenerateController.cs line 141 and useGenerate.ts):**
- Each token: `data: {JsonSerializer.Serialize(token)}\n\n` (JSON-serialized string)
- End: `data: [DONE]\n\n`
- Content-Type: `text/event-stream`

**Implementation:**
1. Create `e2e/helpers/mock-ai-stream.ts`:
   - Export `mockAiStream(page, taskTypeGlob, jsonPayload)` using `page.route('**/api/generate/${taskTypeGlob}/stream', ...)`
   - Export `VOCABULARY_FIXTURE` with known-good vocabulary JSON matching `{ items: [{ word, definition, exampleSentence, translation }] }`
2. Modify `e2e/tests/typed-content-view.spec.ts`:
   - Import and call `await mockAiStream(page, 'vocabulary', VOCABULARY_FIXTURE)` after page creation, before navigation

### Verification
1. Run `npx playwright test registration.spec.ts` 3 times, all must pass
2. Run `npx playwright test typed-content-view.spec.ts` 3 times, all must pass (now deterministic)
3. Run full e2e suite once to confirm no regressions
