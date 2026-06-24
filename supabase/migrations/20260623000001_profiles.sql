create table public.profiles (
  id   uuid primary key references auth.users on delete cascade,
  nome text
);

alter table public.profiles enable row level security;

-- Toda a gente autenticada pode ler perfis (necessário para "recomendado por X" no futuro)
create policy "profiles: authenticated can select"
  on public.profiles for select
  to authenticated
  using (true);

-- Cada utilizador só pode actualizar o próprio perfil
create policy "profiles: user can update own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Função invocada pelo trigger; security definer para ter permissão de escrita em public.profiles
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nome)
  values (
    new.id,
    new.raw_user_meta_data->>'nome'
  );
  return new;
end;
$$;

-- Trigger que corre após cada novo utilizador em auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
