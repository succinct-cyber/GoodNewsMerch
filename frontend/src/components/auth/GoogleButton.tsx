'use client'
import { useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/store/auth'
import { useCart } from '@/store/cart'

export default function GoogleButton({ next = '/dashboard' }: { next?: string }) {
  const { googleLogin } = useAuth()
  const { mergeCart }   = useCart()
  const router          = useRouter()
  const [error, setError] = useState('')

  // no client id configured → render nothing instead of crashing the page
  if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) return null

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-3 w-full text-[11px] text-text-muted tracking-[0.15em] uppercase">
        <span className="flex-1 h-px bg-border" /> or <span className="flex-1 h-px bg-border" />
      </div>
      <GoogleLogin
        onSuccess={async (res) => {
          if (!res.credential) return setError('Google sign-in failed. Please try again.')
          try {
            setError('')
            await googleLogin(res.credential)
            await mergeCart()          // guest cart → account, same as email login
            router.push(next)
          } catch (e: any) {
            setError(e.response?.data?.error || 'Google sign-in failed. Please try again.')
          }
        }}
        onError={() => setError('Google sign-in was cancelled or failed.')}
        shape="rectangular" theme="outline" size="large" text="continue_with" width="360"
      />
      {error && <p className="text-danger text-[12px]">{error}</p>}
    </div>
  )
}
