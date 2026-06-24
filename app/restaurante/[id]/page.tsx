'use client'

import { use, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  IconArrowLeft,
  IconBrandApple,
  IconBrandGoogleMaps,
  IconBrandWaze,
  IconPencil,
  IconStarFilled,
  IconUser,
} from '@tabler/icons-react'
import { supabase } from '@/lib/supabase'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Restaurante {
  id: string
  nome: string
  categoria: string | null
  preco: string | null
  lat: number
  lng: number
  created_at: string
}

interface Recomendacao {
  id: string
  user_id: string
  comentario: string | null
  prato_recomendado: string | null
  foto_url: string | null
  created_at: string
  profile: { nickname: string | null; avatar_url: string | null } | null
}

interface Visit {
  id: string
  user_id: string
  rating: number
  comentario: string | null
  created_at: string
  profile: { nickname: string | null; avatar_url: string | null } | null
}

// ─── Utilitários ──────────────────────────────────────────────────────────────

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

function Stars({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'text-sm' : 'text-base'
  return (
    <span className={cls + ' text-yellow-400'}>
      {'★'.repeat(rating)}
      <span className="text-zinc-300">{'★'.repeat(5 - rating)}</span>
    </span>
  )
}

// ─── Selector de estrelas interativo ─────────────────────────────────────────

function StarSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Classificação">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          aria-label={`${s} estrelas`}
          className={`text-2xl transition-transform hover:scale-110 ${s <= (hovered || value) ? 'text-yellow-400' : 'text-zinc-300'}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function RestaurantePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [restaurante, setRestaurante] = useState<Restaurante | null>(null)
  const [recomendacao, setRecomendacao] = useState<Recomendacao | null>(null)
  const [visits, setVisits] = useState<Visit[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isRecommender, setIsRecommender] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Visit form
  const [showVisitForm, setShowVisitForm] = useState(false)
  const [starRating, setStarRating] = useState(0)
  const [visitComentario, setVisitComentario] = useState('')
  const [submittingVisit, setSubmittingVisit] = useState(false)
  const [visitError, setVisitError] = useState<string | null>(null)

  // Derived
  const myVisit = visits.find((v) => v.user_id === currentUserId) ?? null
  const avgRating = visits.length > 0
    ? visits.reduce((s, v) => s + v.rating, 0) / visits.length
    : null

  // ── Fetch visits (separated so we can call it after submitting) ──────────────

  const fetchVisits = useCallback(async () => {
    type VRow = { id: string; user_id: string; rating: number; comentario: string | null; created_at: string }

    const { data: vData, error } = await supabase
      .from('visits')
      .select('id, user_id, rating, comentario, created_at')
      .eq('restaurant_id', id)
      .order('created_at', { ascending: false })

    if (error || !vData) return

    const rows = vData as VRow[]
    const userIds = [...new Set(rows.map((v) => v.user_id))]
    const profileMap: Record<string, { nickname: string | null; avatar_url: string | null }> = {}

    if (userIds.length > 0) {
      const { data: pData } = await supabase
        .from('profiles')
        .select('id, nickname, avatar_url')
        .in('id', userIds)
      for (const p of pData ?? []) {
        profileMap[p.id] = { nickname: p.nickname as string | null, avatar_url: p.avatar_url as string | null }
      }
    }

    setVisits(rows.map((v) => ({ ...v, profile: profileMap[v.user_id] ?? null })))
  }, [id])

  // ── Initial load ─────────────────────────────────────────────────────────────

  useEffect(() => {
    void (async () => {
      const [{ data: userData }, { data: rest, error: restError }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('restaurants')
          .select('id, nome, categoria, preco, lat, lng, created_at')
          .eq('id', id)
          .single(),
      ])

      const userId = userData.user?.id ?? null
      setCurrentUserId(userId)

      if (restError || !rest) { setNotFound(true); setLoading(false); return }
      setRestaurante(rest as Restaurante)

      // Fetch single recommendation
      const { data: rec } = await supabase
        .from('recommendations')
        .select('id, user_id, comentario, prato_recomendado, foto_url, created_at')
        .eq('restaurant_id', id)
        .limit(1)
        .maybeSingle()

      if (rec) {
        const { data: pData } = await supabase
          .from('profiles')
          .select('nickname, avatar_url')
          .eq('id', rec.user_id)
          .single()

        setRecomendacao({
          ...(rec as Omit<Recomendacao, 'profile'>),
          profile: pData ? { nickname: pData.nickname as string | null, avatar_url: pData.avatar_url as string | null } : null,
        })
        if (userId) setIsRecommender(rec.user_id === userId)
      }

      await fetchVisits()
      setLoading(false)
    })()
  }, [id, fetchVisits])

  // ── Submit visit (insert or update) ─────────────────────────────────────────

  async function handleSubmitVisit(e: React.FormEvent) {
    e.preventDefault()
    if (starRating === 0) return
    setSubmittingVisit(true)
    setVisitError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setVisitError('Sessão expirada.'); setSubmittingVisit(false); return }

    const { error } = await supabase.from('visits').upsert(
      {
        restaurant_id: id,
        user_id: user.id,
        rating: starRating,
        comentario: visitComentario.trim() || null,
      },
      { onConflict: 'restaurant_id,user_id' },
    )

    if (error) { setVisitError(error.message); setSubmittingVisit(false); return }

    setShowVisitForm(false)
    await fetchVisits()
  }

  function openEditForm() {
    setStarRating(myVisit?.rating ?? 0)
    setVisitComentario(myVisit?.comentario ?? '')
    setVisitError(null)
    setShowVisitForm(true)
  }

  // ── Loading / not found ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <p className="text-sm text-zinc-400">A carregar…</p>
      </div>
    )
  }

  if (notFound || !restaurante) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-zinc-900">
        <p className="text-zinc-500">Restaurante não encontrado.</p>
        <Link href="/" className="text-sm text-[#E24B4A] hover:underline">Voltar ao mapa</Link>
      </div>
    )
  }

  const { nome, categoria, preco, lat, lng } = restaurante

  const navLinks = [
    { label: 'Google Maps', href: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, icon: IconBrandGoogleMaps, color: 'text-green-600 dark:text-green-400' },
    { label: 'Waze',        href: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,               icon: IconBrandWaze,       color: 'text-sky-600 dark:text-sky-400' },
    { label: 'Apple Maps',  href: `https://maps.apple.com/?daddr=${lat},${lng}`,                     icon: IconBrandApple,      color: 'text-zinc-700 dark:text-zinc-300' },
  ]

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <header className="flex h-14 shrink-0 items-center gap-3 bg-[#1A1A1A] px-6">
        <Link href="/" aria-label="Voltar" className="text-zinc-400 transition-colors hover:text-white">
          <IconArrowLeft size={22} stroke={1.5} />
        </Link>
        <div className="flex items-center gap-2">
            <Image src="/icon-192.png" alt="" width={32} height={32} className="rounded-lg" />
            <span className="text-xl font-bold tracking-tight text-[#E24B4A]">Zémato</span>
          </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-8 px-4 py-8">

        {/* Nome + média de estrelas + pills */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-start gap-3">
            <h1 className="text-3xl font-bold leading-tight text-zinc-900 dark:text-zinc-100">{nome}</h1>
            {avgRating !== null && (
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2.5 py-1 text-sm font-semibold text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                <IconStarFilled size={13} />
                {avgRating.toFixed(1)}
                <span className="font-normal text-yellow-600 dark:text-yellow-500">
                  ({visits.length} {visits.length === 1 ? 'visita' : 'visitas'})
                </span>
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {categoria && <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">{categoria}</span>}
            {preco && <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">{preco}</span>}
          </div>
        </div>

        {/* Como chegar */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-800">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Como chegar</h2>
          <div className="grid grid-cols-3 gap-3">
            {navLinks.map(({ label, href, icon: Icon, color }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-700/60"
              >
                <Icon size={28} stroke={1.5} className={color} />
                {label}
              </a>
            ))}
          </div>
        </div>

        {/* Acção do utilizador atual */}
        {!isRecommender && (
          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-800">
            {!showVisitForm ? (
              myVisit ? (
                /* Utilizador já visitou — mostra a sua avaliação + botão editar */
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">A tua avaliação</p>
                    <Stars rating={myVisit.rating} />
                    {myVisit.comentario && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">{myVisit.comentario}</p>
                    )}
                  </div>
                  <button
                    onClick={openEditForm}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-700"
                  >
                    <IconPencil size={14} stroke={1.5} />
                    Editar
                  </button>
                </div>
              ) : (
                /* Utilizador ainda não visitou */
                <button
                  onClick={() => { setStarRating(0); setVisitComentario(''); setVisitError(null); setShowVisitForm(true) }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#E24B4A] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#c93b3a]"
                >
                  <IconStarFilled size={16} />
                  Já fui — avaliar
                </button>
              )
            ) : (
              /* Formulário de avaliação */
              <form onSubmit={handleSubmitVisit} className="space-y-4">
                <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  {myVisit ? 'Editar avaliação' : 'A tua avaliação'}
                </p>
                <StarSelector value={starRating} onChange={setStarRating} />
                <textarea
                  value={visitComentario}
                  onChange={(e) => setVisitComentario(e.target.value)}
                  placeholder="Comentário opcional…"
                  rows={2}
                  className="w-full resize-none rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#E24B4A]/40 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                />
                {visitError && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{visitError}</p>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowVisitForm(false)}
                    className="flex-1 rounded-lg border border-zinc-300 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submittingVisit || starRating === 0}
                    className="flex-1 rounded-lg bg-[#E24B4A] py-2 text-sm font-semibold text-white hover:bg-[#c93b3a] disabled:opacity-50"
                  >
                    {submittingVisit ? 'A guardar…' : 'Guardar'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Recomendação original (único item) */}
        {recomendacao && (
          <div className="space-y-3">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">A recomendação</h2>
            <div className="rounded-xl border border-zinc-100 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <div className="mb-3 flex items-center gap-2.5">
                {recomendacao.profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={recomendacao.profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700">
                    <IconUser size={16} stroke={1.5} className="text-zinc-400" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {recomendacao.profile?.nickname ?? 'Utilizador'}
                    {isRecommender && <span className="ml-1 text-xs font-normal text-zinc-400">(tu)</span>}
                  </p>
                  <p className="text-xs text-zinc-400">{tempoRelativo(recomendacao.created_at)}</p>
                </div>
              </div>
              {recomendacao.prato_recomendado && (
                <p className="mb-1 text-sm font-medium text-[#E24B4A]">🍽 {recomendacao.prato_recomendado}</p>
              )}
              {recomendacao.comentario && (
                <p className="mb-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{recomendacao.comentario}</p>
              )}
              {recomendacao.foto_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={recomendacao.foto_url} alt="Foto da recomendação" className="mt-2 w-full rounded-xl object-cover" style={{ maxHeight: '280px' }} />
              )}
            </div>
          </div>
        )}

        {/* Quem também foi */}
        <div className="space-y-3">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            Quem também foi
            {visits.length > 0 && <span className="ml-2 text-sm font-normal text-zinc-500">{visits.length}</span>}
          </h2>

          {visits.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Ninguém registou uma visita ainda.</p>
          ) : (
            visits.map((v) => (
              <div key={v.id} className="rounded-xl border border-zinc-100 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
                <div className="mb-2 flex items-center gap-2.5">
                  {v.profile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700">
                      <IconUser size={16} stroke={1.5} className="text-zinc-400" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {v.profile?.nickname ?? 'Utilizador'}
                      {v.user_id === currentUserId && <span className="ml-1 text-xs font-normal text-zinc-400">(tu)</span>}
                    </p>
                    <p className="text-xs text-zinc-400">{tempoRelativo(v.created_at)}</p>
                  </div>
                  <Stars rating={v.rating} size="sm" />
                </div>
                {v.comentario && (
                  <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{v.comentario}</p>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
