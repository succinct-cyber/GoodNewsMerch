const COLORS: Record<string, string> = {
  New:          'bg-blue-100 text-blue-700',
  Received:     'bg-blue-100 text-blue-700',
  Processing:   'bg-yellow-100 text-yellow-700',
  Packed:       'bg-orange-100 text-orange-700',
  'With Rider': 'bg-purple-100 text-purple-700',
  'At Park':    'bg-purple-100 text-purple-700',
  Delivered:    'bg-green-100 text-green-700',
  Completed:    'bg-green-100 text-green-700',
  Cancelled:    'bg-red-100 text-red-700',
}

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase
      ${COLORS[status] ?? 'bg-section-bg text-text-muted'}`}>
      {status}
    </span>
  )
}
