/**
 * Loading state for Settings page.
 */
export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="h-8 w-32 bg-base-300 rounded"></div>

      {/* Settings Sections Skeleton */}
      {[...Array(4)].map((_, i) => (
        <div key={i} className="card p-4 space-y-4">
          <div className="h-6 w-48 bg-base-300 rounded"></div>
          <div className="space-y-3">
            <div className="h-10 bg-base-300 rounded"></div>
            <div className="h-10 bg-base-300 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  )
}
