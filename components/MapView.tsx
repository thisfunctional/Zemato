'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

// ─── Tabler SVG helpers ───────────────────────────────────────────────────────

function tablerSvg(paths: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`
}

const ICON_SVG = {
  pizza: tablerSvg(
    `<path stroke="none" d="M0 0h24v24H0z" fill="none"/>` +
    `<path d="M12 21.5c-3.04 0 -5.952 -.714 -8.5 -1.983l8.5 -16.517l8.5 16.517a19.09 19.09 0 0 1 -8.5 1.983"/>` +
    `<path d="M5.38 15.866a14.94 14.94 0 0 0 6.815 1.634a14.944 14.944 0 0 0 6.502 -1.479"/>` +
    `<path d="M13 11.01v-.01"/><path d="M11 14v-.01"/>`,
  ),
  fish: tablerSvg(
    `<path stroke="none" d="M0 0h24v24H0z" fill="none"/>` +
    `<path d="M16.69 7.44a6.973 6.973 0 0 0 -1.69 4.56c0 1.747 .64 3.345 1.699 4.571"/>` +
    `<path d="M2 9.504c7.715 8.647 14.75 10.265 20 2.498c-5.25 -7.761 -12.285 -6.142 -20 2.504"/>` +
    `<path d="M18 11v.01"/><path d="M11.5 10.5c-.667 1 -.667 2 0 3"/>`,
  ),
  meat: tablerSvg(
    `<path stroke="none" d="M0 0h24v24H0z" fill="none"/>` +
    `<path d="M13.62 8.382l1.966 -1.967a2 2 0 1 1 3.414 -1.415a2 2 0 1 1 -1.413 3.414l-1.82 1.821"/>` +
    `<path d="M5.904 18.596c2.733 2.734 5.9 4 7.07 2.829c1.172 -1.172 -.094 -4.338 -2.828 -7.071c-2.733 -2.734 -5.9 -4 -7.07 -2.829c-1.172 1.172 .094 4.338 2.828 7.071"/>` +
    `<path d="M7.5 16l1 1"/>` +
    `<path d="M12.975 21.425c3.905 -3.906 4.855 -9.288 2.121 -12.021c-2.733 -2.734 -8.115 -1.784 -12.02 2.121"/>`,
  ),
  default: tablerSvg(
    `<path stroke="none" d="M0 0h24v24H0z" fill="none"/>` +
    `<path d="M19 3v12h-5c-.023 -3.681 .184 -7.406 5 -12m0 12v6h-1v-3m-10 -14v17m-3 -17v3a3 3 0 1 0 6 0v-3"/>`,
  ),
}

function getCuisineSvg(categoria: string | null | undefined): string {
  if (!categoria) return ICON_SVG.default
  const c = categoria.toLowerCase()
  if (/pizza/.test(c)) return ICON_SVG.pizza
  if (/sushi|japanese|fish|seafood|marisco/.test(c)) return ICON_SVG.fish
  if (/grill|barbecue|churrasco|grelhado/.test(c)) return ICON_SVG.meat
  return ICON_SVG.default
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  nickname: string | null
  avatar_url: string | null
}

interface Recommendation {
  id: string
  comentario: string | null
  prato_recomendado: string | null
  created_at: string
  user_id: string
  profile: Profile | null
}

interface Restaurant {
  id: string
  nome: string
  lat: number
  lng: number
  categoria: string | null
  preco: string | null
  endereco: string | null
  recommendations: Recommendation[]
  visitsAvg: number | null
  visitsCount: number
}

export interface MapViewProps {
  addMode: boolean
  pinPosition: [number, number] | null
  onPinMove: (pos: [number, number]) => void
  onUserPosChange: (pos: [number, number]) => void
  refreshKey: number
}

// ─── Leaflet icons ────────────────────────────────────────────────────────────

function createPinIcon(categoria: string | null, avatarUrl: string | null): L.DivIcon {
  const iconSvg = getCuisineSvg(categoria)
  const avatarHtml = avatarUrl
    ? `<img src="${avatarUrl}" alt="" style="position:absolute;top:-5px;right:-5px;width:18px;height:18px;border-radius:50%;border:2px solid white;object-fit:cover" onerror="this.style.display='none'"/>`
    : ''
  return L.divIcon({
    html: `<div style="position:relative;width:36px;height:44px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.3))">
      <svg width="36" height="44" viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 2C9.163 2 2 9.163 2 18c0 9.941 16 26 16 26S34 27.941 34 18C34 9.163 26.837 2 18 2Z" fill="#E24B4A" stroke="white" stroke-width="1.5"/>
      </svg>
      <div style="position:absolute;top:5px;left:0;right:0;bottom:14px;display:flex;align-items:center;justify-content:center">${iconSvg}</div>
      ${avatarHtml}
    </div>`,
    className: '',
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -46],
  })
}

// Pin arrastável para o modo de colocação
const draggablePinIcon = L.divIcon({
  html: `<div style="position:relative;width:40px;height:50px;filter:drop-shadow(0 3px 8px rgba(0,0,0,.5))">
    <svg width="40" height="50" viewBox="0 0 40 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 2C10.059 2 2 10.059 2 20c0 11.046 18 30 18 30S38 31.046 38 20C38 10.059 29.941 2 20 2Z" fill="#1A1A1A" stroke="white" stroke-width="2"/>
    </svg>
    <div style="position:absolute;top:6px;left:0;right:0;bottom:16px;display:flex;align-items:center;justify-content:center">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M12 5l0 14"/><path d="M5 12l14 0"/>
      </svg>
    </div>
  </div>`,
  className: '',
  iconSize: [40, 50],
  iconAnchor: [20, 50],
})

const userLocationIcon = L.divIcon({
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#3B82F6;border:2.5px solid white;box-shadow:0 0 0 4px rgba(59,130,246,.25)"></div>`,
  className: '',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

// ─── Map sub-components ───────────────────────────────────────────────────────

function MapController({ userPos }: { userPos: [number, number] | null }) {
  const map = useMap()
  const flownRef = useRef(false)
  useEffect(() => {
    if (userPos && !flownRef.current) {
      flownRef.current = true
      map.flyTo(userPos, 14, { duration: 1.5 })
    }
  }, [userPos, map])
  return null
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MapView({
  addMode,
  pinPosition,
  onPinMove,
  onUserPosChange,
  refreshKey,
}: MapViewProps) {
  const [userPos, setUserPos] = useState<[number, number] | null>(null)
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])

  // Refs to keep callbacks stable without causing effect re-runs
  const onUserPosChangeRef = useRef(onUserPosChange)
  const onPinMoveRef = useRef(onPinMove)
  useEffect(() => { onUserPosChangeRef.current = onUserPosChange })
  useEffect(() => { onPinMoveRef.current = onPinMove })

  // Geolocation — runs once
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const pos: [number, number] = [coords.latitude, coords.longitude]
        setUserPos(pos)
        onUserPosChangeRef.current(pos)
      },
      () => {},
    )
  }, [])

  // Fetch restaurants — re-runs when refreshKey changes
  const fetchRestaurants = useCallback(async () => {
    type RecRow = { id: string; comentario: string | null; prato_recomendado: string | null; created_at: string; user_id: string }
    // UNIQUE(restaurant_id) → PostgREST devolve objeto singular, não array
    type RestRow = { id: string; nome: string; lat: number; lng: number; categoria: string | null; preco: string | null; endereco: string | null; recommendations: RecRow | null }

    const { data: rData, error } = await supabase
      .from('restaurants')
      .select('id, nome, lat, lng, categoria, preco, endereco, recommendations(id, comentario, prato_recomendado, created_at, user_id)')
      .not('lat', 'is', null)
      .not('lng', 'is', null)

    if (error || !rData) return
    const rows = rData as unknown as RestRow[]

    const userIds = [...new Set(rows.filter((r) => r.recommendations).map((r) => r.recommendations!.user_id))]
    const profileMap: Record<string, Profile> = {}
    if (userIds.length > 0) {
      const { data: pData } = await supabase
        .from('profiles')
        .select('id, nickname, avatar_url')
        .in('id', userIds)
      for (const p of pData ?? []) {
        profileMap[p.id] = { nickname: p.nickname as string | null, avatar_url: p.avatar_url as string | null }
      }
    }

    // Fetch visit ratings for all restaurants (lightweight: only restaurant_id + rating)
    const { data: visitsData } = await supabase
      .from('visits')
      .select('restaurant_id, rating')

    const visitsMap: Record<string, { total: number; count: number }> = {}
    for (const v of (visitsData ?? []) as { restaurant_id: string; rating: number }[]) {
      if (!visitsMap[v.restaurant_id]) visitsMap[v.restaurant_id] = { total: 0, count: 0 }
      visitsMap[v.restaurant_id].total += v.rating
      visitsMap[v.restaurant_id].count++
    }

    setRestaurants(
      rows.map((r) => ({
        ...r,
        // Normaliza para array de 1 elemento (ou vazio) para manter o tipo Restaurant.recommendations consistente
        recommendations: r.recommendations
          ? [{ ...r.recommendations, profile: profileMap[r.recommendations.user_id] ?? null }]
          : [],
        visitsAvg: visitsMap[r.id] ? visitsMap[r.id].total / visitsMap[r.id].count : null,
        visitsCount: visitsMap[r.id]?.count ?? 0,
      })),
    )
  }, [])

  useEffect(() => {
    void fetchRestaurants()
  }, [fetchRestaurants, refreshKey])

  return (
    <MapContainer center={[39.5, -8.0]} zoom={7} className="h-full w-full" zoomControl>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <MapController userPos={userPos} />

      {userPos && <Marker position={userPos} icon={userLocationIcon} />}

      {restaurants.map((r) => {
        const latestRec = [...r.recommendations].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )[0]
        const recommender = latestRec?.profile ?? null
        const icon = createPinIcon(r.categoria, recommender?.avatar_url ?? null)

        return (
          <Marker key={r.id} position={[r.lat, r.lng]} icon={icon}>
            <Popup>
              <div style={{ minWidth: '160px', fontFamily: 'inherit' }}>
                <Link
                  href={`/restaurante/${r.id}`}
                  style={{ fontWeight: 700, fontSize: '14px', display: 'block', marginBottom: '3px', color: '#E24B4A', textDecoration: 'none' }}
                >
                  {r.nome}
                </Link>
                {(r.categoria || r.preco) && (
                  <p style={{ fontSize: '12px', color: '#71717a', margin: '0' }}>
                    {r.categoria}{r.categoria && r.preco ? ' · ' : ''}{r.preco ?? ''}
                  </p>
                )}
                {r.visitsAvg !== null && (
                  <p style={{ fontSize: '12px', color: '#ca8a04', margin: '3px 0 0' }}>
                    {'★'.repeat(Math.round(r.visitsAvg))}{'☆'.repeat(5 - Math.round(r.visitsAvg))}
                    {' '}{r.visitsAvg.toFixed(1)} · {r.visitsCount} {r.visitsCount === 1 ? 'visita' : 'visitas'}
                  </p>
                )}
                {latestRec && recommender?.nickname && (
                  <p style={{ fontSize: '12px', margin: '6px 0 0', paddingTop: '6px', borderTop: '1px solid #f4f4f5' }}>
                    <strong>{recommender.nickname}</strong>
                    {' '}recomenda
                    {latestRec.prato_recomendado && (
                      <span style={{ color: '#71717a' }}> · {latestRec.prato_recomendado}</span>
                    )}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        )
      })}

      {/* Pin arrastável no modo de colocação */}
      {addMode && pinPosition && (
        <Marker
          position={pinPosition}
          draggable
          icon={draggablePinIcon}
          eventHandlers={{
            dragend: (e) => {
              const { lat, lng } = (e.target as L.Marker).getLatLng()
              onPinMoveRef.current([lat, lng])
            },
          }}
        />
      )}
    </MapContainer>
  )
}
