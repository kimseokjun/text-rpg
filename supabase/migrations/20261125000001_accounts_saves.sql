-- 1단계: 계정 프로필 + 클라우드 세이브
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (char_length(username) between 2 and 12),
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles readable by all" on public.profiles for select using (true);
create policy "profiles update own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- 가입 시 프로필 자동 생성 (아이디는 가입 메타데이터에서)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username) values (new.id, coalesce(new.raw_user_meta_data->>'username', 'user' || substr(new.id::text, 1, 6)));
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table if not exists public.saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  day int not null default 0,
  power int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.saves enable row level security;
create policy "saves select own" on public.saves for select using (auth.uid() = user_id);
create policy "saves insert own" on public.saves for insert with check (auth.uid() = user_id);
create policy "saves update own" on public.saves for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select on public.profiles to anon, authenticated;
grant update on public.profiles to authenticated;
grant select, insert, update on public.saves to authenticated;
