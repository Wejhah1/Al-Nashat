-- النشاط الثقافي — العمليات الذرية (كل دالة = transaction واحدة)

-- ============ مساعدات داخلية ============
create or replace function public._require_admin() returns text
language plpgsql stable security definer set search_path = public as $$
declare v text;
begin
  select display_name into v from admins where user_id = auth.uid();
  if v is null then raise exception 'غير مصرح لك بهذا الإجراء' using errcode = '42501'; end if;
  return v;
end $$;

create or replace function public._require_owner() returns text
language plpgsql stable security definer set search_path = public as $$
declare v text;
begin
  select display_name into v from admins where user_id = auth.uid() and role = 'owner';
  if v is null then raise exception 'هذا الإجراء للمدير العام فقط' using errcode = '42501'; end if;
  return v;
end $$;

create or replace function public._norm_phone(p text) returns text
language sql immutable as $$
  select case when length(regexp_replace(coalesce(p, ''), '\D', '', 'g')) >= 9
    then '0' || right(regexp_replace(p, '\D', '', 'g'), 9) end;
$$;

create or replace function public._member_json(p_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', m.id, 'member_no', m.member_no, 'code', m.code, 'name', m.name,
    'group_id', m.group_id, 'group_name', g.name, 'group_color', g.color,
    'is_leader', m.is_leader, 'points', m.points, 'yellow_cards', m.yellow_cards,
    'red_cards', m.red_cards, 'excluded', m.excluded)
  from members m left join groups g on g.id = m.group_id
  where m.id = p_id;
$$;

create or replace function public._find_member(p_key text) returns uuid
language sql stable security definer set search_path = public as $$
  select id from members
  where code = upper(trim(p_key)) or member_no::text = trim(p_key)
  limit 1;
$$;

create or replace function public._log(
  p_member uuid, p_type text, p_title text, p_delta int, p_payload jsonb, p_inverse jsonb
) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_id bigint; v_name text; v_group uuid;
begin
  select name, group_id into v_name, v_group from members where id = p_member;
  insert into logs (member_id, member_name, group_id, type, title, delta, payload, inverse, admin_id, admin_name)
  values (p_member, v_name, v_group, p_type, p_title, coalesce(p_delta, 0), coalesce(p_payload, '{}'::jsonb), p_inverse,
          auth.uid(), (select display_name from admins where user_id = auth.uid()))
  returning id into v_id;
  return v_id;
end $$;

-- تطبيع الجوال تلقائياً
create or replace function public._member_private_norm() returns trigger
language plpgsql as $$
begin
  new.phone := public._norm_phone(new.phone);
  return new;
end $$;
create trigger member_private_norm before insert or update on public.member_private
  for each row execute function public._member_private_norm();

-- ============ التحضير ============
create or replace function public.check_in(p_key text, p_late boolean default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_admin text := _require_admin();
  v_id uuid;
  m members;
  st settings;
  v_now timestamp := now() at time zone 'Asia/Riyadh';
  v_session uuid;
  v_status text;
  v_pts int;
  v_att attendance;
  v_log bigint;
begin
  v_id := _find_member(p_key);
  if v_id is null then return jsonb_build_object('status', 'not_found'); end if;
  select * into m from members where id = v_id for update;
  if m.excluded then
    return jsonb_build_object('status', 'excluded', 'member', _member_json(m.id));
  end if;

  select * into st from settings where id = 1;
  insert into sessions (date) values (v_now::date) on conflict (date) do nothing;
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

-- ============ النقاط ============
create or replace function public.adjust_points(
  p_member uuid, p_delta int, p_reason text default null, p_rule uuid default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_admin text := _require_admin();
  v_title text := nullif(trim(coalesce(p_reason, '')), '');
  v_rule point_rules;
  v_log bigint;
begin
  if p_delta is null or p_delta = 0 then raise exception 'قيمة النقاط غير صالحة'; end if;
  if p_rule is not null then
    select * into v_rule from point_rules where id = p_rule;
    v_title := coalesce(v_title, v_rule.title);
  end if;
  if v_title is null then
    if p_delta < 0 then raise exception 'سبب الخصم مطلوب'; end if;
    v_title := 'إضافة نقاط';
  end if;
  perform 1 from members where id = p_member for update;
  if not found then raise exception 'العضو غير موجود'; end if;

  update members set points = points + p_delta where id = p_member;
  v_log := _log(p_member, 'points', v_title, p_delta,
    jsonb_build_object('rule_id', p_rule), jsonb_build_object('points', -p_delta));
  return jsonb_build_object('log_id', v_log, 'member', _member_json(p_member));
end $$;

-- ============ الكروت ============
create or replace function public.give_card(p_member uuid, p_color text, p_reason text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_admin text := _require_admin();
  m members;
  st settings;
  v_y int; v_r int; v_excl boolean;
  v_converted boolean := false;
  v_penalty int := 0;
  v_title text;
  v_log bigint;
begin
  if p_color not in ('yellow', 'red') then raise exception 'نوع الكرت غير صالح'; end if;
  select * into m from members where id = p_member for update;
  if not found then raise exception 'العضو غير موجود'; end if;
  select * into st from settings where id = 1;

  if p_color = 'yellow' then
    v_penalty := st.yellow_penalty;
    if m.yellow_cards + 1 >= 2 then
      v_converted := true;
      v_y := 0;
      v_r := m.red_cards + 1;
      v_penalty := v_penalty + st.red_penalty;
    else
      v_y := m.yellow_cards + 1;
      v_r := m.red_cards;
    end if;
  else
    v_y := m.yellow_cards;
    v_r := m.red_cards + 1;
    v_penalty := st.red_penalty;
  end if;
  v_excl := m.excluded or (v_r > m.red_cards and st.red_excludes);

  update members
     set yellow_cards = v_y, red_cards = v_r, excluded = v_excl, points = points - v_penalty
   where id = p_member;

  v_title := case
    when v_converted then 'كرت أصفر ثانٍ ← كرت أحمر'
    when p_color = 'yellow' then 'كرت أصفر'
    else 'كرت أحمر' end;
  if v_excl and not m.excluded then v_title := v_title || ' — إقصاء'; end if;
  if nullif(trim(coalesce(p_reason, '')), '') is not null then
    v_title := v_title || ' (' || trim(p_reason) || ')';
  end if;

  v_log := _log(p_member, 'card', v_title, -v_penalty,
    jsonb_build_object('color', p_color, 'converted', v_converted, 'excluded', v_excl and not m.excluded),
    jsonb_build_object('points', v_penalty, 'yellow', m.yellow_cards - v_y, 'red', m.red_cards - v_r,
      'unexclude', v_excl and not m.excluded));
  return jsonb_build_object('log_id', v_log, 'converted', v_converted,
    'excluded', v_excl and not m.excluded, 'member', _member_json(p_member));
end $$;

create or replace function public.set_excluded(p_member uuid, p_excluded boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_admin text := _require_owner(); v_old boolean; v_log bigint;
begin
  select excluded into v_old from members where id = p_member for update;
  if not found then raise exception 'العضو غير موجود'; end if;
  if v_old = p_excluded then return _member_json(p_member); end if;
  update members set excluded = p_excluded where id = p_member;
  v_log := _log(p_member, 'edit', case when p_excluded then 'إقصاء يدوي' else 'رفع الإقصاء' end, 0,
    '{}'::jsonb, jsonb_build_object('set', jsonb_build_object('excluded', v_old)));
  return _member_json(p_member);
end $$;

-- ============ النقل والتعديل ============
create or replace function public.transfer_member(p_member uuid, p_group uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_admin text := _require_admin();
  m members;
  v_from text; v_to text;
begin
  select * into m from members where id = p_member for update;
  if not found then raise exception 'العضو غير موجود'; end if;
  if m.group_id is not distinct from p_group then raise exception 'العضو في هذه المجموعة أصلاً'; end if;
  select name into v_to from groups where id = p_group;
  if v_to is null then raise exception 'المجموعة غير موجودة'; end if;
  select name into v_from from groups where id = m.group_id;

  update members set group_id = p_group, is_leader = false where id = p_member;
  perform _log(p_member, 'transfer', 'نقل من «' || coalesce(v_from, 'بدون') || '» إلى «' || v_to || '»', 0,
    jsonb_build_object('from', m.group_id, 'to', p_group),
    jsonb_build_object('set', jsonb_build_object('group_id', m.group_id, 'is_leader', m.is_leader)));
  return _member_json(p_member);
end $$;

create or replace function public.rename_member(p_member uuid, p_name text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_admin text := _require_admin(); v_old text;
begin
  if nullif(trim(coalesce(p_name, '')), '') is null then raise exception 'الاسم مطلوب'; end if;
  select name into v_old from members where id = p_member for update;
  if not found then raise exception 'العضو غير موجود'; end if;
  if v_old = trim(p_name) then return _member_json(p_member); end if;
  update members set name = trim(p_name) where id = p_member;
  perform _log(p_member, 'edit', 'تعديل الاسم من «' || v_old || '»', 0,
    jsonb_build_object('old', v_old, 'new', trim(p_name)),
    jsonb_build_object('set', jsonb_build_object('name', v_old)));
  return _member_json(p_member);
end $$;

create or replace function public.set_leader(p_member uuid, p_value boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_admin text := _require_owner(); v_group uuid;
begin
  select group_id into v_group from members where id = p_member for update;
  if not found then raise exception 'العضو غير موجود'; end if;
  if p_value then
    update members set is_leader = false where group_id = v_group and id <> p_member and is_leader;
  end if;
  update members set is_leader = p_value where id = p_member;
  return _member_json(p_member);
end $$;

-- ============ الأوسمة ============
create or replace function public.award_badge(p_member uuid, p_badge uuid, p_note text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_admin text := _require_admin();
  b badges;
  v_mb uuid;
  v_log bigint;
begin
  select * into b from badges where id = p_badge;
  if not found then raise exception 'الوسام غير موجود'; end if;
  perform 1 from members where id = p_member for update;
  if not found then raise exception 'العضو غير موجود'; end if;

  insert into member_badges (member_id, badge_id, by_name, note)
  values (p_member, p_badge, v_admin, nullif(trim(coalesce(p_note, '')), ''))
  returning id into v_mb;
  update members set points = points + b.points where id = p_member;
  v_log := _log(p_member, 'badge', 'وسام: ' || b.name, b.points,
    jsonb_build_object('badge_id', b.id, 'icon', b.icon, 'color', b.color),
    jsonb_build_object('points', -b.points, 'delete_member_badge', v_mb));
  return jsonb_build_object('log_id', v_log, 'member', _member_json(p_member));
end $$;

-- ============ التراجع الآمن ============
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
  if l.type = 'undo' or l.inverse is null then raise exception 'لا يمكن التراجع عن هذا الحدث'; end if;
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

-- ============ بوابة الطالب (بدون تحقق حسب الطلب) ============
create or replace function public.student_portal(p_key text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_id uuid;
  m members;
  st settings;
  v_phone text := _norm_phone(p_key);
  v_rank int; v_group_rank int;
  v_sessions jsonb; v_present int; v_late int; v_total int;
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

  select coalesce(jsonb_agg(jsonb_build_object('date', s.date, 'status', coalesce(a.status, 'absent'),
           'points', coalesce(a.points, 0)) order by s.date desc), '[]'::jsonb),
         count(*) filter (where a.status = 'present'),
         count(*) filter (where a.status = 'late'),
         count(*)
    into v_sessions, v_present, v_late, v_total
    from sessions s
    left join attendance a on a.session_id = s.id and a.member_id = m.id
   where s.date >= (m.created_at at time zone 'Asia/Riyadh')::date;

  return jsonb_build_object(
    'member', _member_json(m.id),
    'rank', case when st.freeze_results then null else v_rank end,
    'group_rank', case when st.freeze_results then null else v_group_rank end,
    'frozen', st.freeze_results,
    'attendance', jsonb_build_object('present', v_present, 'late', v_late,
       'absent', v_total - v_present - v_late, 'total', v_total, 'days', v_sessions),
    'badges', coalesce((select jsonb_agg(jsonb_build_object('id', mb.id, 'name', b.name, 'description', b.description,
        'icon', b.icon, 'color', b.color, 'points', b.points, 'awarded_at', mb.awarded_at) order by mb.awarded_at desc)
      from member_badges mb join badges b on b.id = mb.badge_id where mb.member_id = m.id), '[]'::jsonb),
    'logs', coalesce((select jsonb_agg(x order by x.ts desc) from (
        select id, ts, type, title, delta, reverted_at from logs
         where member_id = m.id and type <> 'undo' order by ts desc limit 40) x), '[]'::jsonb)
  );
end $$;

-- ============ التقارير ============
create or replace function public.report(p_from date, p_to date) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_admin text := _require_admin();
  v_from timestamptz := (p_from::timestamp at time zone 'Asia/Riyadh');
  v_to timestamptz := ((p_to + 1)::timestamp at time zone 'Asia/Riyadh');
  v_sessions int;
begin
  select count(*) into v_sessions from sessions where date between p_from and p_to;

  return jsonb_build_object(
    'from', p_from, 'to', p_to, 'sessions', v_sessions,
    'session_days', coalesce((select jsonb_agg(jsonb_build_object('date', s.date,
        'present', (select count(*) from attendance a where a.session_id = s.id and a.status = 'present'),
        'late', (select count(*) from attendance a where a.session_id = s.id and a.status = 'late')) order by s.date)
      from sessions s where s.date between p_from and p_to), '[]'::jsonb),
    'totals', (select jsonb_build_object(
        'members', (select count(*) from members),
        'excluded', (select count(*) from members where excluded),
        'points_awarded', coalesce(sum(delta) filter (where delta > 0), 0),
        'points_deducted', coalesce(-sum(delta) filter (where delta < 0), 0),
        'yellow_cards', count(*) filter (where type = 'card' and payload ->> 'color' = 'yellow'),
        'red_cards', count(*) filter (where type = 'card' and (payload ->> 'color' = 'red' or (payload ->> 'converted')::boolean)),
        'badges', count(*) filter (where type = 'badge'),
        'actions', count(*))
      from logs where ts >= v_from and ts < v_to and reverted_at is null and type <> 'undo'),
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
          (count(s.id) - count(a.member_id))::int as absent,
          coalesce((select sum(l.delta) from logs l where l.member_id = m.id and l.ts >= v_from and l.ts < v_to
             and l.reverted_at is null and l.type <> 'undo'), 0)::int as period_points
        from members m
        left join groups g on g.id = m.group_id
        left join member_private mp on mp.member_id = m.id
        left join sessions s on s.date between p_from and p_to
             and s.date >= (m.created_at at time zone 'Asia/Riyadh')::date
        left join attendance a on a.session_id = s.id and a.member_id = m.id
        group by m.id, g.name, g.color, g.sort, mp.notes) x), '[]'::jsonb),
    'posts', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'title', p.title, 'body', p.body,
        'event_date', p.event_date, 'image_path', p.image_path, 'category', c.name) order by p.event_date)
      from posts p left join post_categories c on c.id = p.category_id
      where p.event_date between p_from and p_to and p.published), '[]'::jsonb)
  );
end $$;

-- ============ Excel: استيراد وتحديث ============
create or replace function public.import_members(p_rows jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_admin text := _require_owner();
  r jsonb;
  v_group uuid;
  v_id uuid;
  v_count int := 0;
begin
  for r in select * from jsonb_array_elements(p_rows) loop
    if nullif(trim(coalesce(r ->> 'name', '')), '') is null then continue; end if;
    select id into v_group from groups where name = trim(coalesce(r ->> 'group', ''));
    insert into members (name, group_id) values (trim(r ->> 'name'), v_group) returning id into v_id;
    if nullif(trim(coalesce(r ->> 'phone', '')), '') is not null or nullif(trim(coalesce(r ->> 'notes', '')), '') is not null then
      insert into member_private (member_id, phone, notes) values (v_id, r ->> 'phone', nullif(trim(coalesce(r ->> 'notes', '')), ''));
    end if;
    if coalesce((r ->> 'is_leader')::boolean, false) and v_group is not null then
      update members set is_leader = false where group_id = v_group and is_leader;
      update members set is_leader = true where id = v_id;
    end if;
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

create or replace function public.update_members(p_rows jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_admin text := _require_owner();
  r jsonb;
  m members;
  v_group uuid;
  v_count int := 0;
begin
  for r in select * from jsonb_array_elements(p_rows) loop
    select * into m from members where member_no = (r ->> 'member_no')::int for update;
    if not found then continue; end if;
    if r ? 'name' and nullif(trim(r ->> 'name'), '') is not null and trim(r ->> 'name') <> m.name then
      update members set name = trim(r ->> 'name') where id = m.id;
      perform _log(m.id, 'edit', 'تعديل الاسم من «' || m.name || '» (Excel)', 0,
        jsonb_build_object('old', m.name, 'new', trim(r ->> 'name')),
        jsonb_build_object('set', jsonb_build_object('name', m.name)));
    end if;
    if r ? 'group' then
      select id into v_group from groups where name = trim(coalesce(r ->> 'group', ''));
      if v_group is not null and v_group is distinct from m.group_id then
        update members set group_id = v_group, is_leader = false where id = m.id;
        perform _log(m.id, 'transfer', 'نقل إلى «' || trim(r ->> 'group') || '» (Excel)', 0,
          jsonb_build_object('from', m.group_id, 'to', v_group),
          jsonb_build_object('set', jsonb_build_object('group_id', m.group_id, 'is_leader', m.is_leader)));
      end if;
    end if;
    if r ? 'phone' or r ? 'notes' then
      insert into member_private (member_id, phone, notes)
      values (m.id, nullif(trim(coalesce(r ->> 'phone', '')), ''), nullif(trim(coalesce(r ->> 'notes', '')), ''))
      on conflict (member_id) do update set
        phone = case when r ? 'phone' then excluded.phone else member_private.phone end,
        notes = case when r ? 'notes' then excluded.notes else member_private.notes end;
    end if;
    if r ? 'is_leader' and (r ->> 'is_leader')::boolean is distinct from m.is_leader then
      if (r ->> 'is_leader')::boolean then
        update members set is_leader = false where group_id = (select group_id from members where id = m.id) and is_leader;
      end if;
      update members set is_leader = (r ->> 'is_leader')::boolean where id = m.id;
    end if;
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

-- ============ الصلاحيات ============
revoke all on function public._require_admin() from public, anon, authenticated;
revoke all on function public._require_owner() from public, anon, authenticated;
revoke all on function public._member_json(uuid) from public, anon, authenticated;
revoke all on function public._find_member(text) from public, anon, authenticated;
revoke all on function public._log(uuid, text, text, int, jsonb, jsonb) from public, anon, authenticated;

revoke all on function public.check_in(text, boolean) from public, anon;
revoke all on function public.adjust_points(uuid, int, text, uuid) from public, anon;
revoke all on function public.give_card(uuid, text, text) from public, anon;
revoke all on function public.set_excluded(uuid, boolean) from public, anon;
revoke all on function public.transfer_member(uuid, uuid) from public, anon;
revoke all on function public.rename_member(uuid, text) from public, anon;
revoke all on function public.set_leader(uuid, boolean) from public, anon;
revoke all on function public.award_badge(uuid, uuid, text) from public, anon;
revoke all on function public.undo_log(bigint) from public, anon;
revoke all on function public.report(date, date) from public, anon;
revoke all on function public.import_members(jsonb) from public, anon;
revoke all on function public.update_members(jsonb) from public, anon;
grant execute on function public.check_in(text, boolean), public.adjust_points(uuid, int, text, uuid),
  public.give_card(uuid, text, text), public.set_excluded(uuid, boolean), public.transfer_member(uuid, uuid),
  public.rename_member(uuid, text), public.set_leader(uuid, boolean), public.award_badge(uuid, uuid, text),
  public.undo_log(bigint), public.report(date, date), public.import_members(jsonb), public.update_members(jsonb)
  to authenticated;
grant execute on function public.student_portal(text) to anon, authenticated;
