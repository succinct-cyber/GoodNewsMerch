'use client'
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { FaUser, FaCamera } from 'react-icons/fa'
import { useAuth } from '@/store/auth'
import api from '@/lib/api'
import Button from '@/components/ui/Button'

const MAX_MB = 2
const FIELDS = [
  { key: 'first_name',     label: 'First Name',     half: true },
  { key: 'last_name',      label: 'Last Name',      half: true },
  { key: 'phone_number',   label: 'Phone Number',   half: false },
  { key: 'address_line_1', label: 'Address Line 1', half: false },
  { key: 'address_line_2', label: 'Address Line 2', half: false },
  { key: 'city',           label: 'City',           half: true },
  { key: 'state',          label: 'State',          half: true },
  { key: 'country',        label: 'Country',        half: false },
] as const

export default function EditProfilePage() {
  const { user, profile, fetchMe } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    if (!user) return
    setForm({
      first_name: user.first_name ?? '', last_name: user.last_name ?? '',
      phone_number: user.phone_number ?? '',
      address_line_1: profile?.address_line_1 ?? '', address_line_2: profile?.address_line_2 ?? '',
      city: profile?.city ?? '', state: profile?.state ?? '', country: profile?.country ?? '',
    })
  }, [user, profile])

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith('image/')) return setMsg({ ok: false, text: 'Please choose an image file.' })
    if (f.size > MAX_MB * 1024 * 1024) return setMsg({ ok: false, text: `Image must be under ${MAX_MB}MB.` })
    setMsg(null); setFile(f); setPreview(URL.createObjectURL(f))
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setMsg(null)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      if (file) fd.append('profile_picture', file)
      await api.patch('/auth/me/', fd)           // multipart — axios sets the boundary itself
      await fetchMe()
      setFile(null)
      setMsg({ ok: true, text: 'Your profile has been updated.' })
    } catch (err: any) {
      const d = err.response?.data
      setMsg({ ok: false, text: typeof d === 'object' ? Object.values(d).flat().join(' ') : 'Update failed. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const avatar = preview ?? profile?.profile_picture

  return (
    <div className="max-w-[560px]">
      <h1 className="text-[22px] md:text-[24px] font-bold tracking-[0.15em] uppercase mb-6">Edit Profile</h1>

      {msg && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className={`text-[13px] mb-5 p-3 border-l-4 ${msg.ok ? 'text-success bg-green-50 border-success' : 'text-danger bg-red-50 border-danger'}`}>
          {msg.text}
        </motion.p>
      )}

      <form onSubmit={onSubmit}>
        {/* Avatar */}
        <div className="flex items-center gap-5 mb-7">
          <div className="relative">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="Profile" className="w-20 h-20 rounded-full object-cover border-2 border-border" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-section-bg border-2 border-border flex items-center justify-center text-text-muted">
                <FaUser size={26} />
              </div>
            )}
            <button type="button" onClick={() => fileRef.current?.click()} aria-label="Change picture"
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-black text-white flex items-center justify-center hover:bg-[#2a2a2a]">
              <FaCamera size={12} />
            </button>
          </div>
          <div>
            <button type="button" onClick={() => fileRef.current?.click()}
              className="text-[12px] font-semibold uppercase tracking-wide underline">Change picture</button>
            <p className="text-[11px] text-text-muted mt-1">JPG or PNG, up to {MAX_MB}MB.</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={onPick} className="hidden" />
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-5">
          {FIELDS.map(f => (
            <div key={f.key} className={`flex flex-col gap-1 ${f.half ? '' : 'col-span-2'}`}>
              <label className="text-[11px] font-semibold tracking-wide uppercase text-text-sub">{f.label}</label>
              <input value={form[f.key] ?? ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                required={f.key === 'first_name' || f.key === 'last_name'}
                className="border-b border-text bg-transparent py-2.5 text-[14px] outline-none focus:border-black transition-colors" />
            </div>
          ))}
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-[11px] font-semibold tracking-wide uppercase text-text-sub">Email Address</label>
            <input value={user?.email ?? ''} disabled
              className="border-b border-border bg-transparent py-2.5 text-[14px] text-text-muted cursor-not-allowed" />
            <p className="text-[11px] text-text-muted">Email cannot be changed.</p>
          </div>
        </div>

        <Button type="submit" variant="dark" loading={loading} className="mt-7">Save Changes</Button>
      </form>
    </div>
  )
}
