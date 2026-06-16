import { Component } from 'react'
import { AlertTriangle, RefreshCw, X } from 'lucide-react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error(`ErrorBoundary${this.props.name ? ` [${this.props.name}]` : ''} caught:`, error, errorInfo.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-6xl mx-auto flex items-center justify-center min-h-[60vh]">
          <div className="card text-center py-12 px-8 max-w-md relative">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-apple-surface transition-colors"
              aria-label="Dismiss error"
            >
              <X size={16} className="text-apple-muted" />
            </button>
            <AlertTriangle size={48} className="mx-auto mb-4 text-apple-amber" />
            <h2 className="text-heading font-semibold mb-2">Something went wrong</h2>
            {this.props.name && <p className="text-small text-apple-muted mb-1">View: {this.props.name}</p>}
            <p className="text-body text-apple-muted mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="btn-ghost text-small"
              >
                Dismiss
              </button>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="btn-primary flex items-center gap-2"
              >
                <RefreshCw size={16} /> Reload page
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
