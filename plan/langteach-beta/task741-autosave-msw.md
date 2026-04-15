# Task 741 — Migrate useStudentAutosave tests from vi.mock to MSW

## Issue
#741 — refactor: migrate useStudentAutosave tests from vi.mock to MSW

## Goal
Replace `vi.mock('../api/students')` with an MSW `setupServer` that intercepts `PUT /api/students/:id` at the network layer, aligning with the project convention used in `useGenerate.test.ts`.

## Acceptance Criteria
- All 10 existing tests continue to pass
- No `vi.mock` of the students API module
- MSW `setupServer` / `http.put` / `HttpResponse` used for network interception
- `vi.useFakeTimers()` still works (MSW intercepts fetch, not timers)
- Error scenario tested via MSW `http.put` returning a 500 response

## Approach

### Setup
```ts
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

const STUDENT_URL = 'http://localhost:5000/api/students/stu-1'

const server = setupServer(
  http.put(STUDENT_URL, () => HttpResponse.json({ id: 'stu-1' }))
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

### beforeEach
- Keep `vi.useFakeTimers()` (controls debounce/retry timers)
- Remove `vi.clearAllMocks()` and `mockUpdateStudent.mockResolvedValue`

### Error test
Override handler per-test:
```ts
server.use(
  http.put(STUDENT_URL, () => new HttpResponse(null, { status: 500 }))
)
```

### Argument assertions
Replace `expect(mockUpdateStudent).toHaveBeenCalledWith(...)` with a captured-request approach:
- Store `lastRequest` body in the handler closure, assert after timer flush

### Call count assertions
Track a `callCount` counter incremented in the MSW handler instead of `mockUpdateStudent.mock.calls.length`.

## Files Changed
- `frontend/src/hooks/useStudentAutosave.test.ts` (rewrite tests only, no production code changes)

## No e2e changes needed
This is a pure test refactor; no user-visible behavior changes.
