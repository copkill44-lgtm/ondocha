-- Supabase SQL Editor에서 실행합니다. 비밀번호는 Supabase Auth가 관리합니다.
create table if not exists public.user_app_data (
    user_id uuid primary key references auth.users(id) on delete cascade,
    data jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now()
);

alter table public.user_app_data enable row level security;
revoke all on public.user_app_data from anon;
grant select, insert, update on public.user_app_data to authenticated;

drop policy if exists "Read own app data" on public.user_app_data;
create policy "Read own app data" on public.user_app_data
    for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Insert own app data" on public.user_app_data;
create policy "Insert own app data" on public.user_app_data
    for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Update own app data" on public.user_app_data;
create policy "Update own app data" on public.user_app_data
    for update to authenticated using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);
