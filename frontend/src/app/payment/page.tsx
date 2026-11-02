'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ShieldCheck } from 'lucide-react'
import Button from '@/components/ui/Button'
import api from '@/lib/api'
import { useCart } from '@/store/cart'

declare global {
  interface Window { FlutterwaveCheckout: any; closePaymentModal?: (wait?: number) => void }
}

const fmt = (n: number) =>
  `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`

export default function PaymentPage() {
  const router    = useRouter()
  const { fetchCart } = useCart()
  const [order,   setOrder]   = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [paidTx,  setPaidTx]   = useState<string | null>(null)   // charged, but not confirmed by us yet
  const finishing = useRef(false)                                  // callback + redirect must not both run

  useEffect(() => {
    const raw = sessionStorage.getItem('pending_order')
    if (!raw) { router.replace('/cart'); return }
    setOrder(JSON.parse(raw))

    // Load Flutterwave script
    const s   = document.createElement('script')
    s.src     = 'https://checkout.flutterwave.com/v3.js'
    s.async   = true
    document.body.appendChild(s)
    return () => { document.body.removeChild(s) }
  }, [])

  /** Confirm a transaction with our API, then leave with a FULL page load. */
  const finalize = async (transactionId: string) => {
    if (finishing.current) return
    finishing.current = true
    setPaidTx(transactionId)
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/orders/verify/flutterwave/', {
        orderID: order.order_number,
        transID: transactionId,
      })
      if (data.status !== 'success') throw new Error('not confirmed')
      sessionStorage.removeItem('pending_order')
      // A hard navigation tears down Flutterwave's injected overlay completely.
      // router.push() leaves it sitting on top of the next page.
      window.location.assign(
        `/order-complete?order_number=${data.order_number}&payment_id=${data.payment_id}`
      )
    } catch (e: any) {
      finishing.current = false
      setLoading(false)
      setError(e?.response?.data?.error ||
        "Your payment went through, but we couldn't confirm it yet. Please don't pay again.")
    }
  }

  const payWithFlutterwave = () => {
    if (!window.FlutterwaveCheckout || !order) return
    window.FlutterwaveCheckout({
      public_key: process.env.NEXT_PUBLIC_FLUTTERWAVE_KEY,
      tx_ref:     `${order.order_number}_${Date.now()}`,
      amount:     Number(order.grand_total),
      currency:   'NGN',
      payment_options: 'card, banktransfer, ussd',
      customer: {
        email:        order.email,
        phone_number: order.phone,
        name:         order.name,
      },
      customizations: {
        title:       'GoodNews Merch',
        description: `Order #${order.order_number}`,
        logo:        'https://goodnewsmerch.store/images/logos/goodnews-merch-logo.svg',
      },
      // Flutterwave itself sends the browser here after payment — the most reliable auto-redirect,
      // because it doesn't depend on any code of ours reaching into the modal.
      redirect_url: `${window.location.origin}/payment/confirm`,
      callback: (data: any) => {
        console.log('[flw] callback', data?.status, data?.transaction_id)
        try { window.closePaymentModal?.() } catch {}
        if (data.status === 'successful' || data.status === 'completed') {
          finalize(String(data.transaction_id))
        } else {
          setError('Payment was not completed.')
        }
      },
      onclose: () => console.log('[flw] modal closed'),
    })
  }

  if (!order) return null

  return (
    <section className="py-16">
      <div className="max-w-[480px] mx-auto px-4 sm:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-border p-8">

          <h1 className="text-[22px] font-bold tracking-[0.2em] uppercase mb-6">
            REVIEW & PAY
          </h1>

          <div className="flex flex-col gap-2 mb-6 text-[13px]">
            <div className="flex justify-between text-text-sub py-2 border-b border-border">
              <span>ORDER</span>
              <span className="font-mono font-bold">{order.order_number}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span>SUBTOTAL</span>
              <span>{fmt(Number(order.grand_total) - Number(order.shipping_fee ?? 0) - Number(order.tax ?? 0))}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span>SHIPPING</span>
              <span>{Number(order.shipping_fee ?? 0) > 0 ? fmt(order.shipping_fee) : 'Free'}</span>
            </div>
            <div className="flex justify-between py-4 font-bold text-[18px]">
              <span>GRAND TOTAL</span>
              <span>{fmt(order.grand_total)}</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border-l-4 border-danger
              text-danger text-[13px] flex gap-2 items-start">
              <span>⚠</span> {error}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <span className="w-8 h-8 border-4 border-border border-t-black
                rounded-full animate-spin" />
              <p className="text-[13px] text-text-muted">Verifying payment…</p>
            </div>
          ) : paidTx ? (
            <Button variant="dark" full onClick={() => finalize(paidTx)}>
              RETRY CONFIRMATION
            </Button>
          ) : (
            <Button variant="dark" full onClick={payWithFlutterwave}>
              ⚡ PAY {fmt(order.grand_total)}
            </Button>
          )}

          <div className="flex items-center justify-center gap-2 mt-5
            text-[11px] text-text-muted">
            <ShieldCheck size={14} />
            <span>Secured by Flutterwave</span>
          </div>

          <div className="flex justify-between mt-5 pt-4 border-t border-border
            text-[12px] text-text-muted">
            <a href="/checkout" className="hover:text-text transition-colors">
              ← Back to Checkout
            </a>
            <a href="/shop" className="hover:text-text transition-colors">
              Continue Shopping
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
