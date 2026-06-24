'use client'

import { useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { nome },
      },
    })

    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  if (sent) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <p className="text-zinc-700 dark:text-zinc-300">
          Link enviado para <strong>{email}</strong>. Verifica a tua caixa de correio.
        </p>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-900">
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
        {/* Logo — única instância do branding nesta página, sem header genérico */}
        <div className="mb-4 flex flex-col items-center gap-2">
          <Image
            src="/icon-192.png"
            alt="Zémato"
            width={72}
            height={72}
            className="rounded-2xl"
            priority
          />
          <span className="text-lg font-bold tracking-tight text-[#E24B4A]">Zémato</span>
        </div>

        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Entrar</h1>

        <input
          type="text"
          placeholder="O teu nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E24B4A]/40 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder:text-zinc-400"
        />
        <input
          type="email"
          placeholder="O teu email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E24B4A]/40 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder:text-zinc-400"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-[#E24B4A] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#c93b3a] disabled:opacity-50"
        >
          {loading ? 'A enviar…' : 'Enviar magic link'}
        </button>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </form>
    </main>
  )
}
