import { Fragment } from 'react'
import type { CorrectionTagDto } from '@/types/correction'
import { TaggedSpan } from './TaggedSpan'

interface MarkedUpTextProps {
  studentText: string
  tags: CorrectionTagDto[]
}

interface AcceptedTag {
  tag: CorrectionTagDto
  index: number
}

interface SegmentResult {
  accepted: AcceptedTag[]
  footnotes: CorrectionTagDto[]
}

function partitionTags(text: string, tags: CorrectionTagDto[]): SegmentResult {
  const accepted: AcceptedTag[] = []
  const footnotes: CorrectionTagDto[] = []
  const sorted = [...tags].sort((a, b) => a.startIndex - b.startIndex)
  let cursor = 0
  for (const tag of sorted) {
    const inBounds =
      Number.isFinite(tag.startIndex) &&
      Number.isFinite(tag.endIndex) &&
      tag.startIndex >= 0 &&
      tag.endIndex <= text.length &&
      tag.startIndex < tag.endIndex
    if (!inBounds) {
      console.warn('Dropping correction tag with invalid indices', tag)
      continue
    }
    if (tag.startIndex < cursor) {
      console.warn('Overlapping correction tag rendered as footnote', tag)
      footnotes.push(tag)
      continue
    }
    accepted.push({ tag, index: accepted.length })
    cursor = tag.endIndex
  }
  return { accepted, footnotes }
}

interface Piece {
  kind: 'text' | 'tag'
  text: string
  tag?: CorrectionTagDto
  key: string
}

function buildPieces(text: string, accepted: AcceptedTag[]): Piece[] {
  const pieces: Piece[] = []
  let cursor = 0
  for (const { tag, index } of accepted) {
    if (tag.startIndex > cursor) {
      pieces.push({
        kind: 'text',
        text: text.slice(cursor, tag.startIndex),
        key: `text-${cursor}`,
      })
    }
    pieces.push({
      kind: 'tag',
      text: text.slice(tag.startIndex, tag.endIndex),
      tag,
      key: `tag-${index}-${tag.startIndex}`,
    })
    cursor = tag.endIndex
  }
  if (cursor < text.length) {
    pieces.push({
      kind: 'text',
      text: text.slice(cursor),
      key: `text-${cursor}`,
    })
  }
  return pieces
}

function renderPiece(piece: Piece) {
  if (piece.kind === 'text') {
    return <Fragment key={piece.key}>{renderTextWithBreaks(piece.text, piece.key)}</Fragment>
  }
  const tag = piece.tag!
  if (tag.category === 'MuyBien') {
    return <strong key={piece.key} className="font-semibold text-zinc-900">{piece.text}</strong>
  }
  return <TaggedSpan key={piece.key} tag={tag} text={piece.text} />

}

function renderTextWithBreaks(text: string, keyPrefix: string) {
  const paragraphs = text.split(/\n{2,}/)
  return paragraphs.map((para, i) => (
    <Fragment key={`${keyPrefix}-p${i}`}>
      {i > 0 && (
        <>
          <br />
          <br />
        </>
      )}
      {para.split('\n').map((line, j, arr) => (
        <Fragment key={`${keyPrefix}-p${i}-l${j}`}>
          {line}
          {j < arr.length - 1 && <br />}
        </Fragment>
      ))}
    </Fragment>
  ))
}

export function MarkedUpText({ studentText, tags }: MarkedUpTextProps) {
  const { accepted, footnotes } = partitionTags(studentText, tags)
  const pieces = buildPieces(studentText, accepted)
  return (
    <div data-testid="marked-up-text" className="prose prose-zinc max-w-prose text-base leading-relaxed text-zinc-800">
      <p className="whitespace-pre-wrap">{pieces.map(renderPiece)}</p>
      {footnotes.length > 0 && (
        <aside className="mt-6 border-t pt-4 text-sm">
          <p className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-zinc-500">
            Notas adicionales
          </p>
          <ul className="space-y-2">
            {footnotes.map((tag, i) => (
              <li key={`footnote-${i}-${tag.startIndex}`} className="text-zinc-700">
                <span className="font-medium">"{tag.spannedText}"</span>
                {tag.explanation ? `, ${tag.explanation}` : ''}
                {tag.correctedForm ? ` (${tag.correctedForm})` : ''}
              </li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  )
}
