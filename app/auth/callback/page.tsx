'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    // onAuthStateChange pode receber um callback async — o evento SIGNED_IN
    // só dispara depois da sessão estar completamente estabelecida, pelo que
    // a query a profiles pode usar session.user.id com segurança.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event !== 'SIGNED_IN' || !session?.user) return

        // Sessão estabelecida → cookie de sessão
        document.cookie = 'sb-session=1; path=/; SameSite=Lax; max-age=604800'

        // Verifica se o utilizador já completou o onboarding (tem nickname)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('nickname')
          .eq('id', session.user.id)
          .maybeSingle()

        if (profileError) {
          // Distingue erro de query de "nickname é null":
          // não assume ausência de nickname — o utilizador pode já ter um.
          // A página /onboarding fará a sua própria verificação ao montar.
          console.error('[auth/callback] Erro ao verificar profile:', profileError.message)
        } else if (profile?.nickname) {
          // Nickname existe → marcar como onboarded para o proxy
          document.cookie = 'sb-onboarded=1; path=/; SameSite=Lax; max-age=604800'
        }
        // Se profile.nickname for null → não definir sb-onboarded;
        // proxy redireciona para /onboarding como esperado

        subscription.unsubscribe()
        router.replace('/')
      },
    )

    return () => subscription.unsubscribe()
  }, [router])

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-zinc-400">A autenticar…</p>
    </main>
  )
}
