-- Remove artifacts from the previous profiles migration
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop table if exists public.profiles cascade;

-- ─── profiles ────────────────────────────────────────────────────────────────

create table public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  nickname   text,
  avatar_url text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "profiles: authenticated can select"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles: user can insert own"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "profiles: user can update own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ─── trigger: cria row vazia em profiles quando um utilizador é registado ─────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── storage: bucket avatars (público) ───────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- SELECT público (bucket já é público, sem restrição de autenticação)
create policy "avatars: public select"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- INSERT: só o próprio utilizador, para ficheiros cujo nome começa pelo seu UUID
create policy "avatars: authenticated insert own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and name like (auth.uid()::text || '%')
  );

-- UPDATE: mesma regra
create policy "avatars: authenticated update own"
  on storage.objects for update
  to authenticated
  using  (bucket_id = 'avatars' and name like (auth.uid()::text || '%'))
  with check (bucket_id = 'avatars' and name like (auth.uid()::text || '%'));

-- DELETE: mesma regra
create policy "avatars: authenticated delete own"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and name like (auth.uid()::text || '%'));
