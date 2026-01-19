/**
 * Global loading state for the main page.
 * Shows a skeleton UI while the page is loading.
 */
export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* App Branding Skeleton */}
      <div className="text-center space-y-2 py-4">
        <div className="h-9 w-48 bg-base-300 rounded mx-auto"></div>
        <div className="h-6 w-64 bg-base-300 rounded mx-auto"></div>
      </div>

      {/* Date Navigation Skeleton */}
      <div className="flex justify-center gap-2">
        <div className="h-10 w-10 bg-base-300 rounded"></div>
        <div className="h-10 w-32 bg-base-300 rounded"></div>
        <div className="h-10 w-10 bg-base-300 rounded"></div>
      </div>

      {/* Calendar Skeleton */}
      <div className="card p-4">
        <div className="h-64 bg-base-300 rounded"></div>
      </div>

      {/* Content Sections Skeleton */}
      <div className="card p-4 space-y-4">
        <div className="h-6 w-32 bg-base-300 rounded"></div>
        <div className="h-24 bg-base-300 rounded"></div>
      </div>

      <div className="card p-4 space-y-4">
        <div className="h-6 w-48 bg-base-300 rounded"></div>
        <div className="h-32 bg-base-300 rounded"></div>
      </div>
    </div>
  )
}
