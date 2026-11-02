'use client'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'

/**
 * Flutterwave sends the customer here after paying:
 *   /payment/confirm?status=successful&tx_ref=<order_number>_<timestamp>&transaction_id=123
 * We verify with our API, then move on. The order number comes from tx_ref, so this works
 * even if sessionStorage was cleared.
 */
function Confirm() {
  const params  = useSearchParams()
  const router  = useRouter()
  const started = useRef(false)          // React StrictMode runs effects twice in dev
  const [error, setError] = useState('')

  useEffect(() => {
    if (started.current) return
    started.current = true

    const status = params.get('status')
    const txId   = params.get('transaction_id')
    const txRef  = params.get('tx_ref') ?? ''
    const orderNumber = txRef.slice(0, txRef.lastIndexOf('_'))     // "<order_number>_<timestamp>"

    if (!txId || !orderNumber || !['successful', 'completed'].includes(status ?? '')) {
      setError('Your payment was not completed. You have not been charged.')
      return
    }

    api.post('/orders/verify/flutterwave/', { orderID: orderNumber, transID: txId })
      .then(({ data }) => {
        sessionStorage.removeItem('pending_order')
        // full load: also resets the in-memory cart badge
        window.location.replace(`/order-complete?order_number=${data.order_number}&payment_id=${data.payment_id}`)
      })
      .catch((e) => setError(
        e.response?.data?.error ??
        `We couldn't confirm your payment yet. If you were charged, please contact info@goodnewsmerch.store with order ${orderNumber} and transaction ${txId}. Please don't pay again.`
      ))
  }, [params, router])

  return (
    <section className="py-20 px-4">
      <div className="max-w-[460px] mx-auto bg-white border border-border p-8 text-center">
        {error ? (
          <>
            <p className="text-[13px] text-danger bg-red-50 border-l-4 border-danger p-3 text-left mb-6">{error}</p>
            <Link href="/cart" className="text-[12px] font-bold tracking-[0.15em] uppercase underline">Back to cart</Link>
          </>
        ) : (
          <>
            <span className="block w-10 h-10 border-4 border-border border-t-black rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[14px] text-text-muted">Confirming your payment…</p>
          </>
        )}
      </div>
    </section>
  )
}

export default function PaymentConfirmPage() {
  return <Suspense fallback={null}><Confirm /></Suspense>
}
