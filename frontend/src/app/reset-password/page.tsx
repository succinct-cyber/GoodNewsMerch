'use client'
import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'
import api from '@/lib/api'
import Button from '@/components/ui/Button'

function ResetForm() {
  const params  = useSearchParams()
  const router  = useRouter()
  const uid     = params.get('uid')   ?? ''
  const token   = params.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [show,     setShow]     = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true); setError('')
    try {
      await api.post('/auth/reset-password/', { uid, token, password })
      router.push('/login?reset=1')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid or expired link.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="min-h-[calc(100vh-70px)] flex items-center justify-center px-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[420px] bg-white border border-border p-10">
        <h1 className="text-[22px] font-bold tracking-[0.15em] uppercase mb-8">
          RESET PASSWORD
        </h1>

        {error && (
          <p className="text-danger text-[13px] mb-5 p-3 bg-red-50 border-l-4 border-danger">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {[
            { label: 'New Password',     val: password, set: setPassword },
            { label: 'Confirm Password', val: confirm,  set: setConfirm  },
          ].map((f, i) => (
            <div key={i} className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold tracking-wide uppercase text-text-sub">
                {f.label}
              </label>
              <div className="relative">
                <input type={show ? 'text' : 'password'} required
                  value={f.val} onChange={e => f.set(e.target.value)}
                  className="w-full border-b border-text bg-transparent py-3 text-[14px]
                    outline-none focus:border-black transition-colors pr-10" />
                <button type="button" onClick={() => setShow(s => !s)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-text-muted">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          ))}
          <Button type="submit" variant="dark" full loading={loading}>
            RESET PASSWORD
          </Button>
        </form>
      </motion.div>
    </section>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  )
}
