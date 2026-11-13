-- EagleResearch: student accounts and saved labs
-- Paste this whole file into Supabase > SQL Editor > New query, then click Run.
-- Safe to run more than once.

-- 1) One row per (student, saved lab)
create table if not exists public.saved_labs (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  lab_id     text        not null check (char_length(lab_id) between 1 and 120),
  status     text        not null default 'considering'
             check (status in ('considering', 'emailed', 'applied', 'interview', 'joined', 'declined')),
  favorite   boolean     not null default false,
  notes      text        not null default '' check (char_length(notes) <= 5000),
  added_at   date        not null default current_date,
  updated_at timestamptz not null default now(),
  primary key (user_id, lab_id)
);

-- 2) Row-level security: a student can only see and change their own rows,
--    and only while signed in with a @bc.edu address.
alter table public.saved_labs enable row level security;

drop policy if exists "Students manage their own saved labs" on public.saved_labs;
create policy "Students manage their own saved labs"
  on public.saved_labs
  for all
  to authenticated
  using      (user_id = auth.uid() and lower(auth.jwt() ->> 'email') like '%@bc.edu')
  with check (user_id = auth.uid() and lower(auth.jwt() ->> 'email') like '%@bc.edu');

-- 2b) Faculty contact details (emails, phones, offices, application instructions,
--     profile/lab links). Readable ONLY by signed-in @bc.edu users; nobody can
--     change them from the website. Load the data with private/faculty_contacts.sql.
create table if not exists public.faculty_contacts (
  id         text        primary key,           -- professor id, or 'dept:<department id>'
  data       jsonb       not null,
  updated_at timestamptz not null default now()
);

alter table public.faculty_contacts enable row level security;

drop policy if exists "BC students can read faculty contacts" on public.faculty_contacts;
create policy "BC students can read faculty contacts"
  on public.faculty_contacts
  for select
  to authenticated
  using (lower(auth.jwt() ->> 'email') like '%@bc.edu');

-- 2c) Table permissions. Newer Supabase projects don't grant these automatically.
--     Signed-in users get access (the policies above still restrict it to @bc.edu
--     accounts and to each student's own saved labs). Signed-out visitors ("anon")
--     get nothing.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.saved_labs to authenticated;
grant select on public.faculty_contacts to authenticated;
revoke all on public.saved_labs from anon;
revoke all on public.faculty_contacts from anon;

-- 3) Only @bc.edu addresses can create accounts (enforced in the database,
--    not just in the website's sign-in form).
create or replace function public.enforce_bc_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null or lower(new.email) not like '%@bc.edu' then
    raise exception 'Only @bc.edu email addresses can create EagleResearch accounts';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_bc_email on auth.users;
create trigger enforce_bc_email
  before insert or update of email on auth.users
  for each row execute function public.enforce_bc_email();

-- 4) "Delete my account": a signed-in student can permanently delete their OWN
--    account (and, through the cascade, all their saved labs and notes).
--    It only ever acts on auth.uid(), the account making the request, so no one
--    can delete anyone else's account. Signed-out visitors can't call it.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Not signed in';
  end if;
  delete from public.saved_labs where user_id = me;
  delete from auth.users where id = me;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
