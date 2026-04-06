import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getTelegramStatus, generateConnectCode, deleteTelegramLink } from '@/api/telegram'
import { logger } from '@/lib/logger'

const POLL_INTERVAL_MS = 3000
const POLL_TIMEOUT_MS = 5 * 60 * 1000
const BOT_HANDLE = import.meta.env.VITE_TELEGRAM_BOT_HANDLE ?? '@LangTeachBot'

export function TelegramCard() {
  const queryClient = useQueryClient()
  const [connectCode, setConnectCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [pollingTimedOut, setPollingTimedOut] = useState(false)
  const pollingStartRef = useRef<number | null>(null)
  const pollingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['telegram-status'],
    queryFn: getTelegramStatus,
    refetchInterval: () => {
      if (connectCode === null) return false
      if (pollingStartRef.current === null) return false
      if (Date.now() - pollingStartRef.current > POLL_TIMEOUT_MS) {
        return false
      }
      return POLL_INTERVAL_MS
    },
    refetchOnWindowFocus: false,
  })

  // Clear the polling timeout on unmount to prevent state updates on unmounted component
  useEffect(() => () => {
    if (pollingTimeoutRef.current !== null) {
      clearTimeout(pollingTimeoutRef.current)
    }
  }, [])

  const generate = useMutation({
    mutationFn: generateConnectCode,
    onSuccess: (data) => {
      setConnectCode(data.code)
      setPollingTimedOut(false)
      pollingStartRef.current = Date.now()
      pollingTimeoutRef.current = setTimeout(() => setPollingTimedOut(true), POLL_TIMEOUT_MS)
      queryClient.invalidateQueries({ queryKey: ['telegram-status'] })
      logger.info('TelegramCard', 'connect code generated')
    },
    onError: (err) => logger.error('TelegramCard', 'generate connect code failed', err),
  })

  const disconnect = useMutation({
    mutationFn: deleteTelegramLink,
    onSuccess: () => {
      clearPendingState()
      queryClient.invalidateQueries({ queryKey: ['telegram-status'] })
      logger.info('TelegramCard', 'telegram link removed')
    },
    onError: (err) => logger.error('TelegramCard', 'disconnect failed', err),
  })

  function clearPendingState() {
    setConnectCode(null)
    setPollingTimedOut(false)
    pollingStartRef.current = null
    if (pollingTimeoutRef.current !== null) {
      clearTimeout(pollingTimeoutRef.current)
      pollingTimeoutRef.current = null
    }
  }

  async function handleCopy() {
    if (!connectCode) return
    try {
      await navigator.clipboard.writeText(`/connect ${connectCode}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard not available in test env — ignore
    }
  }

  if (statusLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-500" data-testid="telegram-loading">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </div>
    )
  }

  // State C: connected — check before connectCode so that when bot confirms the link
  // while the pending card is shown, the UI immediately transitions to connected state.
  if (status?.connected) {
    const linkedDate = status.linkedAt
      ? new Date(status.linkedAt).toLocaleDateString()
      : null

    return (
      <div className="space-y-2" data-testid="telegram-connected">
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Connected</Badge>
          {linkedDate && (
            <span className="text-sm text-zinc-500">Linked on {linkedDate}</span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => disconnect.mutate()}
          disabled={disconnect.isPending}
          data-testid="telegram-disconnect-btn"
        >
          {disconnect.isPending ? 'Disconnecting...' : 'Disconnect'}
        </Button>
        {disconnect.isError && (
          <p className="text-sm text-red-600">Disconnect failed. Please try again.</p>
        )}
      </div>
    )
  }

  // State B: pending — code generated, waiting for bot confirmation
  if (connectCode) {
    return (
      <div className="space-y-3" data-testid="telegram-pending">
        <p className="text-sm text-zinc-700">
          Open Telegram, find <span className="font-mono font-semibold">{BOT_HANDLE}</span>, and send:
        </p>
        <div className="flex items-center gap-2">
          <code
            className="rounded bg-zinc-100 px-3 py-1.5 font-mono text-lg font-semibold tracking-widest text-zinc-900"
            data-testid="telegram-code"
          >
            /connect {connectCode}
          </code>
          <Button variant="ghost" size="icon" onClick={handleCopy} aria-label="Copy command">
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        {pollingTimedOut ? (
          <p className="text-sm text-amber-600">
            Timed out. Please try again.
          </p>
        ) : (
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Waiting for confirmation...
          </div>
        )}
        <Button variant="outline" size="sm" onClick={clearPendingState} data-testid="telegram-cancel-btn">
          Cancel
        </Button>
      </div>
    )
  }

  // State A: idle — not connected
  return (
    <div className="space-y-2" data-testid="telegram-idle">
      <p className="text-sm text-zinc-500">
        Connect your Telegram account to receive lesson reminders and interact with the bot.
      </p>
      <Button
        size="sm"
        onClick={() => generate.mutate()}
        disabled={generate.isPending}
        className="bg-indigo-600 hover:bg-indigo-700"
        data-testid="telegram-connect-btn"
      >
        {generate.isPending ? 'Generating...' : 'Connect Telegram'}
      </Button>
      {generate.isError && (
        <p className="text-sm text-red-600">Failed to generate code. Please try again.</p>
      )}
    </div>
  )
}
