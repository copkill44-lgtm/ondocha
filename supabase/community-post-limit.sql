-- Apply after community.sql. Limits apply to posts created after installation.
begin;

create table if not exists public.community_post_limits (
    user_id uuid primary key references auth.users(id) on delete cascade,
    posted_at timestamptz[] not null default '{}'
);
alter table public.community_post_limits enable row level security;
revoke all on public.community_post_limits from public, anon, authenticated;

create or replace function public.enforce_community_post_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    history timestamptz[];
    attempted_at timestamptz;
    retry_at timestamptz;
begin
    insert into public.community_post_limits (user_id)
    values (new.user_id)
    on conflict (user_id) do nothing;

    select posted_at into strict history
    from public.community_post_limits
    where user_id = new.user_id
    for update;

    attempted_at := clock_timestamp();
    retry_at := history[5] + interval '1 hour';
    if attempted_at < retry_at then
        raise exception using
            message = 'COMMUNITY_POST_COOLDOWN',
            detail = ceil(extract(epoch from retry_at - attempted_at))::integer::text;
    end if;

    update public.community_post_limits
    set posted_at = array(
        select entry
        from unnest(history) with ordinality as posts(entry, position)
        where entry > attempted_at - interval '1 hour'
        order by position
    ) || attempted_at
    where user_id = new.user_id;

    return new;
end;
$$;

revoke all on function public.enforce_community_post_limit() from public, anon, authenticated;

drop trigger if exists community_post_limit on public.community_posts;
create trigger community_post_limit
after insert on public.community_posts
for each row execute function public.enforce_community_post_limit();

commit;
