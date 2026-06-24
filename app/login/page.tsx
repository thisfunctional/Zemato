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
      <main className="flex min-h-screen items-center justify-center">
        <p>
          Link enviado para <strong>{email}</strong>. Verifica a tua caixa de correio.
        </p>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
        <div className="mb-2 flex flex-col items-center gap-2">
          <Image src="/icon.svg" alt="Zémato" width={64} height={64} className="rounded-2xl" />
          <span className="text-lg font-bold tracking-tight text-[#E24B4A]">Zémato</span>
        </div>
        <h1 className="text-2xl font-semibold">Entrar</h1>
        <input
          type="text"
          placeholder="O teu nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          className="rounded border px-3 py-2"
        />
        <input
          type="email"
          placeholder="O teu email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="rounded border px-3 py-2"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
        >
          {loading ? 'A enviar…' : 'Enviar magic link'}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </main>
  )
}
