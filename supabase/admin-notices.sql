-- Run in the Supabase SQL Editor after community.sql. Browser users cannot grant roles.
begin;
create schema if not exists private;
create table if not exists private.site_admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
revoke all on private.site_admins from public, anon, authenticated;
alter table private.site_admins enable row level security;
create or replace function public.is_site_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists(select 1 from private.site_admins where user_id = (select auth.uid())); $$;
revoke all on function public.is_site_admin() from public;
grant execute on function public.is_site_admin() to anon, authenticated;

do $$
declare target_user uuid; admin_email text;
begin
 foreach admin_email in array array['copkill44@gmail.com', 'copkill4@gmail.com'] loop
  select id into target_user from auth.users where lower(email) = admin_email and email_confirmed_at is not null;
  if target_user is null then raise exception 'The admin must first sign up and confirm %.', admin_email; end if;
  insert into private.site_admins(user_id) values(target_user) on conflict do nothing;
 end loop;
end $$;

create table if not exists public.site_notices (
 id text primary key default gen_random_uuid()::text,
 author_id uuid references auth.users(id) on delete set null default auth.uid(),
 title_ko text not null check(char_length(btrim(title_ko)) between 1 and 120),
 body_ko text not null check(char_length(btrim(body_ko)) between 1 and 10000),
 title_en text not null default '' check(char_length(title_en) <= 160),
 body_en text not null default '' check(char_length(body_en) <= 12000),
 category text not null default 'update' check(category in ('guide','update')),
 pinned boolean not null default false,
 published_at timestamptz not null default now()
);
create index if not exists site_notices_published_idx on public.site_notices(pinned desc,published_at desc);
alter table public.site_notices enable row level security;
revoke all on public.site_notices from public, anon, authenticated;
grant select on public.site_notices to anon, authenticated;
grant insert, update, delete on public.site_notices to authenticated;
drop policy if exists "Notices public read" on public.site_notices;
create policy "Notices public read" on public.site_notices for select using(true);
drop policy if exists "Notices admin insert" on public.site_notices;
create policy "Notices admin insert" on public.site_notices for insert to authenticated with check((select public.is_site_admin()) and author_id=(select auth.uid()));
drop policy if exists "Notices admin update" on public.site_notices;
create policy "Notices admin update" on public.site_notices for update to authenticated using((select public.is_site_admin())) with check((select public.is_site_admin()));
drop policy if exists "Notices admin delete" on public.site_notices;
create policy "Notices admin delete" on public.site_notices for delete to authenticated using((select public.is_site_admin()));
drop policy if exists "Community posts own delete" on public.community_posts;
create policy "Community posts own delete" on public.community_posts for delete to authenticated using((select auth.uid())=user_id or (select public.is_site_admin()));
drop policy if exists "Community comments own delete" on public.community_comments;
create policy "Community comments own delete" on public.community_comments for delete to authenticated using((select auth.uid())=user_id or (select public.is_site_admin()));
-- Initial notices are inserted below. Running this file again does not restore deleted notices.
create table if not exists private.notice_seed_state (id boolean primary key default true check(id));
revoke all on private.notice_seed_state from public, anon, authenticated;
do $$ begin
if not exists(select 1 from private.notice_seed_state) then
insert into public.site_notices(id,title_ko,body_ko,title_en,body_en,category,pinned,published_at) values
('20261110-welcome','온도차 이용 안내','온도차에서 날씨와 체감 온도, 일정에 맞는 코디를 만나보세요.

추천받은 코디는 캘린더에 저장하고 커뮤니티에서 공유할 수 있어요. 로그인하면 계정에 코디를 저장하고 코디니 AI 채팅도 이용할 수 있어요.','Welcome to Ondocha','Find outfit ideas for your weather, comfort and plans.

Save your looks to the calendar and share them with the community. Log in to save outfits to your account and chat with Codini.','guide',true,'2026-11-10T12:00:00+09:00'),
('20261110-language','한국어·영어 언어 설정을 추가했어요','화면 왼쪽 아래 또는 마이페이지에서 한국어와 English를 선택할 수 있어요.

선택한 언어는 이 기기에 저장됩니다. 직접 작성한 닉네임과 게시물, 댓글은 번역하지 않아요.','Korean and English language settings','Choose 한국어 or English from the bottom-left language selector or My page.

Your choice is saved on this device. Nicknames, posts and comments written by users stay in their original language.','update',false,'2026-11-10T12:00:00+09:00'),
('20261110-wardrobe','옷 선택과 추천이 더 다양해졌어요','상의는 반팔·긴팔·그 외를 선택한 뒤 옷 종류를 고를 수 있어요. 하의와 액세서리에도 새로운 아이콘을 적용했어요.

코디 추천은 날씨와 선택한 조건을 반영하며, 날씨에 따라 겉옷이 포함될 수 있어요. 직접 선택한 옷은 유지됩니다.','More clothing choices and outfit ideas','Choose short sleeves, long sleeves or other tops, then pick a clothing type. Bottoms and accessories also have new icons.

Outfit suggestions consider your weather and preferences and may include outerwear. Your selected items are preserved.','update',false,'2026-11-10T12:00:00+09:00')
on conflict(id) do nothing;
insert into private.notice_seed_state(id) values(true);
end if;
end $$;
commit;
