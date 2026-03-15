import { Component, type ReactNode, type ErrorInfo } from 'react'
import { logger } from '../../lib/logger'

interface Props {
  blockType?: string
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ContentErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error('ContentErrorBoundary', 'render error in content block', {
      blockType: this.props.blockType,
      error: error.message,
      componentStack: info.componentStack,
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs text-amber-700">
            This content block could not be rendered.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-1 text-xs text-amber-600 underline hover:text-amber-800"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
