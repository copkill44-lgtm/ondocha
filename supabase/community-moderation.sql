-- Run after community.sql. Existing rows are preserved.
create or replace function public.community_text_is_allowed(value text)
returns boolean language plpgsql immutable set search_path = pg_catalog as $$
declare
 normalized text := replace(lower(normalize(coalesce(value, ''), NFKC)), '시발점', '');
 compact text;
 word text;
begin
 compact := regexp_replace(normalized, '[[:space:][:punct:]]', '', 'g');
 compact := replace(replace(replace(replace(compact, chr(8203), ''), chr(8204), ''), chr(8205), ''), chr(65279), '');
 foreach word in array array['씨발','시발','씨빨','시빨','개새끼','개새기','병신','븅신','좆','지랄','꺼져','닥쳐','창녀','걸레년','한남충','한녀충','틀딱','맘충','섹스','야동','포르노','죽어버려','죽여버릴','ㅅㅂ','ㅆㅂ','ㅂㅅ'] loop
  if strpos(compact, normalize(word, NFKC)) > 0 then return false; end if;
 end loop;
 return normalized !~ '(^|[^a-z])(fuck(ing|er|s)?|shit|bitch(es)?|porn)([^a-z]|$)';
end;
$$;
create or replace function public.moderate_community_text()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
 if not public.community_text_is_allowed(new.author_name) then
  raise exception using errcode = '23514', message = 'COMMUNITY_TEXT_BLOCKED';
 end if;
 if tg_table_name = 'community_posts' then
  if not public.community_text_is_allowed(new.caption) then
   raise exception using errcode = '23514', message = 'COMMUNITY_TEXT_BLOCKED';
  end if;
 elsif tg_table_name = 'community_comments' then
  if not public.community_text_is_allowed(new.body) then
   raise exception using errcode = '23514', message = 'COMMUNITY_TEXT_BLOCKED';
  end if;
 end if;
 return new;
end;
$$;
create or replace trigger community_posts_moderation before insert or update on public.community_posts
 for each row execute function public.moderate_community_text();
create or replace trigger community_comments_moderation before insert or update on public.community_comments
 for each row execute function public.moderate_community_text();
