'use client'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import api, { unwrap } from '@/lib/api'
import { Order } from '@/types'
import StatusBadge from '@/components/ui/StatusBadge'

const fmt = (n: number) => `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`

export default function OrdersPage() {
  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['orders'],
    queryFn: () => api.get('/orders/').then(r => unwrap<Order>(r.data)),
  })

  return (
    <>
      <h1 className="text-[22px] md:text-[24px] font-bold tracking-[0.15em] uppercase mb-5">My Orders</h1>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-12 bg-card-bg animate-pulse" />)}</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          <p className="font-semibold text-text mb-1">No orders yet.</p>
          <Link href="/shop" className="mt-4 inline-block bg-black text-white px-7 py-3 text-[12px] font-bold tracking-[0.15em] uppercase">
            Shop now
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                {['ORDER #', 'DATE', 'ITEMS', 'TOTAL', 'STATUS', ''].map(h => (
                  <th key={h} className="text-[10px] font-bold tracking-[0.1em] text-text-muted py-3 px-3 text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} className="border-b border-border hover:bg-page-bg transition-colors">
                  <td className="py-3.5 px-3 text-[13px] font-semibold font-mono">{o.order_number}</td>
                  <td className="py-3.5 px-3 text-[13px] text-text-body whitespace-nowrap">
                    {new Date(o.created_at).toLocaleDateString('en-NG', { dateStyle: 'medium' })}
                  </td>
                  <td className="py-3.5 px-3 text-[13px]">{o.products.reduce((n, p) => n + p.quantity, 0)}</td>
                  <td className="py-3.5 px-3 text-[13px] font-semibold whitespace-nowrap">{fmt(o.order_total)}</td>
                  <td className="py-3.5 px-3"><StatusBadge status={o.status} /></td>
                  <td className="py-3.5 px-3 text-right whitespace-nowrap">
                    <Link href={`/dashboard/orders/${o.order_number}`} className="text-[12px] font-semibold hover:opacity-70">Details →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
