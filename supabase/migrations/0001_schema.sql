-- النشاط الثقافي 1448 هـ — المخطط الأساسي
create extension if not exists pgcrypto with schema extensions;

-- ============ المشرفون ============
create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null,
  role text not null default 'supervisor' check (role in ('owner', 'supervisor')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid() and role = 'owner');
$$;

-- ============ المجموعات والأعضاء ============
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#0F4C3A',
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create sequence public.member_no_seq start 1001;

create table public.members (
  id uuid primary key default gen_random_uuid(),
  member_no int not null unique default nextval('public.member_no_seq'),
  code text not null unique default ('AN' || upper(encode(extensions.gen_random_bytes(5), 'hex'))),
  name text not null check (length(trim(name)) > 0),
  group_id uuid references public.groups(id) on delete set null,
  is_leader boolean not null default false,
  points int not null default 0,
  yellow_cards int not null default 0,
  red_cards int not null default 0,
  excluded boolean not null default false,
  created_at timestamptz not null default now()
);
create index members_group_idx on public.members(group_id);

-- بيانات خاصة لا تظهر للعامة
create table public.member_private (
  member_id uuid primary key references public.members(id) on delete cascade,
  phone text unique,
  notes text
);

create or replace view public.group_totals with (security_invoker = true) as
  select g.id, g.name, g.color, g.sort,
         coalesce(sum(m.points), 0)::int as points,
         count(m.id)::int as members_count
  from public.groups g
  left join public.members m on m.group_id = g.id
  group by g.id;

-- ============ التحضير ============
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  created_at timestamptz not null default now()
);

create table public.attendance (
  session_id uuid not null references public.sessions(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  status text not null default 'present' check (status in ('present', 'late')),
  points int not null default 0,
  ts timestamptz not null default now(),
  by_name text,
  primary key (session_id, member_id)
);
create index attendance_member_idx on public.attendance(member_id);

-- ============ السجل ============
create table public.logs (
  id bigint generated always as identity primary key,
  ts timestamptz not null default now(),
  member_id uuid references public.members(id) on delete set null,
  member_name text,
  group_id uuid references public.groups(id) on delete set null,
  type text not null check (type in ('points', 'card', 'attendance', 'transfer', 'badge', 'edit', 'undo')),
  title text not null,
  delta int not null default 0,
  payload jsonb not null default '{}'::jsonb,
  inverse jsonb,
  admin_id uuid,
  admin_name text,
  reverted_at timestamptz,
  reverted_by text,
  undo_of bigint references public.logs(id) on delete set null
);
create index logs_ts_idx on public.logs(ts desc, id desc);
create index logs_member_idx on public.logs(member_id, ts desc);

-- ============ اللائحة والأوسمة ============
create table public.point_rules (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  value int not null,
  category text not null default 'عام',
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  icon text not null default 'award',
  color text not null default '#C9A24B',
  points int not null default 0,
  created_at timestamptz not null default now()
);

create table public.member_badges (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  by_name text,
  note text
);
create index member_badges_member_idx on public.member_badges(member_id);

-- ============ الإعدادات ============
create table public.settings (
  id int primary key default 1 check (id = 1),
  attendance_points int not null default 25,
  late_points int not null default 15,
  late_after time,
  yellow_penalty int not null default 0,
  red_penalty int not null default 0,
  red_excludes boolean not null default true,
  freeze_results boolean not null default false,
  show_live_feed boolean not null default true,
  sound_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (1);

-- ============ المحتوى ============
create table public.post_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null default '#0F4C3A',
  sort int not null default 0
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  event_date date not null default (now() at time zone 'Asia/Riyadh')::date,
  image_path text,
  category_id uuid references public.post_categories(id) on delete set null,
  published boolean not null default true,
  created_at timestamptz not null default now()
);
create index posts_date_idx on public.posts(event_date desc);

create table public.site_content (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ============ RLS ============
alter table public.admins enable row level security;
alter table public.groups enable row level security;
alter table public.members enable row level security;
alter table public.member_private enable row level security;
alter table public.sessions enable row level security;
alter table public.attendance enable row level security;
alter table public.logs enable row level security;
alter table public.point_rules enable row level security;
alter table public.badges enable row level security;
alter table public.member_badges enable row level security;
alter table public.settings enable row level security;
alter table public.post_categories enable row level security;
alter table public.posts enable row level security;
alter table public.site_content enable row level security;

-- قراءة عامة
create policy "public read" on public.groups for select using (true);
create policy "public read" on public.members for select using (true);
create policy "public read" on public.sessions for select using (true);
create policy "public read" on public.attendance for select using (true);
create policy "public read" on public.logs for select using (true);
create policy "public read" on public.point_rules for select using (true);
create policy "public read" on public.badges for select using (true);
create policy "public read" on public.member_badges for select using (true);
create policy "public read" on public.settings for select using (true);
create policy "public read" on public.post_categories for select using (true);
create policy "public read" on public.posts for select using (published or public.is_admin());
create policy "public read" on public.site_content for select using (true);

-- المشرفون
create policy "admins read" on public.admins for select using (public.is_admin());
create policy "admin private read" on public.member_private for select using (public.is_admin());

-- كتابة المدير العام (العمليات على النقاط تتم عبر الدوال فقط)
create policy "owner write" on public.groups for all using (public.is_owner()) with check (public.is_owner());
create policy "owner insert" on public.members for insert with check (public.is_owner());
create policy "owner delete" on public.members for delete using (public.is_owner());
create policy "owner write" on public.member_private for all using (public.is_owner()) with check (public.is_owner());
create policy "owner write" on public.point_rules for all using (public.is_owner()) with check (public.is_owner());
create policy "owner write" on public.badges for all using (public.is_owner()) with check (public.is_owner());
create policy "owner write" on public.settings for update using (public.is_owner()) with check (public.is_owner());
create policy "owner write" on public.post_categories for all using (public.is_owner()) with check (public.is_owner());
create policy "owner write" on public.posts for all using (public.is_owner()) with check (public.is_owner());
create policy "owner write" on public.site_content for all using (public.is_owner()) with check (public.is_owner());
create policy "owner delete" on public.sessions for delete using (public.is_owner());

-- ============ Realtime ============
alter publication supabase_realtime add table
  public.groups, public.members, public.logs, public.attendance,
  public.settings, public.posts, public.member_badges, public.badges, public.point_rules;

-- ============ التخزين ============
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 3145728, array['image/webp', 'image/jpeg', 'image/png']);

create policy "media public read" on storage.objects for select using (bucket_id = 'media');
create policy "media owner insert" on storage.objects for insert with check (bucket_id = 'media' and public.is_owner());
create policy "media owner update" on storage.objects for update using (bucket_id = 'media' and public.is_owner());
create policy "media owner delete" on storage.objects for delete using (bucket_id = 'media' and public.is_owner());
