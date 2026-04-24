-- ============================================
-- Panel Gambar Bersuara - Migration V5
-- New: AR Scenes (Panel AR) — user-created AR experiences + storage bucket
-- ============================================

-- 1. AR_SCENES table
create table if not exists public.ar_scenes (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  subject text not null default 'lainnya',
  level text not null default 'SD',
  type text not null check (type in ('marker', 'markerless', 'model-only')),
  cover_image text,
  marker_image text,
  marker_mind_file text,
  instruction text,
  /** Array of ARAsset objects: { id, name, src, transform, audioUrl, audioTrigger, animationName } */
  assets jsonb not null default '[]'::jsonb,
  author_id uuid references public.profiles(id) on delete cascade,
  status text not null default 'published' check (status in ('draft', 'published')),
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists ar_scenes_author_idx on public.ar_scenes(author_id);
create index if not exists ar_scenes_slug_idx on public.ar_scenes(slug);

-- Trigger: auto-update updated_at
create or replace function public.set_ar_scenes_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists ar_scenes_updated_at on public.ar_scenes;
create trigger ar_scenes_updated_at
  before update on public.ar_scenes
  for each row execute function public.set_ar_scenes_updated_at();

-- 2. RLS policies
alter table public.ar_scenes enable row level security;

drop policy if exists "AR scenes viewable by public or author or admin" on public.ar_scenes;
create policy "AR scenes viewable by public or author or admin"
  on public.ar_scenes for select using (
    (status = 'published' and visibility = 'public')
    or auth.uid() = author_id
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "Authenticated users can insert AR scenes" on public.ar_scenes;
create policy "Authenticated users can insert AR scenes"
  on public.ar_scenes for insert with check (
    auth.uid() = author_id
  );

drop policy if exists "Authors and admins can update AR scenes" on public.ar_scenes;
create policy "Authors and admins can update AR scenes"
  on public.ar_scenes for update using (
    auth.uid() = author_id
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "Authors and admins can delete AR scenes" on public.ar_scenes;
create policy "Authors and admins can delete AR scenes"
  on public.ar_scenes for delete using (
    auth.uid() = author_id
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 3. STORAGE BUCKET for AR assets (GLB/GLTF, marker images, .mind files, audio, covers)
insert into storage.buckets (id, name, public)
values ('ar-assets', 'ar-assets', true)
on conflict (id) do nothing;

-- Storage policies: public can READ, authenticated users can upload/delete their own files
drop policy if exists "Authenticated users can upload AR assets" on storage.objects;
create policy "Authenticated users can upload AR assets"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'ar-assets');

drop policy if exists "AR assets are publicly viewable" on storage.objects;
create policy "AR assets are publicly viewable"
  on storage.objects for select using (bucket_id = 'ar-assets');

drop policy if exists "Users can update own AR assets" on storage.objects;
create policy "Users can update own AR assets"
  on storage.objects for update to authenticated
  using (bucket_id = 'ar-assets' and owner = auth.uid());

drop policy if exists "Users can delete own AR assets" on storage.objects;
create policy "Users can delete own AR assets"
  on storage.objects for delete to authenticated
  using (bucket_id = 'ar-assets' and owner = auth.uid());
