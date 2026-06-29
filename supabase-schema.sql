create table if not exists public.timetable_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  favorites jsonb not null default '[]'::jsonb,
  important jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.timetable_preferences enable row level security;

drop policy if exists "Users can read their own timetable preferences" on public.timetable_preferences;
create policy "Users can read their own timetable preferences"
  on public.timetable_preferences
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own timetable preferences" on public.timetable_preferences;
create policy "Users can insert their own timetable preferences"
  on public.timetable_preferences
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own timetable preferences" on public.timetable_preferences;
create policy "Users can update their own timetable preferences"
  on public.timetable_preferences
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null default 'Timetable',
  avatar_data_url text not null default '',
  avatar_url text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists avatar_url text not null default '';

-- Remove legacy base64 avatars from Auth metadata. They make JWT headers too large.
update auth.users
set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
  - 'avatarDataUrl'
  - 'avatarUrl'
where coalesce(raw_user_meta_data, '{}'::jsonb) ?| array['avatarDataUrl', 'avatarUrl'];

alter table public.profiles
  drop constraint if exists profiles_username_length;
alter table public.profiles
  add constraint profiles_username_length
  check (char_length(trim(username)) between 1 and 40);

alter table public.profiles
  drop constraint if exists profiles_avatar_size;
alter table public.profiles
  add constraint profiles_avatar_size
  check (octet_length(avatar_data_url) <= 500000);

alter table public.profiles
  drop constraint if exists profiles_avatar_url_length;
alter table public.profiles
  add constraint profiles_avatar_url_length
  check (char_length(avatar_url) <= 1000);

alter table public.profiles enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.parties (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.parties
  drop constraint if exists parties_code_format;
alter table public.parties
  add constraint parties_code_format
  check (code ~ '^[A-Z0-9]{6}$');

alter table public.parties enable row level security;

drop policy if exists "Authenticated users can read parties" on public.parties;
drop policy if exists "Authenticated users can create parties" on public.parties;

create table if not exists public.party_members (
  party_id uuid not null references public.parties(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (party_id, user_id)
);

alter table public.party_members enable row level security;

create or replace function public.can_access_party(target_party_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.party_members
    where party_id = target_party_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.shares_party(other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() = other_user_id
    or exists (
      select 1
      from public.party_members mine
      join public.party_members theirs on theirs.party_id = mine.party_id
      where mine.user_id = auth.uid()
        and theirs.user_id = other_user_id
    );
$$;

revoke all on function public.can_access_party(uuid) from public;
revoke all on function public.shares_party(uuid) from public;
grant execute on function public.can_access_party(uuid) to authenticated;
grant execute on function public.shares_party(uuid) to authenticated;

drop policy if exists "Authenticated users can read profiles for parties" on public.profiles;
drop policy if exists "Party members can read profiles" on public.profiles;
create policy "Party members can read profiles"
  on public.profiles
  for select
  to authenticated
  using (public.shares_party(user_id));

drop policy if exists "Authenticated users can read timetable preferences for parties" on public.timetable_preferences;
drop policy if exists "Party members can read timetable preferences" on public.timetable_preferences;
create policy "Party members can read timetable preferences"
  on public.timetable_preferences
  for select
  to authenticated
  using (public.shares_party(user_id));

drop policy if exists "Authenticated users can read parties" on public.parties;
drop policy if exists "Party members can read their party" on public.parties;
create policy "Party members can read their party"
  on public.parties
  for select
  to authenticated
  using (owner_user_id = auth.uid() or public.can_access_party(id));

drop policy if exists "Authenticated users can create parties" on public.parties;

drop policy if exists "Authenticated users can read party members" on public.party_members;
drop policy if exists "Party members can read party members" on public.party_members;
create policy "Party members can read party members"
  on public.party_members
  for select
  to authenticated
  using (public.can_access_party(party_id));

drop policy if exists "Users can join parties as themselves" on public.party_members;
drop policy if exists "Users can update their own party membership" on public.party_members;

drop policy if exists "Users can leave parties" on public.party_members;
create policy "Users can leave parties"
  on public.party_members
  for delete
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.create_party()
returns table (id uuid, code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  created_party public.parties;
  generated_code text;
  attempt integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  delete from public.party_members where user_id = auth.uid();

  loop
    attempt := attempt + 1;
    select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::integer, 1), '')
      into generated_code
      from generate_series(1, 6);

    begin
      insert into public.parties (code, owner_user_id)
      values (generated_code, auth.uid())
      returning * into created_party;
      exit;
    exception when unique_violation then
      if attempt >= 10 then
        raise;
      end if;
    end;
  end loop;

  insert into public.party_members (party_id, user_id)
  values (created_party.id, auth.uid());

  return query select created_party.id, created_party.code;
end;
$$;

create or replace function public.join_party_by_code(input_code text)
returns table (id uuid, code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_party public.parties;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if input_code is null or length(trim(input_code)) <> 6 then
    return;
  end if;

  select *
    into matched_party
    from public.parties p
    where p.code = upper(trim(input_code))
    limit 1;

  if matched_party.id is null then
    return;
  end if;

  delete from public.party_members where user_id = auth.uid();
  insert into public.party_members (party_id, user_id)
  values (matched_party.id, auth.uid())
  on conflict (party_id, user_id) do nothing;

  return query select matched_party.id, matched_party.code;
end;
$$;

revoke all on function public.create_party() from public;
revoke all on function public.join_party_by_code(text) from public;
grant execute on function public.create_party() to authenticated;
grant execute on function public.join_party_by_code(text) to authenticated;

create or replace function public.delete_current_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  delete from auth.users where id = current_user_id;
end;
$$;

revoke all on function public.delete_current_account() from public;
grant execute on function public.delete_current_account() to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  524288,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read their own avatar object" on storage.objects;
create policy "Users can read their own avatar object"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
