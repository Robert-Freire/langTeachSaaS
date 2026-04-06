# Task 554 — Telegram Connect UI

**Issue:** Robert-Freire/langTeachSaaS#554
**Branch:** worktree-task-t554-telegram-connect-ui
**Sprint:** sprint/adaptive-replanning

## Goal

Add an "Integrations" section to the Settings page. The section contains a Telegram card that lets the teacher generate a connect code, watch for the bot to confirm the link (polling), see their connected status, and disconnect.

## API Surface (from #545)

| Method | Path | Response |
|--------|------|----------|
| POST | /api/telegram/connect-code | `{ code: string, expiresAt: string }` |
| GET | /api/telegram/status | `{ connected: bool, linkedAt: string \| null }` |
| DELETE | /api/telegram/link | 204 |

## Files

| File | Action |
|------|--------|
| `frontend/src/api/telegram.ts` | CREATE — typed API functions |
| `frontend/src/components/settings/TelegramCard.tsx` | CREATE — all states of the Telegram card |
| `frontend/src/components/settings/TelegramCard.test.tsx` | CREATE — unit tests (Vitest + RTL + msw) |
| `frontend/src/pages/Settings.tsx` | MODIFY — append Integrations card below the form |
| `frontend/src/pages/Settings.test.tsx` | MODIFY — smoke test that Integrations section renders |
| `e2e/tests/telegram-connect.spec.ts` | MODIFY — add UI-level happy path tests |

## Implementation Plan

### 1. `frontend/src/api/telegram.ts`

```typescript
export interface TelegramStatus { connected: boolean; linkedAt: string | null }
export interface TelegramConnectCode { code: string; expiresAt: string }

export async function getTelegramStatus(): Promise<TelegramStatus>
export async function generateConnectCode(): Promise<TelegramConnectCode>
export async function deleteTelegramLink(): Promise<void>
```

Uses `apiClient` from `../lib/apiClient` (axios instance with auth interceptor — no token parameter needed, consistent with all other `frontend/src/api/` files).

### 2. `frontend/src/components/settings/TelegramCard.tsx`

Three visual states controlled by local state + react-query:

**State A — Disconnected (idle)**
- Shows "Connect Telegram" button.
- Click calls `POST /connect-code` mutation; on success transitions to State B.

**State B — Pending (code shown)**
- Displays the 8-char code in a monospace block with copy button.
- Instructions: "Open Telegram, find @LangTeachBot, send: /connect {code}"
- Polls `GET /status` every 3 s via react-query `refetchInterval`.
- Polling stops after 5 minutes: `refetchInterval` returns `false` when `Date.now() - pollingStartedAt > 5 * 60 * 1000`.
- If polling detects `connected === true`, transition to State C.
- "Cancel" button stops polling and returns to State A without deleting the link.

**State C — Connected**
- Shows "Telegram connected" badge + "Linked on {formattedDate}" (linkedAt formatted with `toLocaleDateString`).
- "Disconnect" button calls `DELETE /link` mutation; on success transitions to State A.

**Cancel button (State B):** resets local state only (no server call). The connect code expires server-side after 10 minutes via the in-memory TTL store. No cleanup endpoint is needed.

**Component props:** none (self-contained; `apiClient` handles auth automatically).

### 3. Unit tests (`TelegramCard.test.tsx`)

Cover with msw handlers:
- Renders "Connect Telegram" button initially.
- Clicking "Connect Telegram" shows the code and instructions.
- Polling interval transitions to connected state.
- "Disconnect" button calls DELETE and resets to idle.
- Polling stops after 5-minute timeout (mock timers).

### 4. `Settings.tsx` modification

Append below the `</form>` tag:

```tsx
{/* Integrations */}
<div className="pt-6">
  <PageHeader title="Integrations" subtitle="Connect external services to LangTeach." />
  <div className="mt-4">
    <TelegramCard />
  </div>
</div>
```

The Integrations block is outside the profile form to avoid submit conflicts. Use a `<Card>` with `<CardHeader><CardTitle>Integrations</CardTitle></CardHeader>` and `<CardContent>` wrapping `<TelegramCard />` to stay visually consistent with the existing profile cards rather than a top-level `PageHeader`.

### 5. `Settings.test.tsx` modification

Add one smoke test: renders Settings, assert that text "Integrations" is visible and "Connect Telegram" button is present (mock GET /status returning `{ connected: false, linkedAt: null }`).

### 6. E2e UI tests

Add to `e2e/tests/telegram-connect.spec.ts`:

- `settings page shows integrations section` — navigates to `/settings`, asserts "Integrations" heading visible.
- `connect telegram flow` — clicks "Connect Telegram", asserts code is displayed, asserts instructions text visible.
- `disconnect flow` — seeds a connected state by inlining the webhook POST sequence (generate code → POST /api/telegram/webhook with X-Telegram-Bot-Api-Secret-Token, same pattern as the existing API test in the same file), then navigates to `/settings`, asserts "Connected" state is shown, clicks Disconnect, asserts the card returns to idle state.

## Acceptance Criteria Mapping

| AC | Implementation |
|----|---------------|
| Settings page has "Integrations" section with Telegram card | Settings.tsx + TelegramCard (States A/C) |
| "Connect Telegram" calls POST, displays code and instructions | State A → mutation → State B |
| Page polls every 3 s; on success shows Connected without full reload | react-query refetchInterval on State B |
| "Disconnect" calls DELETE and resets | State C → mutation → State A |
| Polling stops after 5 min | refetchInterval callback checks elapsed time |
| Connected state shows formatted linkedAt date | State C shows `new Date(linkedAt).toLocaleDateString()` |
| Unlinked account in bot: instructions in bot reply (no UI) | Already handled in backend; out of scope for UI |

## Out of Scope

- No bot interaction UI.
- No push notification when link is confirmed (polling covers this).
- WhatsApp or other integrations.
