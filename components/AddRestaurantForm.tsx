'use client'

import { useRef, useState } from 'react'
import { IconUpload, IconX } from '@tabler/icons-react'
import { supabase } from '@/lib/supabase'

const CATEGORIAS = [
  'Portuguesa', 'Italiana', 'Japonesa', 'Indiana',
  'Churrasco/Grelhados', 'Pizza', 'Marisqueira', 'Outra',
]

const PRECOS = ['€', '€€', '€€€']

interface AddRestaurantFormProps {
  pinPosition: [number, number]
  onSuccess: () => void
  onCancel: () => void
}

export default function AddRestaurantForm({ pinPosition, onSuccess, onCancel }: AddRestaurantFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [nome, setNome] = useState('')
  const [categoria, setCategoria] = useState('')
  const [comentario, setComentario] = useState('')
  const [pratoRecomendado, setPratoRecomendado] = useState('')
  const [preco, setPreco] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (preview) URL.revokeObjectURL(preview)
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  function clearPhoto() {
    if (preview) URL.revokeObjectURL(preview)
    setFile(null)
    setPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sessão expirada. Volta a fazer login.')

      // 1. Upload foto (opcional)
      let fotoUrl: string | null = null
      if (file) {
        const ext = file.name.split('.').pop() ?? 'jpg'
        const filename = `${Date.now()}_${user.id}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('recommendation-photos')
          .upload(filename, file)
        if (uploadError) throw new Error(`Erro no upload da foto: ${uploadError.message}`)
        const { data: { publicUrl } } = supabase.storage
          .from('recommendation-photos')
          .getPublicUrl(filename)
        fotoUrl = publicUrl
      }

      // 2. Inserir restaurante
      const { data: restaurant, error: rError } = await supabase
        .from('restaurants')
        .insert({
          nome: nome.trim(),
          categoria: categoria || null,
          lat: pinPosition[0],
          lng: pinPosition[1],
          preco: preco || null,
          created_by: user.id,
        })
        .select('id')
        .single()
      if (rError) throw new Error(`Erro ao guardar restaurante: ${rError.message}`)

      // 3. Inserir recomendação
      const { error: recError } = await supabase
        .from('recommendations')
        .insert({
          restaurant_id: restaurant.id,
          user_id: user.id,
          comentario: comentario.trim() || null,
          prato_recomendado: pratoRecomendado.trim() || null,
          foto_url: fotoUrl,
        })
      if (recError) throw new Error(`Erro ao guardar recomendação: ${recError.message}`)

      onSuccess()
    } catch (err) {
      // Preserva os dados do formulário — só mostra o erro
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
      <div className="w-full overflow-y-auto rounded-t-2xl bg-white sm:max-w-lg sm:rounded-2xl dark:bg-zinc-800"
           style={{ maxHeight: '90dvh' }}>

        {/* Cabeçalho */}
        <div className="sticky top-0 flex items-center justify-between border-b border-zinc-200 bg-white px-5 py-4 dark:border-zinc-700 dark:bg-zinc-800">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Adicionar restaurante</h2>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
          >
            <IconX size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">

          {/* Foto */}
          <div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            {preview ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Preview" className="h-44 w-full rounded-xl object-cover" />
                <button
                  type="button"
                  onClick={clearPhoto}
                  className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white transition-colors hover:bg-black/70"
                >
                  <IconX size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 py-6 text-sm text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-600 dark:border-zinc-600 dark:text-zinc-400"
              >
                <IconUpload size={18} stroke={1.5} />
                Adicionar foto (opcional)
              </button>
            )}
          </div>

          {/* Nome */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Nome <span className="text-[#E24B4A]">*</span>
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome do restaurante"
              required
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#E24B4A]/40 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
            />
          </div>

          {/* Categoria + Preço — lado a lado */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Categoria</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#E24B4A]/40 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              >
                <option value="">—</option>
                {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Preço</label>
              <select
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#E24B4A]/40 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              >
                <option value="">—</option>
                {PRECOS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Prato recomendado */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Prato recomendado</label>
            <input
              type="text"
              value={pratoRecomendado}
              onChange={(e) => setPratoRecomendado(e.target.value)}
              placeholder="ex: Bacalhau à Brás"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#E24B4A]/40 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
            />
          </div>

          {/* Comentário */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Porque recomendas?</label>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Conta-nos mais sobre este restaurante…"
              rows={3}
              className="w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#E24B4A]/40 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
            />
          </div>

          {/* Erro — preserva os dados preenchidos */}
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </p>
          )}

          {/* Ações */}
          <div className="flex gap-3 pb-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-lg border border-zinc-300 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !nome.trim()}
              className="flex-1 rounded-lg bg-[#E24B4A] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#c93b3a] disabled:opacity-50"
            >
              {loading ? 'A guardar…' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
