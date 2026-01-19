/**
 * Loading state for Reflections page.
 */
export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center">
        <div className="h-8 w-40 bg-base-300 rounded"></div>
        <div className="h-10 w-36 bg-base-300 rounded"></div>
      </div>

      {/* Reflection Cards Skeleton */}
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card p-4 space-y-3">
            <div className="flex justify-between">
              <div className="h-5 w-32 bg-base-300 rounded"></div>
              <div className="h-5 w-24 bg-base-300 rounded"></div>
            </div>
            <div className="h-20 bg-base-300 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  )
}
