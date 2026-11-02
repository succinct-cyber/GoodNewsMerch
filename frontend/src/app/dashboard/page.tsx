'use client'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { FaShoppingBag, FaCheckCircle, FaClock } from 'react-icons/fa'
import api from '@/lib/api'
import { useAuth } from '@/store/auth'
import { DashboardData } from '@/types'
import StatusBadge from '@/components/ui/StatusBadge'

const fmt = (n: number) => `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`

export default function DashboardPage() {
  const { user } = useAuth()
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard/').then(r => r.data),
  })

  const stats = [
    { icon: FaShoppingBag, label: 'TOTAL ORDERS', value: data?.order_count ?? 0 },
    { icon: FaCheckCircle, label: 'COMPLETED',    value: data?.completed_count ?? 0 },
    { icon: FaClock,       label: 'PENDING',      value: data?.pending_count ?? 0 },
  ]

  return (
    <>
      <h1 className="text-[22px] md:text-[24px] font-bold tracking-[0.15em] uppercase">Dashboard</h1>
      <p className="text-[14px] text-text-muted mt-1 mb-6">
        Welcome back, <strong className="text-text">{user?.first_name}</strong>.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-8">
        {stats.map(s => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-border p-4 md:p-5 flex items-center gap-4">
            <div className="w-11 h-11 bg-section-bg flex items-center justify-center text-text-sub flex-shrink-0">
              <s.icon size={17} />
            </div>
            <div>
              <p className="text-[11px] text-text-muted uppercase tracking-wide">{s.label}</p>
              <p className="text-[24px] font-bold leading-tight">{isLoading ? '–' : s.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <h2 className="text-[13px] font-bold tracking-[0.15em] uppercase pb-3 mb-1 border-b border-border">
        Recent Orders
      </h2>

      {isLoading ? (
        <div className="space-y-3 pt-3">{[1, 2].map(i => <div key={i} className="h-12 bg-card-bg animate-pulse" />)}</div>
      ) : !data?.recent.length ? (
        <div className="text-center py-10 text-text-muted">
          <p className="font-semibold text-text mb-1">No orders yet.</p>
          <p className="text-[13px] mb-5">When you place an order it will show up here.</p>
          <Link href="/shop" className="inline-block bg-black text-white px-7 py-3 text-[12px] font-bold tracking-[0.15em] uppercase">
            Shop now
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                {['ORDER #', 'DATE', 'TOTAL', 'STATUS', ''].map(h => (
                  <th key={h} className="text-[10px] font-bold tracking-[0.1em] text-text-muted py-3 px-3 text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.recent.map(o => (
                <tr key={o.id} className="border-b border-border hover:bg-page-bg transition-colors">
                  <td className="py-3.5 px-3 text-[13px] font-semibold font-mono">{o.order_number}</td>
                  <td className="py-3.5 px-3 text-[13px] text-text-body whitespace-nowrap">
                    {new Date(o.created_at).toLocaleDateString('en-NG', { dateStyle: 'medium' })}
                  </td>
                  <td className="py-3.5 px-3 text-[13px] font-semibold whitespace-nowrap">{fmt(o.order_total)}</td>
                  <td className="py-3.5 px-3"><StatusBadge status={o.status} /></td>
                  <td className="py-3.5 px-3 text-right whitespace-nowrap">
                    <Link href={`/dashboard/orders/${o.order_number}`} className="text-[12px] font-semibold hover:opacity-70">Details →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pt-4 text-right">
            <Link href="/dashboard/orders" className="text-[12px] font-semibold text-text-muted hover:text-text uppercase tracking-wide">
              View all orders →
            </Link>
          </div>
        </div>
      )}
    </>
  )
}
