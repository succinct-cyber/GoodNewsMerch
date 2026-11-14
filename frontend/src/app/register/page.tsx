'use client'
import { useState, useRef } from 'react'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'
import api from '@/lib/api'
import Button from '@/components/ui/Button'
import GoogleButton from '@/components/auth/GoogleButton'

export default function RegisterPage() {
  const router  = useRouter()
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '',
    phone_number: '', password: '', confirm_password: '',
  })
  const [showPw,  setShowPw]  = useState(false)
  const [showCpw, setShowCpw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors,  setErrors]  = useState<Record<string, string>>({})
  const [success, setSuccess] = useState('')
  const [token, setToken] = useState<string | null>(null)
const widget = useRef<TurnstileInstance>(null) 

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirm_password) {
      setErrors({ confirm_password: 'Passwords do not match.' }); return
    }
    if (!token) return                                
    setLoading(true); setErrors({})
    try {
      const { data } = await api.post('/auth/register/', { ...form, turnstile_token: token })
      setSuccess(data.message)
    } catch (err: any) {
      const d = err.response?.data
      if (d && typeof d === 'object') {
        const flat: Record<string, string> = {}
        Object.entries(d).forEach(([k, v]) => {
          flat[k] = Array.isArray(v) ? (v as string[]).join(' ') : String(v)
        })
        setErrors(flat)
      } else {
        setErrors({ non_field_errors: 'Something went wrong. Please try again.' })
      }
      widget.current?.reset()                              // tokens are single-use
      setToken(null)
    } finally {
      setLoading(false)
    }
  }

  const fields = [
    { key: 'first_name',    label: 'First Name',    type: 'text',  half: true },
    { key: 'last_name',     label: 'Last Name',     type: 'text',  half: true },
    { key: 'phone_number',  label: 'Phone Number',  type: 'tel',   half: false },
    { key: 'email',         label: 'Email Address', type: 'email', half: false },
  ]

  return (
    <section className="min-h-[calc(100vh-70px)] md:portrait:min-h-0">
      <div className="grid grid-cols-1 md:grid-cols-2 min-h-[calc(100vh-70px)] md:portrait:min-h-0">

        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
          className="bg-section-bg flex-col justify-center px-16 py-20 hidden md:flex">
          <h1 className="text-[56px] font-bold tracking-[0.2em] leading-none text-text mb-6">
            CREATE<br />ACCOUNT
          </h1>
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-text-muted">
            GOODNEWS MERCH
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          className="bg-white flex items-center justify-center px-8 py-16">
          <div className="w-full max-w-[420px]">

            {success ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="text-center py-10">
                <p className="text-4xl mb-4">✉️</p>
                <h2 className="text-[18px] font-bold tracking-wide mb-3">CHECK YOUR EMAIL</h2>
                <p className="text-[14px] text-text-body leading-relaxed mb-6">{success}</p>
                <Link href="/login">
                  <Button variant="dark">GO TO LOGIN</Button>
                </Link>
              </motion.div>
            ) : (
              <>
                {(errors.non_field_errors || errors.detail) && (
                  <p className="text-danger text-[13px] mb-5 p-3 bg-red-50 border-l-4 border-danger">
                    {errors.non_field_errors || errors.detail}
                  </p>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-2 gap-4 mb-5">
                    {fields.filter(f => f.half).map(f => (
                      <div key={f.key} className="flex flex-col gap-1">
                        <label className="text-[11px] font-semibold tracking-wide uppercase text-text-sub">
                          {f.label}
                        </label>
                        <input required type={f.type}
                          value={(form as any)[f.key]}
                          onChange={set(f.key)}
                          className="border-b border-text bg-transparent py-3 text-[14px]
                            outline-none focus:border-black transition-colors" />
                        {errors[f.key] && (
                          <p className="text-danger text-[11px]">{errors[f.key]}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {fields.filter(f => !f.half).map(f => (
                    <div key={f.key} className="mb-5 flex flex-col gap-1">
                      <label className="text-[11px] font-semibold tracking-wide uppercase text-text-sub">
                        {f.label}
                      </label>
                      <input required type={f.type}
                        value={(form as any)[f.key]}
                        onChange={set(f.key)}
                        className="border-b border-text bg-transparent py-3 text-[14px]
                          outline-none focus:border-black transition-colors" />
                      {errors[f.key] && (
                        <p className="text-danger text-[11px]">{errors[f.key]}</p>
                      )}
                    </div>
                  ))}

                  {/* Password */}
                  {[
                    { key: 'password',         label: 'Password',         show: showPw,  toggle: () => setShowPw(s => !s) },
                    { key: 'confirm_password',  label: 'Confirm Password', show: showCpw, toggle: () => setShowCpw(s => !s) },
                  ].map(f => (
                    <div key={f.key} className="mb-5 flex flex-col gap-1">
                      <label className="text-[11px] font-semibold tracking-wide uppercase text-text-sub">
                        {f.label}
                      </label>
                      <div className="relative">
                        <input required type={f.show ? 'text' : 'password'}
                          value={(form as any)[f.key]}
                          onChange={set(f.key)}
                          className="w-full border-b border-text bg-transparent py-3 text-[14px]
                            outline-none focus:border-black transition-colors pr-10" />
                        <button type="button" onClick={f.toggle}
                          className="absolute right-0 top-1/2 -translate-y-1/2 text-text-muted">
                          {f.show ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {errors[f.key] && (
                        <p className="text-danger text-[11px]">{errors[f.key]}</p>
                      )}
                    </div>
                  ))}

                    <div className="mb-5">
                      <Turnstile
                        ref={widget}
                        siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                        onSuccess={setToken}
                        onExpire={() => setToken(null)}      // tokens expire after about 5 minutes
                        onError={() => setToken(null)}
                      />
                    </div>

                    <Button type="submit" variant="dark" full loading={loading} disabled={!token} className="mt-2">
                      CREATE ACCOUNT
                    </Button>
                </form>

                <div className="mt-6"><GoogleButton /></div>

                <p className="text-center text-[13px] text-text-muted mt-6">
                  Already have an account?{' '}
                  <Link href="/login" className="text-text font-semibold underline">
                    Sign in here
                  </Link>
                </p>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
