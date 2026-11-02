'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { FaHome, FaClipboardList, FaUserEdit, FaKey, FaPowerOff, FaUser } from 'react-icons/fa'
import { useAuth } from '@/store/auth'
import { useMounted } from '@/hooks/useMounted'

const LINKS = [
  { href: '/dashboard',                 label: 'Dashboard',       icon: FaHome,          exact: true },
  { href: '/dashboard/orders',          label: 'Orders',          icon: FaClipboardList },
  { href: '/dashboard/profile',         label: 'Edit Profile',    icon: FaUserEdit },
  { href: '/dashboard/change-password', label: 'Change Password', icon: FaKey },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, isAuthenticated, logout, fetchMe } = useAuth()
  const pathname = usePathname()
  const router   = useRouter()
  const mounted  = useMounted()

  // route guard (waits for the persisted state to load, so there is no false redirect)
  useEffect(() => {
    if (mounted && !isAuthenticated) router.replace(`/login?next=${encodeURIComponent(pathname)}`)
  }, [mounted, isAuthenticated, pathname, router])

  // refresh name / profile picture from the API once
  useEffect(() => { if (mounted && isAuthenticated) fetchMe() }, [mounted])

  if (!mounted || !isAuthenticated || !user) return <div className="min-h-[50vh]" />

  const active = (l: typeof LINKS[number]) =>
    l.exact ? pathname === l.href : pathname.startsWith(l.href)

  const handleLogout = () => { logout(); router.push('/') }

  return (
    <section className="py-8 md:py-10">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-8 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 md:gap-10 items-start">

        {/* Desktop sidebar */}
        <aside className="hidden md:block md:sticky md:top-[94px] bg-white border border-border p-6">
          <div className="flex items-center gap-3 pb-5 mb-4 border-b border-border">
            {profile?.profile_picture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.profile_picture} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-section-bg flex items-center justify-center text-text-muted flex-shrink-0">
                <FaUser size={18} />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[13px] font-bold truncate">{user.first_name} {user.last_name}</p>
              <p className="text-[11px] text-text-muted truncate">{user.email}</p>
            </div>
          </div>

          <nav className="flex flex-col gap-1">
            {LINKS.map(l => (
              <Link key={l.href} href={l.href}
                className={`flex items-center gap-3 px-3 py-2.5 text-[12px] font-semibold uppercase tracking-wide
                  border-l-2 transition-all
                  ${active(l)
                    ? 'text-text border-text bg-page-bg'
                    : 'text-text-muted border-transparent hover:text-text hover:bg-page-bg'}`}>
                <l.icon size={14} /> {l.label}
              </Link>
            ))}
            <button onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 mt-3 pt-4 border-t border-border
                text-[12px] font-semibold uppercase tracking-wide text-danger hover:opacity-70 transition-opacity">
              <FaPowerOff size={13} /> Log out
            </button>
          </nav>
        </aside>

        {/* Mobile: same four links as a scrollable pill bar */}
        <nav className="md:hidden flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {LINKS.map(l => (
            <Link key={l.href} href={l.href}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 text-[11px] font-semibold uppercase
                tracking-wide border transition-colors
                ${active(l) ? 'bg-black text-white border-black' : 'bg-white text-text-sub border-border'}`}>
              <l.icon size={12} /> {l.label}
            </Link>
          ))}
          <button onClick={handleLogout}
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2 text-[11px] font-semibold uppercase
              tracking-wide border border-border bg-white text-danger">
            <FaPowerOff size={11} /> Log out
          </button>
        </nav>

        <div className="min-w-0">{children}</div>
      </div>
    </section>
  )
}
