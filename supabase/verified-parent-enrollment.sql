-- Applied to dedicated Jozef's World Supabase project.
-- A verified owner email is the only automatic enrollment path.
create schema if not exists family_private;
revoke all on schema family_private from public, anon, authenticated;
create or replace function family_private.enroll_verified_parent()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if lower(new.email)='tylercampbell5@outlook.com' and new.email_confirmed_at is not null then
  insert into public.family_members(user_id,family_id,role)
  values(new.id,'7c648728-3b37-4786-bd9d-7bcd0d6b86b2'::uuid,'parent')
  on conflict(user_id) do nothing;
 end if;
 return new;
end $$;
revoke all on function family_private.enroll_verified_parent() from public,anon,authenticated;
drop trigger if exists enroll_verified_family_parent on auth.users;
create trigger enroll_verified_family_parent after insert or update of email_confirmed_at
on auth.users for each row execute function family_private.enroll_verified_parent();
insert into public.family_members(user_id,family_id,role)
select id,'7c648728-3b37-4786-bd9d-7bcd0d6b86b2'::uuid,'parent'
from auth.users where lower(email)='tylercampbell5@outlook.com' and email_confirmed_at is not null
on conflict(user_id) do nothing;
