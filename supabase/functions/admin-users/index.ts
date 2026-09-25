// إدارة حسابات المشرفين — للمدير العام فقط
import { createClient } from 'npm:@supabase/supabase-js@2'

const EMAIL_DOMAIN = 'al-nashat.app'
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const { data: userData, error: userErr } = await admin.auth.getUser(token)
  if (userErr || !userData.user) return json({ error: 'غير مصرح' }, 401)

  const { data: caller } = await admin.from('admins').select('role').eq('user_id', userData.user.id).maybeSingle()
  if (caller?.role !== 'owner') return json({ error: 'هذا الإجراء للمدير العام فقط' }, 403)

  let body: Record<string, string>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'طلب غير صالح' }, 400)
  }

  const role = body.role === 'owner' ? 'owner' : 'supervisor'

  if (body.action === 'create') {
    const username = String(body.username ?? '').trim().toLowerCase()
    if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
      return json({ error: 'اسم المستخدم يجب أن يكون 3-32 حرفاً إنجليزياً أو أرقاماً' }, 400)
    }
    if (String(body.password ?? '').length < 8) return json({ error: 'كلمة المرور 8 أحرف على الأقل' }, 400)
    const { data: exists } = await admin.from('admins').select('user_id').eq('username', username).maybeSingle()
    if (exists) return json({ error: 'اسم المستخدم مستخدم مسبقاً' }, 409)

    const { data, error } = await admin.auth.admin.createUser({
      email: `${username}@${EMAIL_DOMAIN}`,
      password: body.password,
      email_confirm: true,
    })
    if (error || !data.user) return json({ error: error?.message ?? 'تعذر إنشاء الحساب' }, 400)
    const { error: insErr } = await admin.from('admins').insert({
      user_id: data.user.id,
      username,
      display_name: String(body.display_name ?? username).trim() || username,
      role,
    })
    if (insErr) {
      await admin.auth.admin.deleteUser(data.user.id)
      return json({ error: insErr.message }, 400)
    }
    return json({ ok: true })
  }

  if (body.action === 'update') {
    const patch: Record<string, string> = {}
    if (body.display_name) patch.display_name = String(body.display_name).trim()
    if (body.role) {
      if (body.user_id === userData.user.id && role !== 'owner') {
        return json({ error: 'لا يمكنك إزالة صلاحية المدير عن نفسك' }, 400)
      }
      patch.role = role
    }
    if (Object.keys(patch).length) {
      const { error } = await admin.from('admins').update(patch).eq('user_id', body.user_id)
      if (error) return json({ error: error.message }, 400)
    }
    if (body.password) {
      if (String(body.password).length < 8) return json({ error: 'كلمة المرور 8 أحرف على الأقل' }, 400)
      const { error } = await admin.auth.admin.updateUserById(body.user_id, { password: body.password })
      if (error) return json({ error: error.message }, 400)
    }
    return json({ ok: true })
  }

  if (body.action === 'delete') {
    if (body.user_id === userData.user.id) return json({ error: 'لا يمكنك حذف حسابك' }, 400)
    const { error } = await admin.auth.admin.deleteUser(body.user_id)
    if (error) return json({ error: error.message }, 400)
    return json({ ok: true })
  }

  return json({ error: 'إجراء غير معروف' }, 400)
})
