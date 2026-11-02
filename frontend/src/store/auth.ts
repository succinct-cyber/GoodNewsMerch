import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '@/lib/api'
import { User, Profile } from '@/types'

interface AuthState {
  user: User | null
  profile: Profile | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  googleLogin: (credential: string) => Promise<void>
  logout: () => void
  fetchMe: () => Promise<void>
}

const saveTokens = (data: { access: string; refresh: string }) => {
  localStorage.setItem('access_token', data.access)
  localStorage.setItem('refresh_token', data.refresh)
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const { data } = await api.post('/auth/login/', { email, password })
        saveTokens(data)
        set({ user: data.user, isAuthenticated: true })
        get().fetchMe()                       // loads profile picture etc. (non-blocking)
      },

      googleLogin: async (credential) => {
        const { data } = await api.post('/auth/google/', { token: credential })
        saveTokens(data)
        set({ user: data.user, isAuthenticated: true })
        get().fetchMe()
      },

      logout: () => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        set({ user: null, profile: null, isAuthenticated: false })
      },

      fetchMe: async () => {
        try {
          const { data } = await api.get('/auth/me/')
          set({ user: data.user, profile: data.profile, isAuthenticated: true })
        } catch {
          set({ user: null, profile: null, isAuthenticated: false })
        }
      },
    }),
    {
      name: 'gnm-auth',
      partialize: (s) => ({ user: s.user, profile: s.profile, isAuthenticated: s.isAuthenticated }),
    }
  )
)
