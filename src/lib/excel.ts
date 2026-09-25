import type { Group, Member, MemberPrivate } from './types'

type Cell = string | number | boolean | null | undefined

async function loadExcel() {
  const mod = await import('exceljs')
  return (mod.default ?? mod) as typeof import('exceljs')
}

function download(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const HEADER_FILL = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF0F4C3A' } }
const LOCKED_FILL = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFF2ECDF' } }

async function buildSheet(
  sheetName: string,
  columns: { header: string; width: number; locked?: boolean }[],
  rows: Cell[][],
  groups: Group[],
  groupCol: number,
  leaderCol: number,
) {
  const ExcelJS = await loadExcel()
  const wb = new ExcelJS.Workbook()
  wb.creator = 'النشاط الثقافي'
  const ws = wb.addWorksheet(sheetName, { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] })
  ws.columns = columns.map((c) => ({ header: c.header, width: c.width }))
  const header = ws.getRow(1)
  header.height = 26
  header.eachCell((cell) => {
    cell.fill = HEADER_FILL
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 12 }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  })
  rows.forEach((r) => ws.addRow(r))
  const groupList = `"${groups.map((g) => g.name.replace(/"/g, '')).join(',')}"`
  const lastRow = Math.max(rows.length + 1, 300)
  for (let i = 2; i <= lastRow; i++) {
    const row = ws.getRow(i)
    row.getCell(groupCol).dataValidation = { type: 'list', allowBlank: true, formulae: [groupList] }
    row.getCell(leaderCol).dataValidation = { type: 'list', allowBlank: true, formulae: ['"نعم,لا"'] }
    columns.forEach((c, idx) => {
      const cell = row.getCell(idx + 1)
      cell.alignment = { horizontal: 'right', vertical: 'middle' }
      if (c.locked && i <= rows.length + 1) cell.fill = LOCKED_FILL
    })
  }
  return wb
}

export async function downloadNewMembersTemplate(groups: Group[]) {
  const wb = await buildSheet(
    'طلاب جدد',
    [
      { header: 'الاسم', width: 32 },
      { header: 'المجموعة', width: 18 },
      { header: 'الجوال', width: 16 },
      { header: 'قائد', width: 10 },
      { header: 'ملاحظات', width: 36 },
    ],
    [],
    groups,
    2,
    4,
  )
  download(await wb.xlsx.writeBuffer(), 'قالب-طلاب-جدد.xlsx')
}

export async function downloadUpdateTemplate(
  members: Member[],
  groups: Group[],
  privates: Map<string, MemberPrivate>,
) {
  const byId = new Map(groups.map((g) => [g.id, g.name]))
  const rows = [...members]
    .sort((a, b) => a.member_no - b.member_no)
    .map((m) => [
      m.member_no,
      m.name,
      m.group_id ? byId.get(m.group_id) ?? '' : '',
      privates.get(m.id)?.phone ?? '',
      m.is_leader ? 'نعم' : 'لا',
      privates.get(m.id)?.notes ?? '',
    ])
  const wb = await buildSheet(
    'تحديث بيانات الطلاب',
    [
      { header: 'رقم العضوية', width: 14, locked: true },
      { header: 'الاسم', width: 32 },
      { header: 'المجموعة', width: 18 },
      { header: 'الجوال', width: 16 },
      { header: 'قائد', width: 10 },
      { header: 'ملاحظات', width: 36 },
    ],
    rows,
    groups,
    3,
    5,
  )
  download(await wb.xlsx.writeBuffer(), 'تحديث-بيانات-الطلاب.xlsx')
}

function cellText(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'object') {
    const o = v as { text?: string; result?: unknown; richText?: { text: string }[] }
    if (o.richText) return o.richText.map((r) => r.text).join('')
    if (o.text != null) return String(o.text)
    if (o.result != null) return String(o.result)
  }
  return String(v).trim()
}

/** يقرأ أول ورقة ويعيد صفوفاً بمفاتيح من صف العناوين */
export async function readSheet(file: File): Promise<Record<string, string>[]> {
  const ExcelJS = await loadExcel()
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await file.arrayBuffer())
  const ws = wb.worksheets[0]
  if (!ws) return []
  const headers: string[] = []
  ws.getRow(1).eachCell((cell, col) => {
    headers[col] = cellText(cell.value)
  })
  const out: Record<string, string>[] = []
  ws.eachRow((row, idx) => {
    if (idx === 1) return
    const rec: Record<string, string> = {}
    let any = false
    headers.forEach((h, col) => {
      if (!h) return
      const t = cellText(row.getCell(col).value)
      rec[h] = t
      if (t) any = true
    })
    if (any) out.push(rec)
  })
  return out
}

export const isYes = (v: string | undefined) => /^(نعم|yes|y|1|true|✓)$/i.test((v ?? '').trim())

export async function exportTable(filename: string, sheetName: string, headers: string[], rows: Cell[][]) {
  const ExcelJS = await loadExcel()
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(sheetName, { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] })
  ws.addRow(headers)
  rows.forEach((r) => ws.addRow(r))
  ws.getRow(1).eachCell((cell) => {
    cell.fill = HEADER_FILL
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.alignment = { horizontal: 'center' }
  })
  ws.columns.forEach((c) => {
    c.width = 16
  })
  download(await wb.xlsx.writeBuffer(), filename)
}
