/**
 * Loading state for PRM (Personal Relationship Management) pages.
 */
export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center">
        <div className="h-8 w-48 bg-base-300 rounded"></div>
        <div className="h-10 w-32 bg-base-300 rounded"></div>
      </div>

      {/* Search Skeleton */}
      <div className="h-12 bg-base-300 rounded"></div>

      {/* Contact Cards Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="card p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-base-300 rounded-full"></div>
              <div className="space-y-2 flex-1">
                <div className="h-5 w-32 bg-base-300 rounded"></div>
                <div className="h-4 w-24 bg-base-300 rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
