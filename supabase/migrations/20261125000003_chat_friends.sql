-- 3단계: 전체 채팅 + 친구
create table if not exists public.chat_messages (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  username text not null default '',
  channel text not null default 'global',
  body text not null check (char_length(body) between 1 and 200),
  created_at timestamptz not null default now()
);
alter table public.chat_messages enable row level security;
create policy "chat readable by signed in" on public.chat_messages for select to authenticated using (true);
create policy "chat insert own" on public.chat_messages for insert to authenticated with check (auth.uid() = user_id);
grant select, insert on public.chat_messages to authenticated;
create index if not exists chat_channel_idx on public.chat_messages (channel, id desc);

-- 이름은 서버가 채움 + 도배 방지 (1.5초에 1번)
create or replace function public.chat_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.user_id := auth.uid();
  new.username := (select username from public.profiles where id = new.user_id);
  new.created_at := now();
  if exists (select 1 from public.chat_messages where user_id = new.user_id and created_at > now() - interval '1.5 seconds') then
    raise exception 'too fast' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists chat_guard on public.chat_messages;
create trigger chat_guard before insert on public.chat_messages for each row execute function public.chat_guard();

do $$ begin
  alter publication supabase_realtime add table public.chat_messages;
exception when duplicate_object then null; when undefined_object then null; end $$;

-- 친구
create table if not exists public.friendships (
  id bigint generated always as identity primary key,
  requester uuid not null references auth.users(id) on delete cascade default auth.uid(),
  addressee uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  check (requester <> addressee)
);
create unique index if not exists friendships_pair on public.friendships (least(requester, addressee), greatest(requester, addressee));
alter table public.friendships enable row level security;
create policy "friends visible to both" on public.friendships for select to authenticated using (auth.uid() in (requester, addressee));
create policy "friends request" on public.friendships for insert to authenticated with check (auth.uid() = requester and status = 'pending');
create policy "friends accept" on public.friendships for update to authenticated using (auth.uid() = addressee) with check (auth.uid() = addressee and status = 'accepted');
create policy "friends remove" on public.friendships for delete to authenticated using (auth.uid() in (requester, addressee));
grant select, insert, update, delete on public.friendships to authenticated;
do $$ begin
  alter publication supabase_realtime add table public.friendships;
exception when duplicate_object then null; when undefined_object then null; end $$;
