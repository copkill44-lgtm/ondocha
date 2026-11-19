-- Run after schema.sql and community.sql in the Supabase SQL Editor.
-- Enable pg_cron in Supabase Database > Extensions first.
begin;
create schema if not exists private;
create table if not exists private.account_withdrawals (
 user_id uuid primary key references auth.users(id) on delete cascade,
 requested_at timestamptz not null default now(),
 delete_after timestamptz not null default (now() + interval '7 days')
);
alter table private.account_withdrawals enable row level security;
revoke all on private.account_withdrawals from public, anon, authenticated;

create or replace function public.request_account_withdrawal() returns void
language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 perform 1 from auth.users where id = auth.uid() for update;
 insert into private.account_withdrawals(user_id) values(auth.uid()) on conflict do nothing;
end $$;

create or replace function public.restore_withdrawn_account() returns text
language plpgsql security definer set search_path = '' as $$
declare deadline timestamptz;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 perform 1 from auth.users where id = auth.uid() for update;
 if not found then return 'expired'; end if;
 select delete_after into deadline from private.account_withdrawals where user_id = auth.uid() for update;
 if not found then return 'active'; end if;
 if now() >= deadline then
  delete from auth.users where id = auth.uid();
  return 'expired';
 end if;
 delete from private.account_withdrawals where user_id = auth.uid();
 return 'restored';
end $$;

create or replace function private.purge_withdrawn_accounts() returns void
language plpgsql security definer set search_path = '' as $$
begin
 -- Lock the same user row as restore to serialize recovery against deletion.
 perform u.id from auth.users u join private.account_withdrawals w on w.user_id=u.id
 where w.delete_after <= now() for update of u;
 delete from auth.users u using private.account_withdrawals w
 where u.id=w.user_id and w.delete_after <= now();
end $$;
revoke all on function public.request_account_withdrawal(), public.restore_withdrawn_account() from public, anon;
grant execute on function public.request_account_withdrawal(), public.restore_withdrawn_account() to authenticated;
revoke all on function private.purge_withdrawn_accounts() from public, anon, authenticated;
-- Expired accounts cannot read/write private data while awaiting the next purge.
create or replace function public.account_is_active() returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from auth.users where id=auth.uid()) and not exists(
 select 1 from private.account_withdrawals where user_id=auth.uid());
$$;
revoke all on function public.account_is_active() from public, anon;
grant execute on function public.account_is_active() to authenticated;
drop policy if exists "Withdrawal blocks app data" on public.user_app_data;
create policy "Withdrawal blocks app data" on public.user_app_data as restrictive
 for all to authenticated using (public.account_is_active()) with check (public.account_is_active());
-- Preserve publicly visible community content during the recovery period; block mutations.
do $$ declare t text; op text; begin
 foreach t in array array['community_posts','community_comments','community_likes'] loop
  foreach op in array array['insert','delete'] loop
   execute format('drop policy if exists %I on public.%I','Withdrawal blocks '||op,t);
   if op='insert' then
    execute format('create policy %I on public.%I as restrictive for insert to authenticated with check (public.account_is_active())','Withdrawal blocks '||op,t);
   else
    execute format('create policy %I on public.%I as restrictive for delete to authenticated using (public.account_is_active())','Withdrawal blocks '||op,t);
   end if;
  end loop;
 end loop;
end $$;
-- Fail the transaction if pg_cron is unavailable: never promise deletion without scheduling it.
do $$ begin
 if not exists(select 1 from cron.job where jobname='ondocha-purge-withdrawn-accounts') then
  perform cron.schedule('ondocha-purge-withdrawn-accounts','* * * * *','select private.purge_withdrawn_accounts()');
 end if;
end $$;
commit;
