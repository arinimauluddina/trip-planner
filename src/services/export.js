/**
 * export.js — Excel & SQLite DB export/import service
 */
import * as XLSX from 'xlsx'
import { exportDBJson, importDBJson } from './db.js'

// ── Helpers ──────────────────────────────────────────────────────────────────
export const CATEGORIES = [
  { value: 'transport',     label: 'Transportasi',      icon: '🚗' },
  { value: 'accommodation', label: 'Akomodasi',          icon: '🏨' },
  { value: 'wisata',        label: 'Tempat Wisata',      icon: '🏖️' },
  { value: 'food',          label: 'Jajan',              icon: '🍜' },
  { value: 'ticket',        label: 'Tiket Masuk',        icon: '🎟️' },
  { value: 'shopping',      label: 'Belanja',            icon: '🛍️' },
  { value: 'souvenir',      label: 'Oleh-oleh',          icon: '🎁' },
  { value: 'other',         label: 'Lainnya',            icon: '📦' },
]

export const PLANNING_CATEGORIES = [
  { value: 'hotel',        label: 'Hotel',        icon: '🏨', destinationCategory: 'accommodation' },
  { value: 'wisata',       label: 'Tempat Wisata', icon: '🏖️', destinationCategory: 'wisata' },
  { value: 'jajan',        label: 'Jajan',        icon: '🍜', destinationCategory: 'food' },
  { value: 'transport',    label: 'Transportasi', icon: '🚗', destinationCategory: 'transport' },
  { value: 'oleh_oleh',    label: 'Oleh-oleh',    icon: '🎁', destinationCategory: 'souvenir' },
  { value: 'lainnya',      label: 'Lainnya',      icon: '📦', destinationCategory: 'other' },
]

export const PLANNING_STATUS = {
  considering: { label: 'Dipertimbangkan', emoji: '💭' },
  selected:    { label: 'Dipilih',          emoji: '⭐' },
  added:       { label: 'Sudah ditambahkan', emoji: '✅' },
}

export const SESSIONS = [
  { key: 'morning',   label: 'Pagi',  icon: '🌅' },
  { key: 'afternoon', label: 'Siang', icon: '☀️' },
  { key: 'evening',   label: 'Sore',  icon: '🌇' },
  { key: 'night',     label: 'Malam', icon: '🌙' },
]

export const STATUS_MAP = {
  planned:   { label: 'Planning',    emoji: '📋' },
  ongoing:   { label: 'On Going Now', emoji: '🚀' },
  completed: { label: 'Done',        emoji: '✅' },
}

export const TRIP_COLORS = [
  { value: 'red',    bg: '#B45A6D', label: 'Rose' },
  { value: 'teal',   bg: '#7A2A3D', label: 'Burgundy' },
  { value: 'yellow', bg: '#D9A6B2', label: 'Soft Pink' },
  { value: 'purple', bg: '#7A2A3D', label: 'Burgundy' },
  { value: 'green',  bg: '#F9F3F3', label: 'Soft White' },
]

export function categoryMeta(val) {
  return CATEGORIES.find(c => c.value === val) || CATEGORIES[CATEGORIES.length - 1]
}

export function sessionMeta(key) {
  return SESSIONS.find(s => s.key === key) || SESSIONS[0]
}

export function fmtIDR(n) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(n || 0)
}

export function fmtDate(str) {
  if (!str) return '-'
  return new Date(str).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function fmtDuration(min) {
  if (!min) return '—'
  const h = Math.floor(min / 60), m = min % 60
  if (h === 0) return `${m} menit`
  if (m === 0) return `${h} jam`
  return `${h} jam ${m} menit`
}

export function getDayCount(startDate, endDate) {
  if (!startDate || !endDate) return 1
  const s = new Date(startDate), e = new Date(endDate)
  return Math.max(1, Math.ceil((e - s) / 86_400_000) + 1)
}

export function getDayLabel(startDate, day) {
  if (!startDate) return `Hari ${day}`
  const d = new Date(startDate)
  d.setDate(d.getDate() + day - 1)
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })
}

// ── Excel Export ─────────────────────────────────────────────────────────────
export function exportTripExcel(trip) {
  const wb = XLSX.utils.book_new()

  // Sheet 1: Summary
  const totalCost = (trip.destinations || []).reduce((s, d) => s + (Number(d.cost) || 0), 0)
  const summaryData = [
    ['TRIP PLAN — RINGKASAN', ''],
    [],
    ['Nama Trip',          trip.name || '-'],
    ['Deskripsi',          trip.description || '-'],
    ['Status',             STATUS_MAP[trip.status]?.label || trip.status],
    ['Tanggal Mulai',      fmtDate(trip.start_date)],
    ['Tanggal Selesai',    fmtDate(trip.end_date)],
    ['Durasi',             getDayCount(trip.start_date, trip.end_date) + ' Hari'],
    ['Total Destinasi',    (trip.destinations || []).length],
    ['Total Estimasi Biaya', fmtIDR(totalCost)],
    [],
    ['Diekspor pada',      new Date().toLocaleString('id-ID')],
  ]
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)
  wsSummary['!cols'] = [{ wch: 25 }, { wch: 45 }]
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan')

  // Sheet 2: Destinations + Budget
  const catTotals = {}
  CATEGORIES.forEach(c => { catTotals[c.value] = 0 })
  ;(trip.destinations || []).forEach(d => {
    catTotals[d.category] = (catTotals[d.category] || 0) + (Number(d.cost) || 0)
  })

  const destRows = (trip.destinations || []).map((d, i) => [
    i + 1,
    d.name || '-',
    categoryMeta(d.category).label,
    Number(d.cost) || 0,
    d.notes || '',
  ])

  const catRows = CATEGORIES
    .filter(c => catTotals[c.value] > 0)
    .map(c => ['', `Total ${c.label}`, '', catTotals[c.value], ''])

  const destData = [
    ['No', 'Nama Destinasi', 'Kategori', 'Estimasi Biaya (IDR)', 'Catatan'],
    ...destRows,
    [],
    ['', 'BREAKDOWN PER KATEGORI', '', '', ''],
    ...catRows,
    ['', 'GRAND TOTAL', '', totalCost, ''],
  ]
  const wsDest = XLSX.utils.aoa_to_sheet(destData)
  wsDest['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 20 }, { wch: 22 }, { wch: 40 }]
  XLSX.utils.book_append_sheet(wb, wsDest, 'Destinasi & Biaya')

  // Sheet 3: Rundown
  const dayCount = getDayCount(trip.start_date, trip.end_date)
  const runRows = []
  for (let day = 1; day <= dayCount; day++) {
    const items = (trip.rundown || [])
      .filter(r => r.day === day)
      .sort((a, b) => (a.sort_order - b.sort_order) || a.time?.localeCompare(b.time))
    items.forEach(r => {
      runRows.push([
        `Hari ke-${r.day}`,
        r.title || '-',
        r.time || '-',
        fmtDuration(r.duration),
        r.notes || '',
      ])
    })
  }
  const wsRun = XLSX.utils.aoa_to_sheet([
    ['Hari', 'Jadwal', 'Pukul', 'Durasi', 'Keterangan'],
    ...runRows,
  ])
  wsRun['!cols'] = [{ wch: 12 }, { wch: 35 }, { wch: 16 }, { wch: 16 }, { wch: 30 }]
  XLSX.utils.book_append_sheet(wb, wsRun, 'Rundown')

  const safeName = (trip.name || 'trip').replace(/[^a-z0-9]/gi, '_').toLowerCase()
  const dateStr  = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  XLSX.writeFile(wb, `tripplan_${safeName}_${dateStr}.xlsx`)
}

// ── SQLite DB Backup / Restore ───────────────────────────────────────────────
export async function backupDB() {
  const json = await exportDBJson()
  const blob = new Blob([json], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `tripplan_backup_${new Date().toISOString().slice(0,10)}.db`
  a.click()
  URL.revokeObjectURL(url)
}

export function restoreDB(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        await importDBJson(e.target.result)
        resolve()
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Gagal membaca file'))
    reader.readAsText(file)
  })
}

/** Import dari file Excel (.xlsx) ke dalam DB */
export async function importFromExcel(file, addDestinationFn, addRundownFn) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const wb   = XLSX.read(e.target.result, { type: 'array' })
        const dest = XLSX.utils.sheet_to_json(wb.Sheets['Destinasi & Biaya'] || wb.Sheets[wb.SheetNames[1]])
        const run  = XLSX.utils.sheet_to_json(wb.Sheets['Rundown'] || wb.Sheets[wb.SheetNames[2]])
        resolve({ destinations: dest, rundown: run })
      } catch (err) {
        reject(new Error('File Excel tidak valid: ' + err.message))
      }
    }
    reader.onerror = () => reject(new Error('Gagal membaca file'))
    reader.readAsArrayBuffer(file)
  })
}
