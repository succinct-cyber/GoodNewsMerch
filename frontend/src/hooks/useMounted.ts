import { useEffect, useState } from 'react'

/** True only after the first client render. Use before reading persisted (localStorage) state. */
export function useMounted() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted
}
