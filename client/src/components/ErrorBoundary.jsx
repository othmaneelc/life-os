import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-6xl mx-auto flex items-center justify-center min-h-[60vh]">
          <div className="card text-center py-12 px-8 max-w-md">
            <AlertTriangle size={48} className="mx-auto mb-4 text-apple-amber" />
            <h2 className="text-heading font-semibold mb-2">Something went wrong</h2>
            <p className="text-body text-apple-muted mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
              className="btn-primary flex items-center gap-2 mx-auto"
            >
              <RefreshCw size={16} /> Reload
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
