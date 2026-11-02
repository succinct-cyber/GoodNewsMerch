'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import api from '@/lib/api'
import Button from '@/components/ui/Button'

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await api.post('/auth/forgot-password/', { email })
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="min-h-[calc(100vh-70px)] flex items-center justify-center px-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[420px] bg-white border border-border p-10">

        {sent ? (
          <div className="text-center">
            <p className="text-4xl mb-4">📬</p>
            <h2 className="text-[18px] font-bold tracking-wide uppercase mb-3">
              CHECK YOUR EMAIL
            </h2>
            <p className="text-[14px] text-text-body leading-relaxed">
              If an account exists for <strong>{email}</strong>, a reset link has been sent.
              Check your inbox and spam folder.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-[22px] font-bold tracking-[0.15em] uppercase mb-2">
              FORGOT PASSWORD
            </h1>
            <p className="text-[13px] text-text-muted mb-8">
              Enter your email and we'll send a reset link.
            </p>

            {error && (
              <p className="text-danger text-[13px] mb-5 p-3 bg-red-50 border-l-4 border-danger">
                {error}
              </p>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold tracking-wide uppercase text-text-sub">
                  Email Address
                </label>
                <input type="email" required value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="border-b border-text bg-transparent py-3 text-[14px]
                    outline-none focus:border-black transition-colors" />
              </div>
              <Button type="submit" variant="dark" full loading={loading}>
                SEND RESET LINK
              </Button>
            </form>
          </>
        )}
      </motion.div>
    </section>
  )
}
