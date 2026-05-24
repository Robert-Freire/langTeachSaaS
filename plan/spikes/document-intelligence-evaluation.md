# Azure Document Intelligence OCR Evaluation

**Date:** 2026-05-24
**Spike issue:** #1315
**Verdict: FAIL**

## Executive Summary

Azure Document Intelligence (Read API, prebuilt-read model) was evaluated against Claude Sonnet single-pass on 5 real scanned student PDFs from Jordi's production submissions. DI fails on the two capabilities that motivated this spike: strikethrough detection did not fire on any document (returned False for all 5), and DI cannot separate printed form instructions from handwritten student text. Claude Sonnet produces cleaner, more coherent extractions on messy handwriting. DI's advantages (3-5x faster, 7x cheaper) are not enough to compensate for functional failures on the use cases that matter.

**Recommendation:** Do not replace PdfClaudeExtractor with Document Intelligence at this time. Revisit only if the sister UX issue (#1314 side-by-side review) ships and quality is still reported as inadequate by Jordi.

---

## Test Corpus

All 5 PDFs were pulled from the `corrections` Azure Blob Storage container (`stlangteachdev`). All were 1-page scanned handwriting with no text layer (confirmed via PdfPig: 0 chars extracted).

| PDF | Size | Handwriting style | Notes |
|-----|------|-------------------|-------|
| 1 | 496 KB | Messy | Exercise: describe Toni's day (indefinido) |
| 2 | 496 KB | Messy | Same exercise, different student |
| 3 | 463 KB | Clean | Different exercise, clear handwriting |
| 4 | 496 KB | Messy | Same exercise as 1/2 |
| 5 | 496 KB | Messy | Same exercise as 1/2 |

**Corpus limitation:** This corpus does not contain explicit examples of crossed-out-and-replaced text (strikethrough) or confirmed out-of-line insertions. PDFs 1/2/4/5 are the same exercise sheet submitted by different students; they share the same printed form. PDF 3 is a different exercise. Pencil vs ink and mixed printed+handwritten content were not represented as distinct cases.

---

## Comparison Table

| PDF | DI Latency | DI Confidence | DI Strikethrough | Claude Latency | Claude Cost |
|-----|-----------|---------------|-----------------|----------------|-------------|
| 1 | 2735 ms | 0.757 | False | 13634 ms | $0.0108 |
| 2 | 3578 ms | 0.762 | False | 13169 ms | $0.0108 |
| 3 | 2470 ms | 0.906 | False | 7409 ms | $0.0085 |
| 4 | 3603 ms | 0.757 | False | 13906 ms | $0.0108 |
| 5 | 3573 ms | 0.762 | False | 13568 ms | $0.0108 |
| **Avg** | **3192 ms** | **0.789** | **0/5** | **12337 ms** | **$0.0103** |

---

## Finding 1: Strikethrough Detection -- FAIL

DI returned `strikethrough_detected: False` for all 5 documents. The Read API exposes a `Strikethrough` style flag per word, but it did not trigger on any content across 5 real documents.

This was the primary motivation for the spike ("filter strikethrough words deterministically in code instead of asking an LLM"). The capability does not function on these documents. Without confirmed examples of crossed-out text in the corpus we cannot rule out that it would work on those specific cases, but across 5 real production submissions the flag never fired.

**Verdict:** Strikethrough detection is not operationally reliable on this corpus.

---

## Finding 2: Form Text Separation -- FAIL

DI includes all printed text (form instructions, exercise headers) in its output alongside handwritten student text. It cannot distinguish between them.

**DI output for PDFs 1/2/4/5 (first 2 lines):**
```
No olvides usar conectores, marcadores temporales y nacer puntuación.
(100 palabras)
```

This is the printed form instruction. DI reads it as part of the document. Claude correctly ignores the printed header and extracts only the handwritten student submission.

For the correction pipeline, including form instructions in the extracted text corrupts what is sent to the correction service -- the teacher's printed prompt would be presented as student writing and trigger false corrections.

Note that DI also misread "hacer puntuación" as "nacer puntuación" -- a low-confidence OCR error on printed text, not handwriting.

**Verdict:** DI is not usable as a drop-in replacement without a post-processing step to strip printed content, which requires knowing the form structure in advance.

---

## Finding 3: Messy Handwriting Quality -- INFERIOR to Claude

On PDFs 1/2/4/5 (confidence ~0.757), DI produces garbled output:

**DI (PDF 1, same region):**
```
se q les de la tarde. despertarsó 4 Colunade de schiene Con cito desade
```

**Claude (PDF 1, same region):**
```
se despertarsó a las 4 de la tarde. Es un constante y de estar tiene un ritmo de vida
```

Claude produces more coherent text. It reads "a las 4 de la tarde" correctly from context. DI generates character-level noise ("Colunade de schiene Con cito desade") that indicates failed OCR on messy handwriting.

DI also introduced phantom uppercase text ("MAMMAMIA") that does not appear in Claude's output and is likely a confabulation from low-confidence character detection.

---

## Finding 4: Clean Handwriting -- COMPARABLE but DI truncates

On PDF 3 (confidence 0.906), both extractors produce similar quality:

**DI (PDF 3):**
```
Ayer fue un día muy intenso para Toni. Primero, Se despertó temprano porque tuvo muchos cosas que hacer. Despues, hizo ejercicio y fue a una cafetería, donde pedío un café.
```

**Claude (PDF 3):**
```
Ayer fue un día muy intenso para Toni. Primero, Se despertó temprano porque tuvo muchos cosas que hacer. Despues, hizo ejercicio y fue a una cafetería, donde pedío un café.
```

Nearly identical. However, DI output is 899 chars vs Claude's 670 chars -- DI includes the printed form header (229 extra chars) that Claude strips. Discounting the header, Claude's handwritten text extraction is more complete (670 chars vs ~670 chars of handwriting from DI).

---

## Finding 5: Latency and Cost

**Latency:** DI is 3-5x faster (avg 3.2 sec vs 12.3 sec). This matters for UX but both are below the current 30-second timeout.

**Cost:**
- DI F0: first 500 pages/month free. At current volume (5 PDFs total in production to date), cost is zero.
- DI S0: $1.50/1000 pages = $0.0015/page.
- Claude Sonnet: avg $0.0103/call (including image token encoding). ~7x more expensive than S0 DI.

At projected volume (Jordi has ~30 students, weekly exercises, ~52 weeks = ~1560 pages/year), DI S0 would cost ~$2.34/year vs Claude at ~$16/year. The cost difference is not material at this scale.

---

## Cost Projection at Expected Volume

| Scenario | PDFs/month | DI S0 cost/month | Claude cost/month |
|----------|-----------|-----------------|------------------|
| Current (Jordi, 1 teacher) | ~30 | $0.045 | $0.31 |
| 10 teachers | ~300 | $0.45 | $3.10 |
| 100 teachers | ~3000 | $4.50 | $31.00 |

Cost difference is not a deciding factor at current or near-term scale.

---

## Conditions for Revisiting

DI could become viable if:

1. **Strikethrough API improves:** Microsoft improves strikethrough detection accuracy in a future API version. The capability exists in the SDK but does not fire reliably in practice.
2. **Form template known:** If we know the exercise template structure (printed vs handwriting regions), we can filter DI output. This requires template registration per exercise, which is a significant engineering investment.
3. **Quality still inadequate after #1314:** The side-by-side scan and text review (#1314) gives teachers a way to see and correct the extracted text. If Jordi reports that auto-extraction quality is still causing unacceptable correction errors after #1314 ships, DI could be re-evaluated with explicit strikethrough test documents.

---

## Implementation Sketch (if GO -- not recommended now)

If a future evaluation reverses this verdict, the integration point is straightforward:

```csharp
// New class implementing ITextExtractor
public class AzureDocumentIntelligenceExtractor : ITextExtractor
{
    public bool CanHandle(string contentType) =>
        contentType == "application/pdf";  // only scanned PDFs reach this extractor

    public async Task<string> ExtractTextAsync(Stream stream, string contentType, CancellationToken ct)
    {
        // 1. Call prebuilt-read model
        // 2. Filter words with IsHandwritten=false (removes printed form instructions)
        // 3. Remove words with Strikethrough=true
        // 4. Reorder out-of-line insertions by bounding box Y coordinate
        // 5. Return joined text
    }
}
```

Register in Program.cs between `PdfTextExtractor` (line 261) and `PdfClaudeExtractor` (line 262). Add `AzureDocumentIntelligence:Endpoint` and `:Key` to appsettings, Key Vault, and all docker-compose files (per #1284 gate).

---

## Resource Cleanup

The `langteach-docint-spike` (FormRecognizer, F0, northeurope) resource was provisioned for this evaluation. **Delete it after this PR merges:**

```bash
az cognitiveservices account delete \
  --name langteach-docint-spike \
  --resource-group rg-langteach-dev \
  --yes
```

---

## Spike Artifacts

- Evaluation script: `scripts/spikes/evaluate-document-intelligence.py`
- Raw results: produced by the script as `evaluation-output/evaluation-results.json` (local only, not committed -- contains student writing)
- Human report: produced by the script as `evaluation-output/evaluation-report.md` (local only)
