# Zémato

PWA de recomendações de restaurantes entre amigos, inspirada no conceito do extinto Zomato. Cada restaurante tem um único recomendador original (quem o adicionou ao mapa), e outros utilizadores podem registar visitas com avaliação de 1 a 5 estrelas.

## Stack

- **Next.js 16** — App Router, proxy (middleware), server + client components
- **Supabase** — Auth (magic link), PostgreSQL, Storage (avatares e fotos)
- **Leaflet / OpenStreetMap** — mapa interactivo com pins customizados
- **Tailwind CSS v4** — estilo, dark mode via `next-themes`

## Funcionalidades

- Mapa com pins por categoria (pizza, peixe, grelhados…), com avatar do recomendador sobreposto
- Modelo *first come, first served*: um restaurante = uma recomendação original + visitas de outros utilizadores
- Avaliações por estrelas (1–5) com comentário opcional; média visível no pin e na ficha
- Perfis com nickname e avatar (bucket `avatars` no Supabase Storage)
- Autenticação por magic link; onboarding obrigatório antes do primeiro acesso
- Ficha de restaurante com ligações directas ao Google Maps, Waze e Apple Maps
- Página de definições com histórico de recomendações e visitas do utilizador

## Setup local

```bash
git clone <repo-url>
cd zemato
npm install
```

Cria `.env.local` na raiz com as credenciais do projecto Supabase:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

Liga ao projecto Supabase e aplica as migrations:

```bash
npx supabase link --project-ref <project-ref>
npx supabase db push
```

Inicia o servidor de desenvolvimento:

```bash
npm run dev
```
