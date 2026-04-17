-- ============================================
-- Panel Gambar Bersuara - Supabase Schema
-- ============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- 1. PROFILES (extends Supabase auth.users)
-- ============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  name text not null default '',
  role text not null default 'siswa' check (role in ('guru', 'siswa', 'admin')),
  avatar_url text,
  school text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'siswa')
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- 2. CLASSROOMS
-- ============================================
create table public.classrooms (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  code text not null unique,
  teacher_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz not null default now()
);

alter table public.classrooms enable row level security;

create policy "Classrooms viewable by authenticated users"
  on public.classrooms for select using (auth.role() = 'authenticated');

create policy "Teachers can create classrooms"
  on public.classrooms for insert with check (auth.uid() = teacher_id);

create policy "Teachers can update own classrooms"
  on public.classrooms for update using (auth.uid() = teacher_id);

create policy "Teachers can delete own classrooms"
  on public.classrooms for delete using (auth.uid() = teacher_id);

-- ============================================
-- 3. CLASSROOM_MEMBERS
-- ============================================
create table public.classroom_members (
  id uuid primary key default uuid_generate_v4(),
  classroom_id uuid references public.classrooms(id) on delete cascade not null,
  student_id uuid references public.profiles(id) on delete cascade not null,
  joined_at timestamptz not null default now(),
  unique(classroom_id, student_id)
);

alter table public.classroom_members enable row level security;

create policy "Members viewable by authenticated users"
  on public.classroom_members for select using (auth.role() = 'authenticated');

create policy "Students can join classrooms"
  on public.classroom_members for insert with check (auth.uid() = student_id);

create policy "Teachers can manage members"
  on public.classroom_members for delete using (
    exists (
      select 1 from public.classrooms
      where id = classroom_id and teacher_id = auth.uid()
    )
  );

-- ============================================
-- 4. STORIES
-- ============================================
create table public.stories (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text not null default '',
  cover_image_url text,
  theme text not null default 'umum',
  level text not null default 'dasar' check (level in ('pemula', 'dasar', 'menengah', 'mahir')),
  target_class text not null default 'Kelas 1-2',
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  author_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.stories enable row level security;

create policy "Published stories are viewable by everyone"
  on public.stories for select using (
    status = 'published' or auth.uid() = author_id
  );

create policy "Teachers can create stories"
  on public.stories for insert with check (auth.uid() = author_id);

create policy "Authors can update own stories"
  on public.stories for update using (auth.uid() = author_id);

create policy "Authors can delete own stories"
  on public.stories for delete using (auth.uid() = author_id);

-- ============================================
-- 5. PANELS
-- ============================================
create table public.panels (
  id uuid primary key default uuid_generate_v4(),
  story_id uuid references public.stories(id) on delete cascade not null,
  order_index int not null default 0,
  image_url text,
  background_color text not null default '#f0f9ff',
  narration_text text,
  narration_audio_url text,
  background_audio_url text,
  created_at timestamptz not null default now()
);

alter table public.panels enable row level security;

create policy "Panels viewable if story is viewable"
  on public.panels for select using (
    exists (
      select 1 from public.stories
      where id = story_id and (status = 'published' or author_id = auth.uid())
    )
  );

create policy "Authors can manage panels"
  on public.panels for insert with check (
    exists (
      select 1 from public.stories
      where id = story_id and author_id = auth.uid()
    )
  );

create policy "Authors can update panels"
  on public.panels for update using (
    exists (
      select 1 from public.stories
      where id = story_id and author_id = auth.uid()
    )
  );

create policy "Authors can delete panels"
  on public.panels for delete using (
    exists (
      select 1 from public.stories
      where id = story_id and author_id = auth.uid()
    )
  );

-- ============================================
-- 6. DIALOGS
-- ============================================
create table public.dialogs (
  id uuid primary key default uuid_generate_v4(),
  panel_id uuid references public.panels(id) on delete cascade not null,
  order_index int not null default 0,
  character_name text not null default 'Karakter',
  character_color text not null default '#3b82f6',
  text text not null default '',
  audio_url text,
  bubble_style text not null default 'oval' check (bubble_style in ('oval', 'kotak', 'awan', 'ledakan')),
  position_x float not null default 50,
  position_y float not null default 20,
  created_at timestamptz not null default now()
);

alter table public.dialogs enable row level security;

create policy "Dialogs viewable if panel is viewable"
  on public.dialogs for select using (
    exists (
      select 1 from public.panels p
      join public.stories s on s.id = p.story_id
      where p.id = panel_id and (s.status = 'published' or s.author_id = auth.uid())
    )
  );

create policy "Authors can manage dialogs"
  on public.dialogs for insert with check (
    exists (
      select 1 from public.panels p
      join public.stories s on s.id = p.story_id
      where p.id = panel_id and s.author_id = auth.uid()
    )
  );

create policy "Authors can update dialogs"
  on public.dialogs for update using (
    exists (
      select 1 from public.panels p
      join public.stories s on s.id = p.story_id
      where p.id = panel_id and s.author_id = auth.uid()
    )
  );

create policy "Authors can delete dialogs"
  on public.dialogs for delete using (
    exists (
      select 1 from public.panels p
      join public.stories s on s.id = p.story_id
      where p.id = panel_id and s.author_id = auth.uid()
    )
  );

-- ============================================
-- 7. RECORDINGS (student voice recordings)
-- ============================================
create table public.recordings (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references public.profiles(id) on delete cascade not null,
  story_id uuid references public.stories(id) on delete cascade not null,
  panel_id uuid references public.panels(id) on delete cascade not null,
  dialog_id uuid references public.dialogs(id) on delete set null,
  type text not null default 'dialog' check (type in ('dialog', 'narration')),
  audio_url text not null,
  feedback_score int check (feedback_score >= 1 and feedback_score <= 5),
  feedback_text text,
  created_at timestamptz not null default now()
);

alter table public.recordings enable row level security;

create policy "Students can view own recordings"
  on public.recordings for select using (
    auth.uid() = student_id
    or exists (
      select 1 from public.stories
      where id = story_id and author_id = auth.uid()
    )
  );

create policy "Students can create recordings"
  on public.recordings for insert with check (auth.uid() = student_id);

create policy "Students can delete own recordings"
  on public.recordings for delete using (auth.uid() = student_id);

create policy "Teachers can update recordings (feedback)"
  on public.recordings for update using (
    exists (
      select 1 from public.stories
      where id = story_id and author_id = auth.uid()
    )
  );

-- ============================================
-- 8. ASSIGNMENTS
-- ============================================
create table public.assignments (
  id uuid primary key default uuid_generate_v4(),
  story_id uuid references public.stories(id) on delete cascade not null,
  class_id uuid references public.classrooms(id) on delete cascade not null,
  deadline timestamptz,
  note text,
  created_at timestamptz not null default now()
);

alter table public.assignments enable row level security;

create policy "Assignments viewable by class members and teachers"
  on public.assignments for select using (
    exists (
      select 1 from public.classrooms
      where id = class_id and teacher_id = auth.uid()
    )
    or exists (
      select 1 from public.classroom_members
      where classroom_id = class_id and student_id = auth.uid()
    )
  );

create policy "Teachers can create assignments"
  on public.assignments for insert with check (
    exists (
      select 1 from public.classrooms
      where id = class_id and teacher_id = auth.uid()
    )
  );

create policy "Teachers can delete assignments"
  on public.assignments for delete using (
    exists (
      select 1 from public.classrooms
      where id = class_id and teacher_id = auth.uid()
    )
  );

-- ============================================
-- 9. LIVE SESSIONS (collaborative reading)
-- ============================================
create table public.live_sessions (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  story_id uuid references public.stories(id) on delete cascade not null,
  host_id uuid references public.profiles(id) on delete cascade not null,
  status text not null default 'waiting' check (status in ('waiting', 'active', 'finished')),
  current_panel_index int not null default 0,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

alter table public.live_sessions enable row level security;

create policy "Live sessions viewable by authenticated users"
  on public.live_sessions for select using (auth.role() = 'authenticated');

create policy "Teachers can create live sessions"
  on public.live_sessions for insert with check (auth.uid() = host_id);

create policy "Hosts can update own sessions"
  on public.live_sessions for update using (auth.uid() = host_id);

create policy "Hosts can delete own sessions"
  on public.live_sessions for delete using (auth.uid() = host_id);

-- ============================================
-- 10. SESSION PARTICIPANTS
-- ============================================
create table public.session_participants (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references public.live_sessions(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  assigned_character text,
  assigned_color text default '#3b82f6',
  is_narrator boolean not null default false,
  joined_at timestamptz not null default now(),
  unique(session_id, user_id)
);

alter table public.session_participants enable row level security;

create policy "Participants viewable by authenticated users"
  on public.session_participants for select using (auth.role() = 'authenticated');

create policy "Users can join sessions"
  on public.session_participants for insert with check (auth.uid() = user_id);

create policy "Hosts can manage participants"
  on public.session_participants for update using (
    exists (
      select 1 from public.live_sessions
      where id = session_id and host_id = auth.uid()
    )
  );

create policy "Users can leave sessions"
  on public.session_participants for delete using (
    auth.uid() = user_id
    or exists (
      select 1 from public.live_sessions
      where id = session_id and host_id = auth.uid()
    )
  );

-- ============================================
-- STORAGE BUCKETS
-- ============================================
-- Run these in Supabase Dashboard > Storage or via API:
-- 
-- 1. Create bucket: "panel-images" (public)
-- 2. Create bucket: "audio" (public)
-- 3. Create bucket: "avatars" (public)
--
-- Storage policies (apply via SQL after creating buckets):

insert into storage.buckets (id, name, public) values ('panel-images', 'panel-images', true);
insert into storage.buckets (id, name, public) values ('audio', 'audio', true);
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);

-- Allow authenticated users to upload to panel-images
create policy "Authenticated users can upload panel images"
  on storage.objects for insert
  with check (bucket_id = 'panel-images' and auth.role() = 'authenticated');

create policy "Anyone can view panel images"
  on storage.objects for select
  using (bucket_id = 'panel-images');

-- Allow authenticated users to upload audio
create policy "Authenticated users can upload audio"
  on storage.objects for insert
  with check (bucket_id = 'audio' and auth.role() = 'authenticated');

create policy "Anyone can view audio"
  on storage.objects for select
  using (bucket_id = 'audio');

-- Allow users to upload own avatar
create policy "Users can upload own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

create policy "Anyone can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Allow authenticated users to delete their own uploads
create policy "Users can delete own panel images"
  on storage.objects for delete
  using (bucket_id = 'panel-images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete own audio"
  on storage.objects for delete
  using (bucket_id = 'audio' and auth.uid()::text = (storage.foldername(name))[1]);
