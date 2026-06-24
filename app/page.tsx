'use client'

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import { IconCheck, IconMoon, IconPlus, IconSun, IconUser, IconX } from '@tabler/icons-react'
import { supabase } from '@/lib/supabase'
import AddRestaurantForm from '@/components/AddRestaurantForm'

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-zinc-100 dark:bg-zinc-800">
      <p className="text-sm text-zinc-400">A carregar mapa…</p>
    </div>
  ),
})

const THEME_CYCLE: Record<string, string> = { light: 'dark', dark: 'system', system: 'light' }

// 'idle' → FAB click → 'placing' → confirmar → 'form' → submeter → 'idle'
type AddStep = 'idle' | 'placing' | 'form'

function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return <div className="h-6 w-6" />

  return (
    <button
      aria-label="Alternar tema"
      onClick={() => setTheme(THEME_CYCLE[theme ?? 'system'])}
      className="text-zinc-400 transition-colors hover:text-white"
    >
      {resolvedTheme === 'dark'
        ? <IconSun size={22} stroke={1.5} />
        : <IconMoon size={22} stroke={1.5} />}
    </button>
  )
}

export default function HomePage() {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [userPos, setUserPos] = useState<[number, number] | null>(null)
  const [addStep, setAddStep] = useState<AddStep>('idle')
  const [pinPosition, setPinPosition] = useState<[number, number] | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single()
      if (data?.avatar_url) setAvatarUrl(data.avatar_url as string)
    })()
  }, [])

  function handleFabClick() {
    // Pin começa na posição do utilizador ou no centro de Portugal como fallback
    setPinPosition(userPos ?? [39.5, -8.0])
    setAddStep('placing')
  }

  function handleCancel() {
    setAddStep('idle')
    setPinPosition(null)
  }

  function handleConfirmPosition() {
    if (!pinPosition) return
    setAddStep('form')
  }

  const handleFormSuccess = useCallback(() => {
    setAddStep('idle')
    setPinPosition(null)
    setRefreshKey((k) => k + 1)
  }, [])

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex h-14 shrink-0 items-center justify-between bg-[#1A1A1A] px-6">
        <div className="flex items-center gap-2">
          <Image src="/icon-192.png" alt="" width={32} height={32} className="rounded-lg" />
          <span className="text-xl font-bold tracking-tight text-[#E24B4A]">Zémato</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/settings" aria-label="Perfil" className="text-zinc-400 transition-colors hover:text-white">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Avatar" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <IconUser size={22} stroke={1.5} />
            )}
          </Link>
        </div>
      </header>

      {/* Área do mapa */}
      <div className="relative flex-1 overflow-hidden">
        <MapView
          addMode={addStep === 'placing'}
          pinPosition={pinPosition}
          onPinMove={setPinPosition}
          onUserPosChange={setUserPos}
          refreshKey={refreshKey}
        />

        {/* Instrução no topo do mapa — fixed ao viewport, abaixo do header (h-14 = 3.5rem) */}
        {addStep === 'placing' && (
          <div className="pointer-events-none fixed inset-x-0 z-[1002] flex justify-center px-4" style={{ top: 'calc(3.5rem + 1rem)' }}>
            <div className="rounded-xl bg-white/90 px-4 py-2.5 shadow-lg backdrop-blur-sm dark:bg-zinc-800/90">
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                Arrasta o pin para a posição exata
              </p>
            </div>
          </div>
        )}

        {/* Botões Cancelar / Confirmar posição
            fixed ao viewport (não absolute ao container) para não ficarem
            escondidos atrás da barra de navegação do browser em iOS.
            env(safe-area-inset-bottom) garante margem acima do home indicator. */}
        {addStep === 'placing' && (
          <div
            className="fixed inset-x-0 z-[1002] flex justify-center gap-3 px-6"
            style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <button
              onClick={handleCancel}
              className="flex items-center gap-1.5 rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 shadow-lg transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
            >
              <IconX size={16} stroke={2} />
              Cancelar
            </button>
            <button
              onClick={handleConfirmPosition}
              className="flex items-center gap-1.5 rounded-full bg-[#E24B4A] px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-[#c93b3a]"
            >
              <IconCheck size={16} stroke={2} />
              Confirmar posição
            </button>
          </div>
        )}
      </div>

      {/* FAB — só visível no estado idle */}
      {addStep === 'idle' && (
        <button
          onClick={handleFabClick}
          aria-label="Adicionar restaurante"
          className="fixed bottom-6 right-6 z-[1001] flex h-14 w-14 items-center justify-center rounded-full bg-[#E24B4A] shadow-lg transition-transform hover:scale-105 hover:bg-[#c93b3a] active:scale-95"
        >
          <IconPlus size={24} stroke={2} className="text-white" />
        </button>
      )}

      {/* Modal de detalhe do restaurante */}
      {addStep === 'form' && pinPosition && (
        <AddRestaurantForm
          pinPosition={pinPosition}
          onSuccess={handleFormSuccess}
          onCancel={handleCancel}
        />
      )}
    </div>
  )
}
