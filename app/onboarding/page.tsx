'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { IconCamera, IconUser } from '@tabler/icons-react'
import { supabase } from '@/lib/supabase'

export default function OnboardingPage() {
  const router = useRouter()
  const [nickname, setNickname] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (preview) URL.revokeObjectURL(preview)
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nickname.trim()) return
    setError(null)
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sessão expirada. Faz login novamente.')

      let avatar_url: string | undefined

      if (file) {
        const ext = file.name.split('.').pop() ?? 'jpg'
        const filename = `${user.id}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filename, file, { upsert: true })

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filename)

        avatar_url = publicUrl
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ nickname: nickname.trim(), ...(avatar_url && { avatar_url }) })
        .eq('id', user.id)

      if (updateError) throw updateError

      document.cookie = 'sb-onboarded=1; path=/; SameSite=Lax; max-age=604800'
      router.replace('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-900">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <div className="flex items-center gap-2">
              <Image src="/icon-192.png" alt="" width={32} height={32} className="rounded-lg" />
              <span className="text-xl font-bold tracking-tight text-[#E24B4A]">Zémato</span>
            </div>
          <h1 className="mt-4 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Configura o teu perfil
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Escolhe um nickname e, opcionalmente, uma foto.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-zinc-200 transition-opacity hover:opacity-80 dark:bg-zinc-700"
            >
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <IconUser size={32} stroke={1.5} className="text-zinc-400" />
              )}
              <span className="absolute inset-0 flex items-end justify-center bg-black/0 pb-1.5 opacity-0 transition-opacity hover:bg-black/20 hover:opacity-100">
                <IconCamera size={16} className="text-white" />
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <p className="text-xs text-zinc-400">
              {file ? file.name : 'Clica para adicionar foto'}
            </p>
          </div>

          {/* Nickname */}
          <input
            type="text"
            placeholder="Nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            required
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E24B4A]/40 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100 dark:placeholder:text-zinc-400"
          />

          <button
            type="submit"
            disabled={loading || !nickname.trim()}
            className="w-full rounded-lg bg-[#E24B4A] py-2 text-sm font-semibold text-white transition-colors hover:bg-[#c93b3a] disabled:opacity-50"
          >
            {loading ? 'A guardar…' : 'Continuar'}
          </button>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </form>
      </div>
    </div>
  )
}
