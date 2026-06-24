'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        // Set an optimistic session cookie readable by proxy.ts
        document.cookie = 'sb-session=1; path=/; SameSite=Lax; max-age=604800'
        subscription.unsubscribe()
        router.replace('/')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p>A autenticar…</p>
    </main>
  )
}
