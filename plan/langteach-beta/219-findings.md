# Incident #217 — Review Process Gap: Findings

**Date:** 2026-03-22
**Incident:** `AzureBlobStorage--ConnectionString` absent from Key Vault caused API `ActivationFailed` on every new revision. Resolved manually by provisioning the secret.
**Related issues:** #217 (incident), #219 (this investigation), #220 (startup validation), #221 (PR template), #223 (CI secret validation), #224 (auto-rollback + alerting)

---

## Summary

Four prevention/mitigation angles were investigated. Two are implemented. Two are tracked as follow-up issues with a decision to defer to Phase 2B (Production Readiness sprint).

---

## Angle 1 — Code: startup null guard + config validation

**Status: IMPLEMENTED via #220**

`Program.cs` now registers a `StartupConfigValidator` that is invoked after Key Vault loads. It checks all five required config keys are present and throws a descriptive `InvalidOperationException` naming the missing key before the DI container is built. `BlobServiceClient` also has an explicit null guard with a clear error message.

Before this fix, the first indication of a missing secret was a generic `ArgumentNullException` deep in the stack. Now the container fails fast with: _"Required configuration key 'X' is missing. Ensure it is provisioned in Key Vault."_

**Conclusion:** This makes silent crashes impossible for the covered keys. Any future key addition must also be registered in `StartupConfigValidator` (enforced by the PR template checklist in #221).

---

## Angle 2 — Review process: PR template checklist

**Status: IMPLEMENTED via #221**

`.github/PULL_REQUEST_TEMPLATE.md` now includes a "Config & Infrastructure" section. Every PR author is prompted to confirm:
- New secrets added to Key Vault (not just code)
- New env vars added to Bicep
- New infrastructure resources are templated

This is a lightweight, zero-infrastructure guardrail. It does not prevent a mistake, but it surfaces the question at the right time (review). The PR that introduced `BlobStorageService` (#148) would have surfaced the missing secret if this checklist had existed.

**Conclusion:** Not foolproof (author can ignore), but combined with #220 it adds a second check point.

---

## Angle 3 — CI: secret existence validation before deploy

**Status: DEFERRED — tracked in #223 (P2:should)**

A CI step could read a `infra/required-secrets.json` manifest and call `az keyvault secret show` for each entry before deploying the container. This would fail the pipeline before a broken revision reaches Azure.

**Why deferred:**
- Requires the CI identity (OIDC) to have `Key Vault Secrets User` or `Key Vault Reader` on the production vault. OIDC is already set up for ACR but scope expansion needs care.
- Adds pipeline time on every deploy. Worth it at Phase 2B scale, overkill during rapid iteration.
- #220 already provides a fast-fail at container startup; the net improvement from CI-level validation is reducing "broken revision deployed" to zero rather than "broken revision fails in under 1 second." Good to have, not urgent.

**Planned for:** Phase 2B (Production Readiness milestone).

---

## Angle 4 — Azure runtime: auto-rollback + ActivationFailed alerting

**Status: DEFERRED — tracked in #224 (P2:should)**

Two sub-items:

**A. Auto-rollback:** Azure Container Apps supports multiple active revisions with traffic splitting. When a new revision fails health checks, traffic can be automatically returned to the previous healthy revision. This requires switching from single-revision mode to multiple-revision mode and configuring a health probe.

**Why deferred:** Multiple-revision mode changes how deploys work (traffic weights instead of immediate cutover). Needs design work to avoid unintended side-effects on the current CD pipeline. Useful for production hardening, not urgent while team size = 1.

**B. ActivationFailed alerting:** An Azure Monitor alert rule on the `ContainerAppSystemLogs` table can fire when `Reason_s = 'ActivationFailed'`. Alert can target email or a GitHub repository dispatch event.

**Why deferred:** This only reduces detection time (from "user reports 404" to "alert fires"). With #220 in place, new deployments fail in under a second with a descriptive log. Robert can check portal or recent deploy status directly. An alerting system adds value at scale or when the app has external users, not today.

**Planned for:** Phase 2B alongside CI validation.

---

## Overall assessment

The #217 incident exposed a gap in the "new dependency" workflow. The two implemented fixes address it at the most impactful layers:

1. Code catches the missing key at startup with a clear message (operational).
2. PR template surfaces the question to the reviewer at review time (process).

The two deferred items add depth-in-defense but require non-trivial infrastructure changes. Both are tracked and prioritized for Phase 2B.

No further action needed to close #219.
