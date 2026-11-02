'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/store/auth'
import { useCart } from '@/store/cart'
import Button from '@/components/ui/Button'
import { Suspense } from 'react'
import GoogleButton from '@/components/auth/GoogleButton'

function LoginForm() {
  const { login }     = useAuth()
  const { mergeCart } = useCart()
  const router        = useRouter()
  const params        = useSearchParams()
  const next          = params.get('next') || '/dashboard'

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [show,     setShow]     = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await login(email, password)
      await mergeCart()            // ← guest cart → user cart on login
      router.push(next)
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Invalid email or password.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="min-h-[calc(100vh-70px)]">
      <div className="grid grid-cols-1 md:grid-cols-2 min-h-[calc(100vh-70px)]">

        {/* Left panel */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
          className="bg-section-bg flex flex-col justify-center px-16 py-20 hidden md:flex">
          <h1 className="text-[64px] font-bold tracking-[0.2em] leading-none text-text mb-6">
            LOGIN
          </h1>
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-text-muted">
            GOODNEWS MERCH
          </p>
        </motion.div>

        {/* Right panel */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          className="bg-white flex items-center justify-center px-8 py-16">
          <div className="w-full max-w-[420px]">
            <h1 className="text-[28px] font-bold tracking-[0.1em] uppercase mb-8 md:hidden">
              LOGIN
            </h1>

            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-danger text-[13px] mb-5 p-3 bg-red-50 border-l-4 border-danger">
                {error}
              </motion.p>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-text-sub">
                  Email Address
                </label>
                <input type="email" required value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="border-b border-text bg-transparent py-3 text-[14px]
                    outline-none focus:border-black transition-colors
                    placeholder:text-text-muted" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-text-sub">
                  Password
                </label>
                <div className="relative">
                  <input type={show ? 'text' : 'password'} required value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full border-b border-text bg-transparent py-3 text-[14px]
                      outline-none focus:border-black transition-colors pr-10
                      placeholder:text-text-muted" />
                  <button type="button" onClick={() => setShow(s => !s)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 text-text-muted">
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center text-[12px]">
                <label className="flex items-center gap-2 cursor-pointer text-text-sub uppercase tracking-wide">
                  <input type="checkbox" className="accent-black" /> Remember
                </label>
                <Link href="/forgot-password"
                  className="text-text-muted hover:text-text transition-colors uppercase tracking-wide">
                  Forgot Password?
                </Link>
              </div>

              <Button type="submit" variant="dark" full loading={loading}>
                SUBMIT
              </Button>
            </form>

            <div className="mt-6"><GoogleButton next={next} /></div>

            <p className="text-center text-[13px] text-text-muted mt-6">
              Don't have an account?{' '}
              <Link href="/register" className="text-text font-semibold underline">
                Register here
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
