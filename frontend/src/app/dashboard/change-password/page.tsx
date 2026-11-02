'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'
import api from '@/lib/api'
import Button from '@/components/ui/Button'

const FIELDS = [
  { key: 'current_password', label: 'Current Password' },
  { key: 'new_password',     label: 'New Password' },
  { key: 'confirm_password', label: 'Confirm New Password' },
] as const

export default function ChangePasswordPage() {
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.new_password !== form.confirm_password) return setMsg({ ok: false, text: 'Passwords do not match.' })
    setLoading(true); setMsg(null)
    try {
      await api.post('/auth/me/password/', form)
      setForm({ current_password: '', new_password: '', confirm_password: '' })
      setMsg({ ok: true, text: 'Password updated successfully.' })
    } catch (err: any) {
      setMsg({ ok: false, text: err.response?.data?.error || 'Could not update password. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-[480px]">
      <h1 className="text-[22px] md:text-[24px] font-bold tracking-[0.15em] uppercase mb-6">Change Password</h1>

      {msg && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className={`text-[13px] mb-5 p-3 border-l-4 ${msg.ok ? 'text-success bg-green-50 border-success' : 'text-danger bg-red-50 border-danger'}`}>
          {msg.text}
        </motion.p>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        {FIELDS.map(f => (
          <div key={f.key} className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold tracking-wide uppercase text-text-sub">{f.label}</label>
            <div className="relative">
              <input type={show ? 'text' : 'password'} required={f.key !== 'current_password'}
                value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                className="w-full border-b border-text bg-transparent py-2.5 pr-10 text-[14px] outline-none focus:border-black transition-colors" />
              <button type="button" onClick={() => setShow(s => !s)} aria-label="Show or hide passwords"
                className="absolute right-0 top-1/2 -translate-y-1/2 text-text-muted">
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        ))}
        <p className="text-[11px] text-text-muted -mt-2">
          Signed up with Google? Leave “Current Password” empty to set your first password.
        </p>
        <Button type="submit" variant="dark" loading={loading} className="self-start">Update Password</Button>
      </form>
    </div>
  )
}
