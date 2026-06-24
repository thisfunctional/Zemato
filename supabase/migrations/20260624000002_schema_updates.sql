-- ─── restaurants: nova coluna preco, remove colunas de fontes externas ─────────

alter table public.restaurants add column if not exists preco text;

alter table public.restaurants drop column if exists osm_id;
alter table public.restaurants drop column if exists google_place_id;

-- ─── recommendations: nova coluna foto_url ────────────────────────────────────

alter table public.recommendations add column if not exists foto_url text;

-- ─── storage: bucket recommendation-photos (público para leitura) ─────────────

insert into storage.buckets (id, name, public)
values ('recommendation-photos', 'recommendation-photos', true)
on conflict (id) do nothing;

create policy "recommendation-photos: public select"
  on storage.objects for select
  using (bucket_id = 'recommendation-photos');

create policy "recommendation-photos: authenticated insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'recommendation-photos');

create policy "recommendation-photos: authenticated update"
  on storage.objects for update
  to authenticated
  using  (bucket_id = 'recommendation-photos')
  with check (bucket_id = 'recommendation-photos');

-- ─── grants explícitos para o role authenticated ──────────────────────────────

grant select, insert, update, delete on public.restaurants    to authenticated;
grant select, insert, update, delete on public.recommendations to authenticated;
