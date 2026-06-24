create table restaurants (
  id               uuid primary key default gen_random_uuid(),
  osm_id           text,
  nome             text not null,
  endereco         text,
  lat              double precision,
  lng              double precision,
  cidade           text,
  categoria        text,
  google_place_id  text,
  created_by       uuid references auth.users,
  created_at       timestamptz default now()
);

create table recommendations (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users on delete cascade,
  restaurant_id       uuid not null references restaurants on delete cascade,
  comentario          text,
  prato_recomendado   text,
  created_at          timestamptz default now()
);

alter table restaurants    enable row level security;
alter table recommendations enable row level security;

-- restaurants policies
create policy "restaurants: authenticated can select"
  on restaurants for select
  to authenticated
  using (true);

create policy "restaurants: authenticated can insert"
  on restaurants for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "restaurants: owner can update"
  on restaurants for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "restaurants: owner can delete"
  on restaurants for delete
  to authenticated
  using (created_by = auth.uid());

-- recommendations policies
create policy "recommendations: authenticated can select"
  on recommendations for select
  to authenticated
  using (true);

create policy "recommendations: authenticated can insert"
  on recommendations for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "recommendations: owner can update"
  on recommendations for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "recommendations: owner can delete"
  on recommendations for delete
  to authenticated
  using (user_id = auth.uid());
