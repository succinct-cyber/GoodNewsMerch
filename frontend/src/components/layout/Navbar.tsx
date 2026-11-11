'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { FaUser, FaSearch, FaShoppingBag, FaTachometerAlt, FaSignOutAlt } from 'react-icons/fa'
import { Menu, X } from 'lucide-react'
import { useAuth } from '@/store/auth'
import { useCart } from '@/store/cart'
import { useMounted } from '@/hooks/useMounted'

const NAV_LINKS = [
  { href: '/',            label: 'HOME' },
  { href: '/shop',        label: 'SHOP' },
  { href: '/fundraising', label: 'FUNDRAISING' },
  { href: '/contact',     label: 'CONTACT' },
]

export default function Navbar() {
  const pathname = usePathname()
  const router   = useRouter()
  const mounted  = useMounted()
  const { isAuthenticated, logout } = useAuth()
  const items    = useCart((s) => s.items)
  const count    = items.reduce((n, i) => n + i.quantity, 0)

  const [mobileOpen, setMobileOpen] = useState(false)
  const [userOpen,   setUserOpen]   = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query,      setQuery]      = useState('')
  const userRef = useRef<HTMLDivElement>(null)

  // close menus on navigation
  useEffect(() => { setMobileOpen(false); setUserOpen(false); setSearchOpen(false) }, [pathname])

  // close the user dropdown when clicking elsewhere
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const loggedIn = mounted && isAuthenticated

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) router.push(`/shop?search=${encodeURIComponent(query.trim())}`)
  }

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-black">
      {/*
        3-column grid: [logo | centred links | icons].
        The two outer columns are equal (1fr) so the links stay truly centred and can never
        run into the logo — this is what fixes the overlap.
      */}
      <div className="max-w-[1280px] mx-auto h-[70px] px-4 sm:px-8 grid grid-cols-[1fr_auto_1fr] items-center gap-4">

        {/* Logo */}
        <Link href="/" className="justify-self-start flex items-center" aria-label="GoodNews Merch home">
          <Image src="/images/logos/goodnews-merch-logo.svg" alt="GoodNews Merch"
            width={272} height={32} priority className="h-5 min-[420px]:h-6 sm:h-8 w-auto" />
        </Link>

        {/* Desktop links (lg+) */}
        <ul className="hidden min-[900px]:flex items-center gap-4 min-[1100px]:gap-7 xl:gap-9">
          {NAV_LINKS.map(({ href, label }) => (
            <li key={href}>
              <Link href={href}
                className={`text-[12px] font-medium tracking-[0.15em] uppercase pb-[2px]
                  border-b-2 transition-colors duration-200
                  ${isActive(href)
                    ? 'text-text border-text'
                    : 'text-text-sub border-transparent hover:text-text hover:border-text'}`}>
                {label}
              </Link>
            </li>
          ))}
        </ul>
        {/* keeps the grid's middle column present below lg so icons stay right-aligned */}
        <span className="min-[900px]:hidden" />

        {/* Icons — solid set, same as the old site */}
        <div className="col-start-3 row-start-1 justify-self-end flex items-center gap-3 sm:gap-5 text-text">

          <div className="relative" ref={userRef}>
            <button onClick={() => setUserOpen(o => !o)} aria-label="Account"
              className="flex items-center hover:opacity-70 transition-opacity">
              <FaUser size={16} />
            </button>
            <AnimatePresence>
              {userOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-[calc(100%+14px)] bg-white border border-border
                    min-w-[190px] shadow-md z-50">
                  {loggedIn ? (
                    <>
                      <Link href="/dashboard"
                        className="flex items-center gap-3 px-4 py-3 text-[12px] font-semibold uppercase
                          tracking-wide border-b border-border hover:bg-section-bg transition-colors">
                        <FaTachometerAlt size={13} /> Dashboard
                      </Link>
                      <button onClick={() => { logout(); setUserOpen(false); router.push('/') }}
                        className="w-full text-left flex items-center gap-3 px-4 py-3 text-[12px]
                          font-semibold uppercase tracking-wide text-danger hover:bg-section-bg transition-colors">
                        <FaSignOutAlt size={13} /> Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <Link href="/login"
                        className="block px-4 py-3 text-[12px] font-semibold uppercase tracking-wide
                          border-b border-border hover:bg-section-bg transition-colors">Login</Link>
                      <Link href="/register"
                        className="block px-4 py-3 text-[12px] font-semibold uppercase tracking-wide
                          hover:bg-section-bg transition-colors">Register</Link>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button onClick={() => setSearchOpen(o => !o)} aria-label="Search"
            className="flex items-center hover:opacity-70 transition-opacity">
            <FaSearch size={16} />
          </button>

          <Link href="/cart" aria-label="Cart" className="relative flex items-center hover:opacity-70 transition-opacity">
            <FaShoppingBag size={17} />
            {mounted && count > 0 && (
              <motion.span key={count} initial={{ scale: 0.5 }} animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 bg-black text-white text-[10px] font-bold
                  w-[18px] h-[18px] rounded-full flex items-center justify-center">
                {count}
              </motion.span>
            )}
          </Link>

          <button
            className="min-[900px]:hidden"
            onClick={() => setMobileOpen(o => !o)}
            aria-label="Menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Search bar — drops under the navbar so it never pushes the icons around */}
      <AnimatePresence>
        {searchOpen && (
          <motion.form onSubmit={submitSearch}
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border bg-white">
            <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-3 flex items-center gap-3">
              <FaSearch size={14} className="text-text-muted" />
              <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search products…"
                className="flex-1 text-[14px] bg-transparent outline-none placeholder:text-text-muted" />
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Mobile / tablet menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className="min-[900px]:hidden overflow-hidden bg-white border-t border-border"s>
            <ul className="flex flex-col gap-4 px-4 sm:px-8 py-5">
              {NAV_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className={`text-[13px] font-semibold tracking-[0.15em] uppercase
                    ${isActive(href) ? 'text-text' : 'text-text-sub'}`}>{label}</Link>
                </li>
              ))}
              {loggedIn ? (
                <>
                  <li><Link href="/dashboard" className="text-[13px] font-semibold tracking-[0.15em] uppercase">MY ACCOUNT</Link></li>
                  <li><button onClick={() => { logout(); router.push('/') }}
                    className="text-[13px] font-semibold tracking-[0.15em] uppercase text-danger">LOGOUT</button></li>
                </>
              ) : (
                <>
                  <li><Link href="/login" className="text-[13px] font-semibold tracking-[0.15em] uppercase">LOGIN</Link></li>
                  <li><Link href="/register" className="text-[13px] font-semibold tracking-[0.15em] uppercase">REGISTER</Link></li>
                </>
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
