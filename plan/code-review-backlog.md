# Code Review Backlog

Unfixed notes from code review (review agent) runs. When reviewing this backlog, be critical: if a finding has real risk (future breakage, i18n issues, security), create an issue. If it's superficial or speculative, delete it.

---

*Cleared 2026-04-22 during UI Redesign & Student Profile Polish sprint close. Actionable entries batched into #833 (bug batch: todo validation + countdown + difficulty feedback), #837 (deduplication: getInitials/formatRelativeDate/CEFR_ORDER). Remaining entries deleted (verified safe, intentional per spec, already tracked in #737/#707/#644/#714/#715/#716/#683/#741/#742/#756/#809/#657, or consistent with existing patterns).*

*Cleared 2026-04-27 during Student Profile Voice Input sprint close. Actionable entries batched into #989 (DS component polish), #990 (code hardening), #992 (navigation UX). Dismissed and cosmetic entries deleted (#927 dismissed, #947 rename too cosmetic).*

## #997 (2026-04-29)

- `StudentDetailHeader.tsx` uses `md:hidden lg:inline` for responsive button labels. Other components (`LessonEditor`, `CourseDetail`, `StudentRoster`) use `hidden sm:inline`. The wider breakpoint in the header is intentional: 3 buttons share a row with avatar/name/badges/objectives making it denser than typical toolbars. Low priority; worth aligning if a global responsive-label convention is ever formalised.

## #1008 (2026-04-28)

- **AppShell transcription state lift** (arch-reviewer): `transcription: string | null` for the Atelier Assistant lives in AppShell. This works for part 1 but deviates from the pattern of sub-panel state living local or in a dedicated context (compare `VoiceUpdateDrawer` state in `StudentDetail.tsx`). If parts 2/3 add more cross-cutting assistant state (proposals, selection, apply flow), refactor to a dedicated `AtelierAssistantContext` provider. Resolved at #1009: all state now lives in `useAtelierAssistant` hook. Context provider can be considered for Part 3 (#1010) if cross-route state is needed.

## #1005 (2026-04-28)

- **JSON-blob in ProposalDto.newValue for newStudent type** (arch-reviewer): All other proposal types store a plain human-readable string in `newValue`. The `newStudent` type encodes a JSON object. This diverges from the existing pattern and will complicate generic proposal handling if/when needed. Consider a proper discriminated union for proposals or a dedicated `newStudentPayload` field in the response DTO if compound proposals are added for other types in Part 3.

## #1009 (2026-04-28)

- **Proposal field taxonomy hardcoded in C#** (Sophy): `AssistantController` emits `EmitProposal` calls for 7 hard-coded field/label pairs. `PatchStudentRequest`/`PatchSessionRequest` mirror this whitelist. Long-term: extract to `data/assistant/proposal-fields.json` consumed by both emission loop and patch dispatch. Assess at Part 3+ (#1010).
- **CEFR regex duplicated** (Sophy): `PatchStudentRequest.CefrLevel` regex `^(A1|A2|B1|B2|C1|C2)$` duplicates `UpdateStudentRequest`. Both should read from `IPedagogyConfigService.AllowedCefrLevels`. Batch with #837-style deduplication in sprint close.
- **`useAtelierAssistant` uses raw async/await instead of `useMutation`** (arch-reviewer): The multi-card orchestration pattern doesn't fit single-mutation well. Cache invalidation is handled via `invalidateQueries`. Reassess if retry/optimistic-update patterns become complex in Part 3.

## #1029 (2026-05-02)

- **`ExtractedReflectionDto` DTO flattening** (Sophy): `NewSessionTitle` and `NewSessionDate` sit flat alongside `SessionTitle` and `SessionDate` on the same record. Consider nesting as `ProposedNewSession? { Title, Date }` to make the temporal distinction explicit at the type level. Low priority; the prompt already disambiguates. Consider for a DTO-cleanup pass in a future sprint.

## #1041/#1042 (2026-05-02)

- **Weekday backward-resolution prose duplicated** (prompt-health-reviewer): "el lunes pasado" past-date resolution is stated in both `sessionDate` (line 1563) and `newSessionDate` (line 1576) with slightly different wording. Consider extracting a shared preamble or cross-reference. Minor, no functional risk.

| #1051 | aria-disabled vs native disabled | AppShell FAB uses aria-disabled + manual onClick guard (not native disabled) to preserve focusability for tooltip. Intentional accessibility trade-off. Other disabled buttons in codebase use native disabled. |

## #1070 (2026-05-03)

- **IMPORTANT CONTEXT preamble contains negative suppression** (prompt-health-reviewer): The preamble says "sessionTitle and whatWasCovered do not apply" when HasOpenSession=false. Now that sessionTitle has a field-level null guard, this negative-bloat clause is redundant. Remove "sessionTitle and whatWasCovered do not apply" from the sessionContextHint block once the existing null guards stabilise. Minor, no functional risk.

## #1075 (2026-05-03)

- **eslint-disable comment style** (arch-reviewer): The new post-init sync `useEffect` in `LogSession.tsx` uses an inline trailing comment on the dep array (`// intentionally reads local state without declaring as deps`) rather than a `// eslint-disable-next-line` line above it. Both are consistent with patterns used elsewhere in the file; cosmetic only, no functional impact.

## #421 (2026-05-04)

- **Extract per-item shape predicates as named guards** (Sophy): `coerceExercisesContent` inline filters re-implement shape checks that could be shared named guards (e.g. `isExercisesFillInBlankItem`). A schema change to any interface requires editing two places. Extract guards when adding the next exercise sub-format.
- **`multipleChoice.options` element type** (Sophy): `options: string[]` is validated as "is array" but individual elements are not checked for string type. If AI sends non-string elements they pass through. Apply `filter(a => typeof a === 'string')` for symmetry with `sentenceTransformation.alternatives`.

## #1066 (2026-05-04)

- **weekdayBackwardRule to prompt-fragments.json** (Sophy): The weekday backward-resolution C# const is prompt text that ideally lives in JSON alongside the opener strings. Complex to extract (embedded in a raw-string interpolation) - revisit when the surrounding date-resolution prose needs tuning by Isaac.
- **AssistantController dictionary key hardcoding** (Sophy): The C# dictionary that maps field names to extraction DTO properties is still hardcoded. Adding a new student field requires touching C# (extraction DTO + dictionary entry) AND the JSON. The JSON is a label+multiline registry, not a full field taxonomy. Document this limitation at the call site.
- **ProposalDto NewStudentPayload vs single Payload** (Sophy): Splitting Payload into Payload + NewStudentPayload is a discriminated union encoded as two nullable fields with a prose contract. Issue #1066 explicitly requested it; TypeScript typing is cleaner with a dedicated field. Revisit if a third proposal type needs its own payload shape.

- **Third PromptService hardcoded opener** (prompt-health-reviewer): Line ~1691 `"You are an expert language teaching assistant..."` in `BuildReplanSuggestionPrompt` is a self-contained multi-line const that was excluded from fragment extraction in this PR. Revisit when replan prompt needs tuning.

## #1064 (2026-05-04)

- **FAB and Compound Input Bar placement** (arch-reviewer): These are placed as `###` subsections inside §5 "Components" but carry §11-level token detail. §11 is the home for all detailed cross-screen control specs (§11.7 Toggle Pill Chips, §11.8 Chevron, §11.9 Drawer Footer). Future doc authors adding FAB-level detail may follow either §5 or §11 as a model. Low priority; only worth moving if the §5/§11 split is ever formally codified with explicit scope rules.

## #1067 (2026-05-04)

- **GenerateController.Generate returns 503 for ClaudeRateLimitException** (architecture-reviewer): The non-streaming `Generate` helper in `GenerateController.cs` returns 503 with a bare string for `ClaudeRateLimitException`. The new `ExtractProfile` endpoint correctly returns 429 with a structured body. Inconsistency across AI-backed endpoints. Pre-existing gap; `GenerateController` fix is out of scope for this hardening batch. Align in a future pass.
- **TeachingTodosCard.test.tsx timer pattern** (architecture-reviewer): The flake fix uses inline `try/finally` for fake-timer scope, while other test files use `afterEach(() => vi.useRealTimers())`. The `try/finally` is safe; inconsistency is cosmetic. Normalise if a global timer convention is ever established.

## #1152 (architecture-reviewer notes, PASS WITH NOTES)
- DeletedAt nullable timestamp on Corrections vs the repo-wide IsDeleted bool convention. Documented in the task plan and PR description; not converted because the timestamp is more informative and the Data Layer invariant in the architecture model is implicit (no global query filter exists). Worth a sprint-level conversation if we want to standardize.
- Status casing comment now in CorrectionStatus.cs.

## #1152 (Sophy review notes, APPROVE with follow-ups)
- Pre-prompt-service: add a CHECK constraint or service-level guard so Status/Category writes are restricted to the string-constant sets. Today only CorrectionService writes; risk surfaces when the AI service starts pushing values directly. Land before #PROMPT_SERVICE issue.
- Sprint-level decision: pick a soft-delete convention (DeletedAt timestamp vs IsDeleted bool) and either fold Corrections back or migrate the rest. Should not leave both patterns drifting.
