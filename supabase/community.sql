-- Run once in Supabase SQL Editor. Existing account data stays unchanged.
create table if not exists public.community_posts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 author_name text not null check (char_length(author_name) between 1 and 24),
 caption text not null default '' check (char_length(caption) <= 500),
 outfit jsonb not null check (jsonb_typeof(outfit) = 'object' and octet_length(outfit::text) <= 6000),
 appearance jsonb not null check (jsonb_typeof(appearance) = 'object' and octet_length(appearance::text) <= 1000),
 visual_index integer not null default 0 check (visual_index between 0 and 3),
 created_at timestamptz not null default now()
);
create table if not exists public.community_likes (
 post_id uuid not null references public.community_posts(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key (post_id, user_id)
);
create table if not exists public.community_comments (
 id uuid primary key default gen_random_uuid(),
 post_id uuid not null references public.community_posts(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 author_name text not null check (char_length(author_name) between 1 and 24),
 body text not null check (char_length(btrim(body)) between 1 and 300),
 created_at timestamptz not null default now()
);
create index if not exists community_posts_created_idx on public.community_posts(created_at desc, id desc);
create index if not exists community_comments_post_idx on public.community_comments(post_id, created_at);
alter table public.community_posts enable row level security;
alter table public.community_likes enable row level security;
alter table public.community_comments enable row level security;
revoke all on public.community_posts, public.community_likes, public.community_comments from anon, authenticated;
grant select on public.community_posts, public.community_likes, public.community_comments to anon, authenticated;
grant insert, delete on public.community_posts, public.community_likes, public.community_comments to authenticated;

drop policy if exists "Community posts public read" on public.community_posts;
create policy "Community posts public read" on public.community_posts for select using (true);
drop policy if exists "Community posts own insert" on public.community_posts;
create policy "Community posts own insert" on public.community_posts for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Community posts own delete" on public.community_posts;
create policy "Community posts own delete" on public.community_posts for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Community likes public read" on public.community_likes;
create policy "Community likes public read" on public.community_likes for select using (true);
drop policy if exists "Community likes own insert" on public.community_likes;
create policy "Community likes own insert" on public.community_likes for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Community likes own delete" on public.community_likes;
create policy "Community likes own delete" on public.community_likes for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Community comments public read" on public.community_comments;
create policy "Community comments public read" on public.community_comments for select using (true);
drop policy if exists "Community comments own insert" on public.community_comments;
create policy "Community comments own insert" on public.community_comments for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Community comments own delete" on public.community_comments;
create policy "Community comments own delete" on public.community_comments for delete to authenticated using ((select auth.uid()) = user_id);
