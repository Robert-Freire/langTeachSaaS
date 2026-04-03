import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { TopicTag } from '../../api/sessionLogs'

const CATEGORIES = [
  { value: 'grammar', label: 'Grammar' },
  { value: 'vocabulary', label: 'Vocabulary' },
  { value: 'competency', label: 'Competency' },
  { value: 'communicativeFunction', label: 'Communicative function' },
]

interface TopicTagsInputProps {
  value: TopicTag[]
  onChange: (tags: TopicTag[]) => void
}

export function TopicTagsInput({ value, onChange }: TopicTagsInputProps) {
  const [tagName, setTagName] = useState('')
  const [category, setCategory] = useState<string>('')

  function handleAdd() {
    const trimmed = tagName.trim()
    if (!trimmed) return
    const newTag: TopicTag = { tag: trimmed }
    if (category) newTag.category = category
    onChange([...value, newTag])
    setTagName('')
    setCategory('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  function handleRemove(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2" data-testid="topic-tags-input">
      <div className="flex gap-2">
        <Input
          value={tagName}
          onChange={(e) => setTagName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a topic tag..."
          className="flex-1 text-sm"
          data-testid="topic-tag-name"
        />
        <Select value={category} onValueChange={(v) => setCategory(v ?? '')}>
          <SelectTrigger className="w-44 text-sm" data-testid="topic-tag-category">
            <SelectValue placeholder="Category (optional)" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={!tagName.trim()}
          data-testid="topic-tag-add"
        >
          Add
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag, i) => (
            <Badge
              key={i}
              variant="outline"
              className="text-xs gap-1 pr-1"
            >
              {tag.tag}
              {tag.category && (
                <span className="text-zinc-400">({CATEGORIES.find(c => c.value === tag.category)?.label ?? tag.category})</span>
              )}
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="ml-0.5 text-zinc-400 hover:text-zinc-700"
                aria-label={`Remove tag ${tag.tag}`}
                data-testid={`topic-tag-remove-${i}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
