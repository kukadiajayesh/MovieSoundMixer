import React from 'react'

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Renderer crashed:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="empty" style={{ height: '100vh' }}>
          <p className="title">Something went wrong</p>
          <p className="sub mono" style={{ wordBreak: 'break-word' }}>
            {this.state.error.message}
          </p>
          <button className="btn" style={{ marginTop: 16 }} onClick={() => window.location.reload()}>
            Reload app
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
