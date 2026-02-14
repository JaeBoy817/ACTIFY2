export default function AppLoading() {
  return (
    <div className="space-y-6">
      <div className="glass-dense rounded-3xl p-6">
        <div className="glass-content space-y-3">
          <div className="skeleton shimmer h-6 w-48 rounded-md" />
          <div className="skeleton shimmer h-4 w-80 rounded-md" />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="skeleton shimmer h-12 rounded-lg" />
            <div className="skeleton shimmer h-12 rounded-lg" />
            <div className="skeleton shimmer h-12 rounded-lg" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="glass-dense rounded-2xl p-5">
            <div className="glass-content space-y-2">
              <div className="skeleton shimmer h-3 w-20 rounded" />
              <div className="skeleton shimmer h-8 w-16 rounded" />
              <div className="skeleton shimmer h-3 w-28 rounded" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-dense rounded-2xl p-5">
          <div className="glass-content space-y-2">
            <div className="skeleton shimmer h-5 w-36 rounded" />
            <div className="skeleton shimmer h-9 rounded-md" />
            <div className="skeleton shimmer h-9 rounded-md" />
            <div className="skeleton shimmer h-9 rounded-md" />
          </div>
        </div>
        <div className="glass-dense rounded-2xl p-5">
          <div className="glass-content space-y-2">
            <div className="skeleton shimmer h-5 w-36 rounded" />
            <div className="skeleton shimmer h-9 rounded-md" />
            <div className="skeleton shimmer h-9 rounded-md" />
            <div className="skeleton shimmer h-9 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
