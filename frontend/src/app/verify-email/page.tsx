'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import api from '@/lib/api'

function VerifyContent() {
  const params  = useSearchParams()
  const router  = useRouter()
  const uid     = params.get('uid')   ?? ''
  const token   = params.get('token') ?? ''

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    if (!uid || !token) { setStatus('error'); return }
    api.post('/auth/verify-email/', { uid, token })
      .then(() => {
        setStatus('success')
        setTimeout(() => router.push('/login'), 2500)
      })
      .catch(() => setStatus('error'))
  }, [uid, token])

  return (
    <section className="min-h-[calc(100vh-70px)] flex items-center justify-center px-8">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[420px] bg-white border border-border p-10 text-center">
        {status === 'loading' && (
          <>
            <div className="w-10 h-10 border-4 border-border border-t-black
              rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[14px] text-text-muted">Verifying your account…</p>
          </>
        )}
        {status === 'success' && (
          <>
            <p className="text-5xl mb-4">✅</p>
            <h2 className="text-[18px] font-bold tracking-wide uppercase mb-2">
              EMAIL VERIFIED
            </h2>
            <p className="text-[14px] text-text-body">
              Your account is active. Redirecting to login…
            </p>
          </>
        )}
        {status === 'error' && (
          <>
            <p className="text-5xl mb-4">❌</p>
            <h2 className="text-[18px] font-bold tracking-wide uppercase mb-2">
              VERIFICATION FAILED
            </h2>
            <p className="text-[14px] text-text-body mb-6">
              The link is invalid or has expired. Request a new one from the login page.
            </p>
            <a href="/login"
              className="inline-block bg-black text-white px-7 py-3 text-[12px]
                font-bold tracking-[0.15em] uppercase">
              GO TO LOGIN
            </a>
          </>
        )}
      </motion.div>
    </section>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyContent />
    </Suspense>
  )
}
