export default function StarRating({ rating, count }: { rating: number; count?: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(i => (
        <span key={i} className="text-accent text-sm">
          {i <= rating ? '★' : i - 0.5 <= rating ? '⯨' : '☆'}
        </span>
      ))}
      {count !== undefined && (
        <span className="text-[12px] text-text-muted ml-1">({count})</span>
      )}
    </div>
  )
}
