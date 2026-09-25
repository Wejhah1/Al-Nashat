-- المواسم (الفصول الدراسية) والإجازات
create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  weekly_off int[] not null default '{5,6}', -- 0=الأحد … 5=الجمعة 6=السبت
  is_active boolean not null default false,
  carried_points boolean not null default false,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  check (end_date >= start_date)
);
create unique index seasons_one_active on public.seasons (is_active) where is_active;

create table public.holidays (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);
create index holidays_season_idx on public.holidays(season_id, start_date);

-- أرشيف نتائج المواسم المنتهية
create table public.season_results (
  season_id uuid not null references public.seasons(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  member_name text not null,
  group_id uuid references public.groups(id) on delete set null,
  points int not null,
  yellow_cards int not null default 0,
  red_cards int not null default 0,
  excluded boolean not null default false,
  primary key (season_id, member_id)
);

alter table public.logs add column season_id uuid references public.seasons(id) on delete set null;
alter table public.sessions add column season_id uuid references public.seasons(id) on delete set null;
alter table public.logs drop constraint logs_type_check;
alter table public.logs add constraint logs_type_check
  check (type in ('points', 'card', 'attendance', 'transfer', 'badge', 'edit', 'undo', 'season', 'holiday'));
create index logs_season_idx on public.logs(season_id);

alter table public.seasons enable row level security;
alter table public.holidays enable row level security;
alter table public.season_results enable row level security;
create policy "public read" on public.seasons for select using (true);
create policy "public read" on public.holidays for select using (true);
create policy "public read" on public.season_results for select using (true);
create policy "owner update" on public.seasons for update using (public.is_owner()) with check (public.is_owner());

alter publication supabase_realtime add table public.seasons, public.holidays;

-- الموسم الافتراضي الأول (قابل للتعديل من لوحة التحكم)
insert into public.seasons (name, start_date, end_date, weekly_off, is_active)
values ('الفصل الدراسي الأول', '2026-08-23', '2027-01-07', '{5,6}', true);
update public.logs set season_id = (select id from public.seasons where is_active);
update public.sessions set season_id = (select id from public.seasons where is_active);

-- ============ مساعدات ============
create or replace function public._active_season() returns public.seasons
language sql stable security definer set search_path = public as $$
  select * from seasons where is_active limit 1;
$$;

/** سبب كون اليوم إجازة أو خارج الموسم (null = يوم نشاط) */
create or replace function public._off_reason(p_date date) returns text
language sql stable security definer set search_path = public as $$
  select case
    when s.id is null then 'خارج مدة المواسم'
    when extract(dow from p_date)::int = any (s.weekly_off) then 'إجازة نهاية الأسبوع'
    else (select h.name from holidays h where h.season_id = s.id and p_date between h.start_date and h.end_date limit 1)
  end
  from (select 1) x
  left join seasons s on p_date between s.start_date and s.end_date
  limit 1;
$$;

/** أيام النشاط الفعلية في فترة: أيام المواسم عدا الإجازات، حتى أمس (واليوم إن بدأ تحضيره) */
create or replace function public._activity_days(p_from date, p_to date) returns table (d date)
language sql stable security definer set search_path = public as $$
  select g::date
  from generate_series(p_from, least(p_to, (now() at time zone 'Asia/Riyadh')::date), interval '1 day') g
  join seasons s on g::date between s.start_date and s.end_date
  where not (extract(dow from g)::int = any (s.weekly_off))
    and not exists (select 1 from holidays h where h.season_id = s.id and g::date between h.start_date and h.end_date)
    and (g::date < (now() at time zone 'Asia/Riyadh')::date
         or exists (select 1 from sessions ss where ss.date = g::date));
$$;

-- السجل يرتبط بالموسم النشط تلقائياً
create or replace function public._log(
  p_member uuid, p_type text, p_title text, p_delta int, p_payload jsonb, p_inverse jsonb
) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_id bigint; v_name text; v_group uuid;
begin
  select name, group_id into v_name, v_group from members where id = p_member;
  insert into logs (member_id, member_name, group_id, type, title, delta, payload, inverse, admin_id, admin_name, season_id)
  values (p_member, v_name, v_group, p_type, p_title, coalesce(p_delta, 0), coalesce(p_payload, '{}'::jsonb), p_inverse,
          auth.uid(), (select display_name from admins where user_id = auth.uid()),
          (select id from seasons where is_active limit 1))
  returning id into v_id;
  return v_id;
end $$;

-- ============ التحضير مع احترام الإجازات ============
create or replace function public.check_in(p_key text, p_late boolean default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_admin text := _require_admin();
  v_id uuid;
  m members;
  st settings;
  sn seasons := _active_season();
  v_now timestamp := now() at time zone 'Asia/Riyadh';
  v_off text;
  v_session uuid;
  v_status text;
  v_pts int;
  v_att attendance;
  v_log bigint;
begin
  if sn.id is null then return jsonb_build_object('status', 'off_day', 'reason', 'لا يوجد موسم نشط'); end if;
  v_off := case
    when v_now::date not between sn.start_date and sn.end_date then 'اليوم خارج مدة ' || sn.name
    when extract(dow from v_now)::int = any (sn.weekly_off) then 'إجازة نهاية الأسبوع'
    else (select h.name from holidays h where h.season_id = sn.id and v_now::date between h.start_date and h.end_date limit 1)
  end;
  if v_off is not null then return jsonb_build_object('status', 'off_day', 'reason', v_off); end if;

  v_id := _find_member(p_key);
  if v_id is null then return jsonb_build_object('status', 'not_found'); end if;
  select * into m from members where id = v_id for update;
  if m.excluded then
    return jsonb_build_object('status', 'excluded', 'member', _member_json(m.id));
  end if;

  select * into st from settings where id = 1;
  insert into sessions (date, season_id) values (v_now::date, sn.id) on conflict (date) do nothing;
  select id into v_session from sessions where date = v_now::date;

  if p_late is not null then
    v_status := case when p_late then 'late' else 'present' end;
  elsif st.late_after is not null and v_now::time > st.late_after then
    v_status := 'late';
  else
    v_status := 'present';
  end if;
  v_pts := case when v_status = 'late' then st.late_points else st.attendance_points end;

  insert into attendance (session_id, member_id, status, points, by_name)
  values (v_session, m.id, v_status, v_pts, v_admin)
  on conflict do nothing;

  if not found then
    select * into v_att from attendance where session_id = v_session and member_id = m.id;
    return jsonb_build_object('status', 'duplicate', 'member', _member_json(m.id),
      'at', v_att.ts, 'attendance_status', v_att.status, 'points', v_att.points);
  end if;

  update members set points = points + v_pts where id = m.id;
  v_log := _log(m.id, 'attendance',
    case when v_status = 'late' then 'تحضير (متأخر)' else 'تحضير' end, v_pts,
    jsonb_build_object('session_id', v_session, 'status', v_status),
    jsonb_build_object('points', -v_pts,
      'delete_attendance', jsonb_build_object('session_id', v_session)));

  return jsonb_build_object('status', 'ok', 'attendance_status', v_status, 'points', v_pts,
    'log_id', v_log, 'member', _member_json(m.id));
end $$;

-- ============ التراجع: داخل الموسم الحالي فقط ============
create or replace function public.undo_log(p_log bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_admin text := _require_admin();
  l logs;
  inv jsonb;
  v_set jsonb;
  v_pts int;
  v_new bigint;
begin
  select * into l from logs where id = p_log for update;
  if not found then raise exception 'الحدث غير موجود'; end if;
  if l.reverted_at is not null then raise exception 'تم التراجع عن هذا الحدث مسبقاً'; end if;
  if l.type in ('undo', 'season', 'holiday') or l.inverse is null then raise exception 'لا يمكن التراجع عن هذا الحدث'; end if;
  if l.season_id is distinct from (select id from seasons where is_active) then
    raise exception 'لا يمكن التراجع عن حدث من موسم سابق';
  end if;
  if l.member_id is null then raise exception 'العضو المرتبط بهذا الحدث محذوف'; end if;
  perform 1 from members where id = l.member_id for update;
  if not found then raise exception 'العضو المرتبط بهذا الحدث محذوف'; end if;

  inv := l.inverse;
  v_set := coalesce(inv -> 'set', '{}'::jsonb);
  v_pts := coalesce((inv ->> 'points')::int, 0);

  update members set
    points       = points + v_pts,
    yellow_cards = greatest(0, yellow_cards + coalesce((inv ->> 'yellow')::int, 0)),
    red_cards    = greatest(0, red_cards + coalesce((inv ->> 'red')::int, 0)),
    excluded     = case
                     when coalesce((inv ->> 'unexclude')::boolean, false) then false
                     when v_set ? 'excluded' then (v_set ->> 'excluded')::boolean
                     else excluded end,
    name         = coalesce(v_set ->> 'name', name),
    group_id     = case
                     when v_set ? 'group_id' and (v_set ->> 'group_id' is null
                          or exists (select 1 from groups where id = (v_set ->> 'group_id')::uuid))
                       then (v_set ->> 'group_id')::uuid
                     else group_id end,
    is_leader    = case when v_set ? 'is_leader' then (v_set ->> 'is_leader')::boolean else is_leader end
  where id = l.member_id;

  if inv ? 'delete_attendance' then
    delete from attendance
     where session_id = (inv -> 'delete_attendance' ->> 'session_id')::uuid and member_id = l.member_id;
  end if;
  if inv ? 'delete_member_badge' then
    delete from member_badges where id = (inv ->> 'delete_member_badge')::uuid;
  end if;

  update logs set reverted_at = now(), reverted_by = v_admin where id = p_log;
  v_new := _log(l.member_id, 'undo', 'تراجع: ' || l.title, v_pts, jsonb_build_object('undo_of', p_log), null);
  update logs set undo_of = p_log where id = v_new;
  return jsonb_build_object('log_id', v_new, 'member', _member_json(l.member_id));
end $$;

-- ============ بدء موسم جديد ============
create or replace function public.start_season(
  p_name text, p_start date, p_end date, p_weekly_off int[], p_carry_points boolean, p_reset_cards boolean
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_admin text := _require_owner();
  old seasons := _active_season();
  v_new uuid;
begin
  if nullif(trim(coalesce(p_name, '')), '') is null then raise exception 'اسم الموسم مطلوب'; end if;
  if p_end < p_start then raise exception 'تاريخ النهاية قبل البداية'; end if;
  if old.id is not null and p_start <= old.end_date and p_end >= old.start_date and p_start < old.start_date then
    raise exception 'الموسم الجديد يتداخل مع الموسم الحالي';
  end if;

  if old.id is not null then
    insert into season_results (season_id, member_id, member_name, group_id, points, yellow_cards, red_cards, excluded)
    select old.id, id, name, group_id, points, yellow_cards, red_cards, excluded from members
    on conflict (season_id, member_id) do nothing;
    update seasons set is_active = false, closed_at = now(),
      end_date = case when end_date >= p_start then p_start - 1 else end_date end
     where id = old.id;
    perform _log(null, 'season', 'انتهاء ' || old.name, 0, jsonb_build_object('season_id', old.id), null);
  end if;

  insert into seasons (name, start_date, end_date, weekly_off, is_active, carried_points)
  values (trim(p_name), p_start, p_end, coalesce(p_weekly_off, '{}'), true, p_carry_points)
  returning id into v_new;

  if not p_carry_points then update members set points = 0 where points <> 0; end if;
  if p_reset_cards then
    update members set yellow_cards = 0, red_cards = 0, excluded = false
     where yellow_cards <> 0 or red_cards <> 0 or excluded;
  end if;

  perform _log(null, 'season', 'بداية ' || trim(p_name) || case when p_carry_points then ' (مع ترحيل النقاط)' else '' end, 0,
    jsonb_build_object('season_id', v_new, 'start', p_start, 'end', p_end, 'carry', p_carry_points), null);
  return v_new;
end $$;

-- ============ الإجازات ============
create or replace function public.add_holiday(p_name text, p_start date, p_end date) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_admin text := _require_owner();
  sn seasons := _active_season();
  v_id uuid;
begin
  if sn.id is null then raise exception 'لا يوجد موسم نشط'; end if;
  if nullif(trim(coalesce(p_name, '')), '') is null then raise exception 'اسم الإجازة مطلوب'; end if;
  if p_end < p_start then raise exception 'تاريخ النهاية قبل البداية'; end if;
  insert into holidays (season_id, name, start_date, end_date) values (sn.id, trim(p_name), p_start, p_end) returning id into v_id;
  perform _log(null, 'holiday', 'إجازة: ' || trim(p_name), 0,
    jsonb_build_object('holiday_id', v_id, 'start', p_start, 'end', p_end), null);
  return v_id;
end $$;

create or replace function public.delete_holiday(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_admin text := _require_owner(); h holidays;
begin
  delete from holidays where id = p_id returning * into h;
  if h.id is null then raise exception 'الإجازة غير موجودة'; end if;
  perform _log(null, 'holiday', 'إلغاء إجازة: ' || h.name, 0,
    jsonb_build_object('start', h.start_date, 'end', h.end_date), null);
end $$;

-- ============ بوابة الطالب: أيام النشاط حسب التقويم ============
create or replace function public.student_portal(p_key text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_id uuid;
  m members;
  st settings;
  sn seasons := _active_season();
  v_phone text := _norm_phone(p_key);
  v_rank int; v_group_rank int;
  v_days jsonb; v_present int; v_late int; v_total int;
begin
  if p_key is null or length(trim(p_key)) < 4 then return null; end if;
  select id into v_id from members where code = upper(trim(p_key));
  if v_id is null and v_phone is not null then
    select member_id into v_id from member_private where phone = v_phone;
  end if;
  if v_id is null then return null; end if;
  select * into m from members where id = v_id;
  select * into st from settings where id = 1;

  select r into v_rank from (
    select id, rank() over (order by points desc) r from members where not excluded) x where id = m.id;
  select r into v_group_rank from (
    select id, rank() over (order by points desc) r from group_totals) x where id = m.group_id;

  select coalesce(jsonb_agg(jsonb_build_object('date', a.d, 'status', coalesce(at.status, 'absent'),
           'points', coalesce(at.points, 0)) order by a.d desc), '[]'::jsonb),
         count(at.member_id) filter (where at.status = 'present'),
         count(at.member_id) filter (where at.status = 'late'),
         count(*)
    into v_days, v_present, v_late, v_total
    from _activity_days(greatest(coalesce(sn.start_date, '2000-01-01'), (m.created_at at time zone 'Asia/Riyadh')::date),
                        coalesce(sn.end_date, '2000-01-01')) a
    left join sessions s on s.date = a.d
    left join attendance at on at.session_id = s.id and at.member_id = m.id;

  return jsonb_build_object(
    'member', _member_json(m.id),
    'season', case when sn.id is null then null else jsonb_build_object('name', sn.name, 'start', sn.start_date, 'end', sn.end_date) end,
    'rank', case when st.freeze_results then null else v_rank end,
    'group_rank', case when st.freeze_results then null else v_group_rank end,
    'frozen', st.freeze_results,
    'attendance', jsonb_build_object('present', v_present, 'late', v_late,
       'absent', v_total - v_present - v_late, 'total', v_total, 'days', v_days),
    'badges', coalesce((select jsonb_agg(jsonb_build_object('id', mb.id, 'name', b.name, 'description', b.description,
        'icon', b.icon, 'color', b.color, 'points', b.points, 'awarded_at', mb.awarded_at) order by mb.awarded_at desc)
      from member_badges mb join badges b on b.id = mb.badge_id where mb.member_id = m.id), '[]'::jsonb),
    'logs', coalesce((select jsonb_agg(x order by x.ts desc, x.id desc) from (
        select id, ts, type, title, delta, reverted_at from logs
         where member_id = m.id and type <> 'undo' and season_id is not distinct from sn.id
         order by ts desc, id desc limit 40) x), '[]'::jsonb)
  );
end $$;

-- ============ التقرير: الغياب حسب تقويم المواسم ============
create or replace function public.report(p_from date, p_to date) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare
  v_admin text := _require_admin();
  v_from timestamptz := (p_from::timestamp at time zone 'Asia/Riyadh');
  v_to timestamptz := ((p_to + 1)::timestamp at time zone 'Asia/Riyadh');
  v_days int;
begin
  create temp table if not exists _rep_days (d date primary key) on commit drop;
  truncate _rep_days;
  insert into _rep_days select d from _activity_days(p_from, p_to);
  select count(*) into v_days from _rep_days;

  return jsonb_build_object(
    'from', p_from, 'to', p_to, 'sessions', v_days,
    'holidays', coalesce((select jsonb_agg(jsonb_build_object('name', h.name, 'start', h.start_date, 'end', h.end_date) order by h.start_date)
      from holidays h where h.start_date <= p_to and h.end_date >= p_from), '[]'::jsonb),
    'session_days', coalesce((select jsonb_agg(jsonb_build_object('date', r.d,
        'present', (select count(*) from attendance a join sessions s on s.id = a.session_id where s.date = r.d and a.status = 'present'),
        'late', (select count(*) from attendance a join sessions s on s.id = a.session_id where s.date = r.d and a.status = 'late')) order by r.d)
      from _rep_days r), '[]'::jsonb),
    'totals', (select jsonb_build_object(
        'members', (select count(*) from members),
        'excluded', (select count(*) from members where excluded),
        'points_awarded', coalesce(sum(delta) filter (where delta > 0), 0),
        'points_deducted', coalesce(-sum(delta) filter (where delta < 0), 0),
        'yellow_cards', count(*) filter (where type = 'card' and payload ->> 'color' = 'yellow'),
        'red_cards', count(*) filter (where type = 'card' and (payload ->> 'color' = 'red' or (payload ->> 'converted')::boolean)),
        'badges', count(*) filter (where type = 'badge'),
        'actions', count(*))
      from logs where ts >= v_from and ts < v_to and reverted_at is null and type not in ('undo', 'season', 'holiday')),
    'groups', coalesce((select jsonb_agg(g order by g.points desc) from (
        select gt.id, gt.name, gt.color, gt.points, gt.members_count,
          coalesce((select sum(l.delta) from logs l join members mm on mm.id = l.member_id
             where mm.group_id = gt.id and l.ts >= v_from and l.ts < v_to
               and l.reverted_at is null and l.type <> 'undo'), 0)::int as period_points,
          (select count(*) from attendance a join sessions s on s.id = a.session_id join members mm on mm.id = a.member_id
             where mm.group_id = gt.id and s.date between p_from and p_to)::int as attendances
        from group_totals gt) g), '[]'::jsonb),
    'members', coalesce((select jsonb_agg(x order by x.group_sort, x.name) from (
        select m.id, m.member_no, m.name, m.points, m.excluded, m.yellow_cards, m.red_cards,
          g.name as group_name, g.color as group_color, coalesce(g.sort, 999) as group_sort,
          mp.notes,
          count(a.member_id) filter (where a.status = 'present')::int as present,
          count(a.member_id) filter (where a.status = 'late')::int as late,
          (count(r.d) - count(a.member_id))::int as absent,
          coalesce((select sum(l.delta) from logs l where l.member_id = m.id and l.ts >= v_from and l.ts < v_to
             and l.reverted_at is null and l.type <> 'undo'), 0)::int as period_points
        from members m
        left join groups g on g.id = m.group_id
        left join member_private mp on mp.member_id = m.id
        left join _rep_days r on r.d >= (m.created_at at time zone 'Asia/Riyadh')::date
        left join sessions s on s.date = r.d
        left join attendance a on a.session_id = s.id and a.member_id = m.id
        group by m.id, g.name, g.color, g.sort, mp.notes) x), '[]'::jsonb),
    'posts', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'title', p.title, 'body', p.body,
        'event_date', p.event_date, 'image_path', p.image_path, 'category', c.name) order by p.event_date)
      from posts p left join post_categories c on c.id = p.category_id
      where p.event_date between p_from and p_to and p.published), '[]'::jsonb)
  );
end $$;

revoke all on function public._active_season() from public, anon, authenticated;
revoke all on function public._off_reason(date) from public, anon, authenticated;
revoke all on function public._activity_days(date, date) from public, anon, authenticated;
revoke all on function public.start_season(text, date, date, int[], boolean, boolean) from public, anon;
revoke all on function public.add_holiday(text, date, date) from public, anon;
revoke all on function public.delete_holiday(uuid) from public, anon;
grant execute on function public.start_season(text, date, date, int[], boolean, boolean),
  public.add_holiday(text, date, date), public.delete_holiday(uuid) to authenticated;
