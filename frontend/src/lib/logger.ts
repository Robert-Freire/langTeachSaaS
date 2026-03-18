type Level = 'debug' | 'info' | 'warn' | 'error'

const isDev = import.meta.env.DEV

function log(level: Level, context: string, message: string, data?: unknown) {
  if (!isDev && level === 'debug') return
  const prefix = `[${new Date().toISOString()}] [${level.toUpperCase()}] [${context}]`
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
  if (data !== undefined) {
    fn(prefix, message, data)
  } else {
    fn(prefix, message)
  }
}

export const logger = {
  debug: (ctx: string, msg: string, data?: unknown) => log('debug', ctx, msg, data),
  info:  (ctx: string, msg: string, data?: unknown) => log('info',  ctx, msg, data),
  warn:  (ctx: string, msg: string, data?: unknown) => log('warn',  ctx, msg, data),
  error: (ctx: string, msg: string, data?: unknown) => log('error', ctx, msg, data),
}
