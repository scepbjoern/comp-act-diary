"use client"
import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Route error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card bg-error text-error-content max-w-md w-full">
        <div className="card-body">
          <h2 className="card-title">Ein Fehler ist aufgetreten</h2>
          <p>Beim Laden dieser Seite ist ein Fehler aufgetreten.</p>
          
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4">
              <summary className="cursor-pointer font-semibold">
                Fehlerdetails (nur in Development)
              </summary>
              <pre className="mt-2 text-xs overflow-auto bg-base-300 p-2 rounded max-h-64">
                {error.message}
                {error.digest && `\nDigest: ${error.digest}`}
                {'\n\n'}
                {error.stack}
              </pre>
            </details>
          )}
          
          <div className="card-actions justify-end mt-4">
            <button
              className="btn btn-outline"
              onClick={() => window.location.href = '/'}
            >
              Zur Startseite
            </button>
            <button
              className="btn btn-primary"
              onClick={reset}
            >
              Erneut versuchen
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
