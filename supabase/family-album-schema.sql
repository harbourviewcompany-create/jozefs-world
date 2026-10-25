-- Private family album schema; deploy to a dedicated Supabase project.
create table if not exists public.family_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 family_id uuid not null,
 role text not null check (role in ('parent','child')),
 created_at timestamptz not null default now()
);
create table if not exists public.family_photos (
 id uuid primary key default gen_random_uuid(),
 family_id uuid not null,
 owner_id uuid not null references auth.users(id),
 object_path text not null unique,
 caption text not null default '' check (char_length(caption)<=240),
 created_at timestamptz not null default now()
);
create table if not exists public.family_photo_comments (
 id uuid primary key default gen_random_uuid(),
 photo_id uuid not null references public.family_photos(id) on delete cascade,
 author_id uuid not null references auth.users(id),
 body text not null check (char_length(body) between 1 and 500),
 created_at timestamptz not null default now()
);
create index if not exists family_photos_family_created_idx on public.family_photos(family_id,created_at desc);
create index if not exists family_comments_photo_created_idx on public.family_photo_comments(photo_id,created_at);
alter table public.family_members enable row level security;
alter table public.family_photos enable row level security;
alter table public.family_photo_comments enable row level security;
create policy "read own membership" on public.family_members for select to authenticated using (user_id=(select auth.uid()));
create policy "family photo read" on public.family_photos for select to authenticated using (exists(select 1 from public.family_members m where m.user_id=(select auth.uid()) and m.family_id=family_photos.family_id));
create policy "family photo insert" on public.family_photos for insert to authenticated with check (owner_id=(select auth.uid()) and exists(select 1 from public.family_members m where m.user_id=(select auth.uid()) and m.family_id=family_photos.family_id));
create policy "photo owner delete" on public.family_photos for delete to authenticated using (owner_id=(select auth.uid()) and exists(select 1 from public.family_members m where m.user_id=(select auth.uid()) and m.family_id=family_photos.family_id));
create policy "family comments read" on public.family_photo_comments for select to authenticated using (exists(select 1 from public.family_photos p join public.family_members m on m.family_id=p.family_id where p.id=family_photo_comments.photo_id and m.user_id=(select auth.uid())));
create policy "family comments write" on public.family_photo_comments for insert to authenticated with check (author_id=(select auth.uid()) and exists(select 1 from public.family_photos p join public.family_members m on m.family_id=p.family_id where p.id=family_photo_comments.photo_id and m.user_id=(select auth.uid())));
create policy "comment author delete" on public.family_photo_comments for delete to authenticated using (author_id=(select auth.uid()));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('family-photos','family-photos',false,10485760,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy "family image read" on storage.objects for select to authenticated using(bucket_id='family-photos' and exists(select 1 from public.family_members m where m.user_id=(select auth.uid()) and m.family_id::text=split_part(name,'/',1)));
create policy "family image upload" on storage.objects for insert to authenticated with check(bucket_id='family-photos' and exists(select 1 from public.family_members m where m.user_id=(select auth.uid()) and m.family_id::text=split_part(name,'/',1) and (select auth.uid())::text=split_part(name,'/',2)));
create policy "family image delete" on storage.objects for delete to authenticated using(bucket_id='family-photos' and exists(select 1 from public.family_members m where m.user_id=(select auth.uid()) and m.family_id::text=split_part(name,'/',1) and (select auth.uid())::text=split_part(name,'/',2)));
-- Provision membership rows only from a trusted administrator after each user's verified sign-in.
-- Never allow clients to insert or update memberships.
