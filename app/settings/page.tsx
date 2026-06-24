'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  IconArrowLeft,
  IconCamera,
  IconDeviceFloppy,
  IconLogout,
  IconStarFilled,
  IconUser,
} from '@tabler/icons-react'
import { supabase } from '@/lib/supabase'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Profile {
  nickname: string | null
  avatar_url: string | null
}

interface MinhaRecomendacao {
  id: string
  restaurant_id: string
  prato_recomendado: string | null
  created_at: string
  restaurants: { nome: string; categoria: string | null } | null
}

interface MinhaVisita {
  id: string
  restaurant_id: string
  rating: number
  created_at: string
  restaurants: { nome: string; categoria: string | null } | null
}

// ─── Utilitário ───────────────────────────────────────────────────────────────

function tempoRelativo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const min = Math.floor(diff / 60_000)
  const h = Math.floor(min / 60)
  const d = Math.floor(h / 24)
  if (min < 1) return 'agora mesmo'
  if (min < 60) return `há ${min} min`
  if (h < 24) return `há ${h}h`
  if (d === 1) return 'ontem'
  if (d < 30) return `há ${d} dias`
  const m = Math.floor(d / 30)
  if (m < 12) return `há ${m} ${m === 1 ? 'mês' : 'meses'}`
  return new Date(dateStr).toLocaleDateString('pt-PT')
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile>({ nickname: null, avatar_url: null })
  const [nickname, setNickname] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const [minhasRecomendacoes, setMinhasRecomendacoes] = useState<MinhaRecomendacao[]>([])
  const [minhasVisitas, setMinhasVisitas] = useState<MinhaVisita[]>([])

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      setUserId(user.id)

      const [profileResult, recsResult, visitsResult] = await Promise.all([
        supabase.from('profiles').select('nickname, avatar_url').eq('id', user.id).single(),
        supabase.from('recommendations')
          .select('id, restaurant_id, prato_recomendado, created_at, restaurants(nome, categoria)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase.from('visits')
          .select('id, restaurant_id, rating, created_at, restaurants(nome, categoria)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ])

      if (profileResult.data) {
        setProfile(profileResult.data as Profile)
        setNickname(profileResult.data.nickname ?? '')
      }

      setMinhasRecomendacoes((recsResult.data ?? []) as unknown as MinhaRecomendacao[])
      setMinhasVisitas((visitsResult.data ?? []) as unknown as MinhaVisita[])

      setLoading(false)
    })()
  }, [router])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (preview && preview !== profile.avatar_url) URL.revokeObjectURL(preview)
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!userId || !nickname.trim()) return
    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      let avatar_url = profile.avatar_url

      if (file) {
        const ext = file.name.split('.').pop() ?? 'jpg'
        const filename = `${userId}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filename, file, { upsert: true })
        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filename)
        avatar_url = publicUrl
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ nickname: nickname.trim(), avatar_url })
        .eq('id', userId)
      if (updateError) throw updateError

      setProfile({ nickname: nickname.trim(), avatar_url })
      setFile(null)
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setSaving(false)
    }
  }

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    document.cookie = 'sb-session=; path=/; max-age=0'
    document.cookie = 'sb-onboarded=; path=/; max-age=0'
    router.replace('/login')
  }

  const avatarSrc = preview ?? profile.avatar_url

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <p className="text-sm text-zinc-400">A carregar…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <header className="flex h-14 shrink-0 items-center justify-between bg-[#1A1A1A] px-6">
        <div className="flex items-center gap-3">
          <Link href="/" aria-label="Voltar" className="text-zinc-400 transition-colors hover:text-white">
            <IconArrowLeft size={22} stroke={1.5} />
          </Link>
          <div className="flex items-center gap-2">
              <Image src="/icon-192.png" alt="" width={32} height={32} className="rounded-lg" />
              <span className="text-xl font-bold tracking-tight text-[#E24B4A]">Zémato</span>
            </div>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-6 px-4 py-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Definições</h1>

        {/* Formulário de perfil */}
        <form onSubmit={handleSave} className="space-y-6">
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-zinc-200 transition-opacity hover:opacity-80 dark:bg-zinc-700"
            >
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarSrc} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <IconUser size={36} stroke={1.5} className="text-zinc-400" />
              )}
              <span className="absolute inset-0 flex items-end justify-center bg-black/0 pb-2 opacity-0 transition-all group-hover:bg-black/25 group-hover:opacity-100">
                <IconCamera size={18} className="text-white" />
              </span>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            <p className="text-xs text-zinc-400">{file ? file.name : 'Clica para alterar foto'}</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Nickname</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => { setNickname(e.target.value); setSaved(false) }}
              required
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E24B4A]/40 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
            />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          {saved && <p className="text-sm text-green-600 dark:text-green-400">Alterações guardadas.</p>}

          <button
            type="submit"
            disabled={saving || !nickname.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#E24B4A] py-2 text-sm font-semibold text-white transition-colors hover:bg-[#c93b3a] disabled:opacity-50"
          >
            <IconDeviceFloppy size={17} stroke={1.5} />
            {saving ? 'A guardar…' : 'Guardar alterações'}
          </button>
        </form>

        {/* Os meus tascos */}
        <div className="space-y-5 border-t border-zinc-200 pt-6 dark:border-zinc-700">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Os meus tascos</h2>

          {/* Recomendados por mim */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Recomendados por mim</h3>
            {minhasRecomendacoes.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Ainda não recomendaste nenhum restaurante — explora o mapa e adiciona o primeiro!
              </p>
            ) : (
              <ul className="space-y-2">
                {minhasRecomendacoes.map((rec) => (
                  <li key={rec.id}>
                    <Link
                      href={`/restaurante/${rec.restaurant_id}`}
                      className="flex items-start justify-between gap-3 rounded-xl border border-zinc-100 bg-white p-3 transition-shadow hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-800"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {rec.restaurants?.nome ?? '—'}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {rec.restaurants?.categoria && <span>{rec.restaurants.categoria}</span>}
                          {rec.prato_recomendado && (
                            <span>{rec.restaurants?.categoria ? ' · ' : ''}{rec.prato_recomendado}</span>
                          )}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-zinc-400">{tempoRelativo(rec.created_at)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Onde já fui */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Onde já fui</h3>
            {minhasVisitas.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Ainda não foste a nenhum restaurante.
              </p>
            ) : (
              <ul className="space-y-2">
                {minhasVisitas.map((v) => (
                  <li key={v.id}>
                    <Link
                      href={`/restaurante/${v.restaurant_id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-zinc-100 bg-white p-3 transition-shadow hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-800"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {v.restaurants?.nome ?? '—'}
                        </p>
                        {v.restaurants?.categoria && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">{v.restaurants.categoria}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="flex items-center gap-0.5 text-sm font-semibold text-yellow-500">
                          <IconStarFilled size={13} />
                          {v.rating}
                        </span>
                        <span className="text-xs text-zinc-400">{tempoRelativo(v.created_at)}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Sair */}
        <div className="border-t border-zinc-200 pt-6 dark:border-zinc-700">
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <IconLogout size={17} stroke={1.5} />
            {signingOut ? 'A sair…' : 'Sair'}
          </button>
        </div>
      </main>
    </div>
  )
}
