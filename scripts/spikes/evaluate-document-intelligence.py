#!/usr/bin/env python3
"""
Spike script: compare Azure Document Intelligence (Read API) vs Claude Sonnet
for scanned handwritten PDF OCR.

Usage:
    DOCINT_ENDPOINT=https://... DOCINT_KEY=... ANTHROPIC_API_KEY=... \
        python3 evaluate-document-intelligence.py <pdf1> <pdf2> ...

Output:
    evaluation-results.json   -- raw data
    evaluation-report.md      -- human-readable comparison table
"""

import os
import sys
import json
import time
import base64
from pathlib import Path

import anthropic
from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.ai.documentintelligence.models import AnalyzeDocumentRequest
from azure.core.credentials import AzureKeyCredential


CLAUDE_SYSTEM_PROMPT = (
    "Transcribe the handwritten student text in this document. "
    "When text is crossed out and replaced, transcribe only the replacement. Crossed-out words are not part of the final submission. "
    "When text is inserted above, below, or beside a line as a correction, place it at the correct reading position. "
    "Preserve every spelling mistake, grammar error, and accented character exactly as written. Do not correct the student's language. "
    "Output only the transcribed text with no commentary."
)

CLAUDE_MODEL = "claude-sonnet-4-6"
CLAUDE_MAX_TOKENS = 3072


def run_document_intelligence(pdf_bytes: bytes, client: DocumentIntelligenceClient) -> dict:
    start = time.monotonic()
    poller = client.begin_analyze_document(
        "prebuilt-read",
        AnalyzeDocumentRequest(bytes_source=pdf_bytes),
        content_type="application/json",
    )
    result = poller.result()
    latency_ms = int((time.monotonic() - start) * 1000)

    words = []
    strikethrough_words = []
    handwritten_words = []
    all_lines = []

    if result.pages:
        for page in result.pages:
            if page.words:
                for word in page.words:
                    words.append({
                        "text": word.content,
                        "confidence": word.confidence,
                    })
            if page.lines:
                for line in page.lines:
                    all_lines.append(line.content)

    if result.styles:
        for style in result.styles:
            if style.is_handwritten:
                handwritten_words.append(style.spans)

    # Detect strikethrough from paragraphs role
    if result.paragraphs:
        for para in result.paragraphs:
            if hasattr(para, 'role') and para.role == 'strikethrough':
                strikethrough_words.append(para.content)

    extracted_text = result.content or "\n".join(all_lines)

    # Check styles for handwritten flag
    has_handwritten = False
    if result.styles:
        has_handwritten = any(s.is_handwritten for s in result.styles if s.is_handwritten is not None)

    avg_confidence = 0.0
    if words:
        avg_confidence = sum(w["confidence"] for w in words if w["confidence"] is not None) / len(words)

    return {
        "extracted_text": extracted_text,
        "latency_ms": latency_ms,
        "word_count": len(words),
        "avg_word_confidence": round(avg_confidence, 3),
        "has_handwritten_style": has_handwritten,
        "strikethrough_detected": len(strikethrough_words) > 0,
        "strikethrough_spans": strikethrough_words,
        "line_count": len(all_lines),
    }


def run_claude(pdf_bytes: bytes, client: anthropic.Anthropic) -> dict:
    pdf_b64 = base64.standard_b64encode(pdf_bytes).decode("utf-8")
    start = time.monotonic()
    response = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=CLAUDE_MAX_TOKENS,
        temperature=0,
        system=CLAUDE_SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "document",
                        "source": {
                            "type": "base64",
                            "media_type": "application/pdf",
                            "data": pdf_b64,
                        },
                    },
                    {"type": "text", "text": "Transcribe this document."},
                ],
            }
        ],
    )
    latency_ms = int((time.monotonic() - start) * 1000)

    input_tokens = response.usage.input_tokens
    output_tokens = response.usage.output_tokens
    # Claude Sonnet pricing: $3/MTok input, $15/MTok output
    cost_usd = (input_tokens * 3 + output_tokens * 15) / 1_000_000

    return {
        "extracted_text": response.content[0].text,
        "latency_ms": latency_ms,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "cost_usd": round(cost_usd, 6),
    }


def evaluate_pdf(pdf_path: str, di_client: DocumentIntelligenceClient, anthropic_client: anthropic.Anthropic) -> dict:
    print(f"\n--- {pdf_path} ---")
    pdf_bytes = Path(pdf_path).read_bytes()
    file_size_kb = len(pdf_bytes) // 1024

    print(f"  Size: {file_size_kb} KB")
    print(f"  Running Document Intelligence...", flush=True)
    try:
        di_result = run_document_intelligence(pdf_bytes, di_client)
        print(f"  DI done: {di_result['latency_ms']}ms, {di_result['word_count']} words, "
              f"confidence={di_result['avg_word_confidence']:.3f}, handwritten={di_result['has_handwritten_style']}")
    except Exception as e:
        print(f"  DI ERROR: {e}")
        di_result = {"error": str(e)}

    print(f"  Running Claude Sonnet...", flush=True)
    try:
        claude_result = run_claude(pdf_bytes, anthropic_client)
        print(f"  Claude done: {claude_result['latency_ms']}ms, {claude_result['input_tokens']} in / {claude_result['output_tokens']} out tokens, ${claude_result['cost_usd']:.4f}")
    except Exception as e:
        print(f"  Claude ERROR: {e}")
        claude_result = {"error": str(e)}

    return {
        "file": pdf_path,
        "file_size_kb": file_size_kb,
        "document_intelligence": di_result,
        "claude_sonnet": claude_result,
    }


def generate_report(results: list) -> str:
    lines = [
        "# Document Intelligence vs Claude Sonnet -- OCR Evaluation",
        "",
        "## Per-Document Results",
        "",
    ]

    for i, r in enumerate(results, 1):
        fname = Path(r["file"]).name
        di = r["document_intelligence"]
        cl = r["claude_sonnet"]

        lines.append(f"### PDF {i}: `{fname}`")
        lines.append(f"- Size: {r['file_size_kb']} KB")
        lines.append("")

        lines.append("**Document Intelligence:**")
        if "error" in di:
            lines.append(f"- ERROR: {di['error']}")
        else:
            lines.append(f"- Latency: {di['latency_ms']} ms")
            lines.append(f"- Words: {di['word_count']}")
            lines.append(f"- Avg word confidence: {di['avg_word_confidence']:.3f}")
            lines.append(f"- Handwritten flag: {di['has_handwritten_style']}")
            lines.append(f"- Strikethrough detected: {di['strikethrough_detected']}")
            lines.append(f"- Extracted text ({len(di.get('extracted_text',''))} chars):")
            lines.append("```")
            lines.append(di.get("extracted_text", "")[:600])
            lines.append("```")
        lines.append("")

        lines.append("**Claude Sonnet:**")
        if "error" in cl:
            lines.append(f"- ERROR: {cl['error']}")
        else:
            lines.append(f"- Latency: {cl['latency_ms']} ms")
            lines.append(f"- Tokens: {cl['input_tokens']} in / {cl['output_tokens']} out")
            lines.append(f"- Cost per call: ${cl['cost_usd']:.4f}")
            lines.append(f"- Extracted text ({len(cl.get('extracted_text',''))} chars):")
            lines.append("```")
            lines.append(cl.get("extracted_text", "")[:600])
            lines.append("```")
        lines.append("")

    lines.append("## Summary Table")
    lines.append("")
    lines.append("| PDF | DI Latency | DI Confidence | DI Handwritten | Claude Latency | Claude Cost |")
    lines.append("|-----|-----------|---------------|----------------|----------------|-------------|")
    for i, r in enumerate(results, 1):
        di = r["document_intelligence"]
        cl = r["claude_sonnet"]
        di_lat = f"{di.get('latency_ms','ERR')} ms"
        di_conf = f"{di.get('avg_word_confidence','ERR'):.3f}" if "avg_word_confidence" in di else "ERR"
        di_hw = str(di.get("has_handwritten_style", "ERR"))
        cl_lat = f"{cl.get('latency_ms','ERR')} ms"
        cl_cost = f"${cl.get('cost_usd','ERR'):.4f}" if "cost_usd" in cl else "ERR"
        lines.append(f"| {i} | {di_lat} | {di_conf} | {di_hw} | {cl_lat} | {cl_cost} |")

    total_claude_cost = sum(r["claude_sonnet"].get("cost_usd", 0) for r in results)
    lines.append("")
    lines.append(f"**Total Claude cost for {len(results)} PDFs: ${total_claude_cost:.4f}**")

    return "\n".join(lines)


def main():
    if len(sys.argv) < 2:
        print("Usage: evaluate-document-intelligence.py <pdf1> [pdf2 ...]")
        sys.exit(1)

    pdf_paths = sys.argv[1:]

    endpoint = os.environ.get("DOCINT_ENDPOINT")
    key = os.environ.get("DOCINT_KEY")
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY")

    if not endpoint or not key:
        print("ERROR: DOCINT_ENDPOINT and DOCINT_KEY env vars required")
        sys.exit(1)
    if not anthropic_key:
        print("ERROR: ANTHROPIC_API_KEY env var required")
        sys.exit(1)

    di_client = DocumentIntelligenceClient(endpoint, AzureKeyCredential(key))
    anthropic_client = anthropic.Anthropic(api_key=anthropic_key)

    results = []
    for path in pdf_paths:
        if not Path(path).exists():
            print(f"WARNING: {path} not found, skipping")
            continue
        result = evaluate_pdf(path, di_client, anthropic_client)
        results.append(result)

    output_dir = Path("evaluation-output")
    output_dir.mkdir(exist_ok=True)

    json_path = output_dir / "evaluation-results.json"
    json_path.write_text(json.dumps(results, indent=2, ensure_ascii=False))
    print(f"\nRaw results written to {json_path}")

    report = generate_report(results)
    report_path = output_dir / "evaluation-report.md"
    report_path.write_text(report)
    print(f"Report written to {report_path}")

    print("\nDone. Review evaluation-output/evaluation-report.md for comparison.")


if __name__ == "__main__":
    main()
