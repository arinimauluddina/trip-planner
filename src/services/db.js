/**
 * db.js — SQLite Database Service
 * Uses @capacitor-community/sqlite when running on native (Android/iOS)
 * Falls back to IndexedDB-based SQLite (sql.js) on web/browser
 */

import { Capacitor } from '@capacitor/core'

// ── Constants ──────────────────────────────────────────────────────────────
const DB_NAME   = 'tripplan.db'
const DB_VERSION = 1

// ── Singleton connection ────────────────────────────────────────────────────
let _db = null
let _isNative = false

// ── DDL ─────────────────────────────────────────────────────────────────────
const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS trips (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT DEFAULT '',
    start_date  TEXT DEFAULT '',
    end_date    TEXT DEFAULT '',
    status      TEXT DEFAULT 'planned',
    color       TEXT DEFAULT 'red',
    created_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS city_pages (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    icon        TEXT DEFAULT '📍',
    content     TEXT DEFAULT '',
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS destinations (
    id        TEXT PRIMARY KEY,
    trip_id   TEXT NOT NULL,
    planning_id TEXT DEFAULT '',
    name      TEXT NOT NULL,
    location  TEXT DEFAULT '',
    category  TEXT DEFAULT 'other',
    cost      REAL DEFAULT 0,
    price_per_person REAL DEFAULT 0,
    people_count INTEGER DEFAULT 1,
    notes     TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS planning_items (
    id          TEXT PRIMARY KEY,
    trip_id     TEXT NOT NULL,
    name        TEXT NOT NULL,
    location    TEXT DEFAULT '',
    category    TEXT DEFAULT 'lainnya',
    cost        REAL DEFAULT 0,
    link        TEXT DEFAULT '',
    notes       TEXT DEFAULT '',
    status      TEXT DEFAULT 'considering',
    sort_order  INTEGER DEFAULT 0,
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS rundown (
    id         TEXT PRIMARY KEY,
    trip_id    TEXT NOT NULL,
    day        INTEGER DEFAULT 1,
    session    TEXT DEFAULT '',
    time       TEXT DEFAULT '',
    title      TEXT NOT NULL,
    duration   INTEGER DEFAULT 0,
    notes      TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
  );
`

// ── Init ────────────────────────────────────────────────────────────────────
export async function initDB() {
  _isNative = Capacitor.isNativePlatform()

  if (_isNative) {
    await initNativeDB()
  } else {
    await initWebDB()
  }
}

async function initNativeDB() {
  const { CapacitorSQLite } = await import('@capacitor-community/sqlite')
  // A WebView reload can keep the native SQLite connection alive. Close that
  // stale connection first so the next app boot can create it again cleanly.
  try {
    await CapacitorSQLite.closeConnection({ database: DB_NAME, readonly: false })
  } catch {
    // No existing connection on a normal first launch.
  }
  await CapacitorSQLite.createConnection({
    database: DB_NAME,
    version: DB_VERSION,
    encrypted: false,
    mode: 'no-encryption',
  })
  await CapacitorSQLite.open({ database: DB_NAME })

  // Execute schema
  for (const stmt of SCHEMA_SQL.split(';').filter(s => s.trim())) {
    await CapacitorSQLite.execute({ database: DB_NAME, statements: stmt + ';' })
  }

  // Add ticket pricing fields to databases created before this feature.
  const columns = await CapacitorSQLite.query({
    database: DB_NAME,
    statement: 'PRAGMA table_info(destinations)',
    values: [],
  })
  const existingColumns = new Set((columns.values || []).map(column => column.name))
  for (const [name, definition] of [
    ['planning_id', "TEXT DEFAULT ''"],
    ['location', "TEXT DEFAULT ''"],
    ['price_per_person', 'REAL DEFAULT 0'],
    ['people_count', 'INTEGER DEFAULT 1'],
  ]) {
    if (!existingColumns.has(name)) {
      await CapacitorSQLite.run({
        database: DB_NAME,
        statement: `ALTER TABLE destinations ADD COLUMN ${name} ${definition}`,
        values: [],
      })
    }
  }

  const planningColumns = await CapacitorSQLite.query({
    database: DB_NAME,
    statement: 'PRAGMA table_info(planning_items)',
    values: [],
  })
  const existingPlanningColumns = new Set((planningColumns.values || []).map(column => column.name))
  if (!existingPlanningColumns.has('location')) {
    await CapacitorSQLite.run({
      database: DB_NAME,
      statement: "ALTER TABLE planning_items ADD COLUMN location TEXT DEFAULT ''",
      values: [],
    })
  }

  _db = { type: 'native', CapacitorSQLite }
}

async function initWebDB() {
  // Use localStorage-based JSON store as web fallback
  _db = { type: 'web' }
  _ensureWebStore()
}

// ── Web fallback: localStorage JSON store ───────────────────────────────────
const WEB_KEY = 'tripplan_sqlite_v1'

function _ensureWebStore() {
  const raw = localStorage.getItem(WEB_KEY)
  if (!raw) {
    localStorage.setItem(WEB_KEY, JSON.stringify({ trips: [], destinations: [], rundown: [], planning: [], cities: [] }))
    return
  }
  try {
    const store = JSON.parse(raw)
    if (!Array.isArray(store.planning) || !Array.isArray(store.cities)) {
      store.planning = []
      if (!Array.isArray(store.cities)) store.cities = []
      localStorage.setItem(WEB_KEY, JSON.stringify(store))
    }
  } catch {
    localStorage.setItem(WEB_KEY, JSON.stringify({ trips: [], destinations: [], rundown: [], planning: [], cities: [] }))
  }
}

function _webLoad() {
  return JSON.parse(localStorage.getItem(WEB_KEY) || '{"trips":[],"destinations":[],"rundown":[],"planning":[],"cities":[]}')
}

function _webSave(store) {
  localStorage.setItem(WEB_KEY, JSON.stringify(store))
}

// ── Generic query helpers ───────────────────────────────────────────────────
async function _run(sql, params = []) {
  if (_isNative) {
    const { CapacitorSQLite } = _db
    await CapacitorSQLite.run({ database: DB_NAME, statement: sql, values: params })
  }
  // web: handled per-function
}

// ── UUID ────────────────────────────────────────────────────────────────────
function uuid() {
  return crypto.randomUUID()
}

// ============================================================
// TRIPS
// ============================================================
export async function getTrips() {
  if (!_isNative) {
    const store = _webLoad()
    return store.trips
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map(trip => ({
        ...trip,
        destinations: (store.destinations || [])
          .filter(destination => destination.trip_id === trip.id)
          .sort((a, b) => a.sort_order - b.sort_order),
      }))
  }
  const { CapacitorSQLite } = _db
  const res = await CapacitorSQLite.query({
    database: DB_NAME,
    statement: 'SELECT * FROM trips ORDER BY created_at DESC',
    values: [],
  })
  const trips = res.values || []
  if (!trips.length) return trips

  const destinationsRes = await CapacitorSQLite.query({
    database: DB_NAME,
    statement: 'SELECT * FROM destinations ORDER BY sort_order',
    values: [],
  })
  const destinationsByTrip = (destinationsRes.values || []).reduce((groups, destination) => {
    if (!groups[destination.trip_id]) groups[destination.trip_id] = []
    groups[destination.trip_id].push(destination)
    return groups
  }, {})

  return trips.map(trip => ({
    ...trip,
    destinations: destinationsByTrip[trip.id] || [],
  }))
}

// ============================================================
// CITY PAGES
// ============================================================
export async function getCityPages() {
  if (!_isNative) {
    return (_webLoad().cities || []).sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  }
  const { CapacitorSQLite } = _db
  const res = await CapacitorSQLite.query({
    database: DB_NAME,
    statement: 'SELECT * FROM city_pages ORDER BY updated_at DESC',
    values: [],
  })
  return res.values || []
}

export async function getCityPage(id) {
  if (!_isNative) {
    return (_webLoad().cities || []).find(city => city.id === id) || null
  }
  const { CapacitorSQLite } = _db
  const res = await CapacitorSQLite.query({
    database: DB_NAME,
    statement: 'SELECT * FROM city_pages WHERE id = ?',
    values: [id],
  })
  return res.values?.[0] || null
}

export async function createCityPage(data) {
  const now = new Date().toISOString()
  const city = {
    id: uuid(),
    name: data.name || '',
    icon: data.icon || '📍',
    content: data.content || '',
    created_at: now,
    updated_at: now,
  }
  if (!_isNative) {
    const store = _webLoad()
    store.cities = store.cities || []
    store.cities.unshift(city)
    _webSave(store)
    return city
  }
  const { CapacitorSQLite } = _db
  await CapacitorSQLite.run({
    database: DB_NAME,
    statement: `INSERT INTO city_pages (id,name,icon,content,created_at,updated_at)
                VALUES (?,?,?,?,?,?)`,
    values: [city.id, city.name, city.icon, city.content, city.created_at, city.updated_at],
  })
  return city
}

export async function updateCityPage(id, patch) {
  const fields = { ...patch, updated_at: new Date().toISOString() }
  if (!_isNative) {
    const store = _webLoad()
    const idx = (store.cities || []).findIndex(city => city.id === id)
    if (idx === -1) return
    store.cities[idx] = { ...store.cities[idx], ...fields }
    _webSave(store)
    return store.cities[idx]
  }
  const columns = Object.keys(fields)
  const values = [...Object.values(fields), id]
  const { CapacitorSQLite } = _db
  await CapacitorSQLite.run({
    database: DB_NAME,
    statement: `UPDATE city_pages SET ${columns.map(column => `${column} = ?`).join(', ')} WHERE id = ?`,
    values,
  })
  return getCityPage(id)
}

export async function deleteCityPage(id) {
  if (!_isNative) {
    const store = _webLoad()
    store.cities = (store.cities || []).filter(city => city.id !== id)
    _webSave(store)
    return
  }
  const { CapacitorSQLite } = _db
  await CapacitorSQLite.run({
    database: DB_NAME,
    statement: 'DELETE FROM city_pages WHERE id = ?',
    values: [id],
  })
}

export async function getTrip(id) {
  if (!_isNative) {
    const store = _webLoad()
    const trip = store.trips.find(t => t.id === id)
    if (!trip) return null
    return {
      ...trip,
      destinations: store.destinations.filter(d => d.trip_id === id).sort((a,b) => a.sort_order - b.sort_order),
      rundown:      store.rundown.filter(r => r.trip_id === id).sort((a,b) => a.sort_order - b.sort_order),
      planning:     (store.planning || []).filter(p => p.trip_id === id).sort((a,b) => a.sort_order - b.sort_order),
    }
  }
  const { CapacitorSQLite } = _db
  const tRes = await CapacitorSQLite.query({
    database: DB_NAME,
    statement: 'SELECT * FROM trips WHERE id = ?',
    values: [id],
  })
  if (!tRes.values?.length) return null
  const trip = tRes.values[0]
  const dRes = await CapacitorSQLite.query({
    database: DB_NAME,
    statement: 'SELECT * FROM destinations WHERE trip_id = ? ORDER BY sort_order',
    values: [id],
  })
  const rRes = await CapacitorSQLite.query({
    database: DB_NAME,
    statement: 'SELECT * FROM rundown WHERE trip_id = ? ORDER BY sort_order',
    values: [id],
  })
  const pRes = await CapacitorSQLite.query({
    database: DB_NAME,
    statement: 'SELECT * FROM planning_items WHERE trip_id = ? ORDER BY sort_order',
    values: [id],
  })
  return { ...trip, destinations: dRes.values || [], rundown: rRes.values || [], planning: pRes.values || [] }
}

export async function createTrip(data) {
  const trip = {
    id: uuid(),
    created_at: new Date().toISOString(),
    name: data.name || '',
    description: data.description || '',
    start_date: data.start_date || '',
    end_date: data.end_date || '',
    status: data.status || 'planned',
    color: data.color || 'red',
  }
  if (!_isNative) {
    const store = _webLoad()
    store.trips.push(trip)
    _webSave(store)
    return trip
  }
  const { CapacitorSQLite } = _db
  await CapacitorSQLite.run({
    database: DB_NAME,
    statement: `INSERT INTO trips (id,name,description,start_date,end_date,status,color,created_at)
                VALUES (?,?,?,?,?,?,?,?)`,
    values: [trip.id, trip.name, trip.description, trip.start_date, trip.end_date, trip.status, trip.color, trip.created_at],
  })
  return trip
}

export async function updateTrip(id, patch) {
  if (!_isNative) {
    const store = _webLoad()
    const idx = store.trips.findIndex(t => t.id === id)
    if (idx === -1) return
    store.trips[idx] = { ...store.trips[idx], ...patch }
    _webSave(store)
    return
  }
  const fields = Object.keys(patch).map(k => `${k} = ?`).join(', ')
  const values = [...Object.values(patch), id]
  const { CapacitorSQLite } = _db
  await CapacitorSQLite.run({
    database: DB_NAME,
    statement: `UPDATE trips SET ${fields} WHERE id = ?`,
    values,
  })
}

export async function deleteTrip(id) {
  if (!_isNative) {
    const store = _webLoad()
    store.trips        = store.trips.filter(t => t.id !== id)
    store.destinations = store.destinations.filter(d => d.trip_id !== id)
    store.rundown      = store.rundown.filter(r => r.trip_id !== id)
    store.planning     = (store.planning || []).filter(p => p.trip_id !== id)
    _webSave(store)
    return
  }
  const { CapacitorSQLite } = _db
  await CapacitorSQLite.run({
    database: DB_NAME,
    statement: 'DELETE FROM trips WHERE id = ?',
    values: [id],
  })
}

// ============================================================
// DESTINATIONS
// ============================================================
export async function addDestination(tripId, data) {
  const dest = {
    id: uuid(),
    trip_id: tripId,
    planning_id: data.planning_id || '',
    name: data.name || '',
    location: data.location || '',
    category: data.category || 'other',
    cost: Number(data.cost) || 0,
    price_per_person: Number(data.price_per_person) || 0,
    people_count: Math.max(1, Number(data.people_count) || 1),
    notes: data.notes || '',
    sort_order: data.sort_order || 0,
  }
  if (!_isNative) {
    const store = _webLoad()
    store.destinations.push(dest)
    _webSave(store)
    return dest
  }
  const { CapacitorSQLite } = _db
  await CapacitorSQLite.run({
    database: DB_NAME,
    statement: `INSERT INTO destinations (id,trip_id,planning_id,name,location,category,cost,price_per_person,people_count,notes,sort_order)
                VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    values: [dest.id, dest.trip_id, dest.planning_id, dest.name, dest.location, dest.category, dest.cost, dest.price_per_person, dest.people_count, dest.notes, dest.sort_order],
  })
  return dest
}

export async function updateDestination(tripId, destId, patch) {
  if (!_isNative) {
    const store = _webLoad()
    const idx = store.destinations.findIndex(d => d.id === destId && d.trip_id === tripId)
    if (idx === -1) return
    store.destinations[idx] = { ...store.destinations[idx], ...patch }
    _webSave(store)
    return
  }
  const fields = Object.keys(patch).map(k => `${k} = ?`).join(', ')
  const values = [...Object.values(patch), destId, tripId]
  const { CapacitorSQLite } = _db
  await CapacitorSQLite.run({
    database: DB_NAME,
    statement: `UPDATE destinations SET ${fields} WHERE id = ? AND trip_id = ?`,
    values,
  })
}

export async function deleteDestination(tripId, destId) {
  if (!_isNative) {
    const store = _webLoad()
    store.destinations = store.destinations.filter(d => !(d.id === destId && d.trip_id === tripId))
    _webSave(store)
    return
  }
  const { CapacitorSQLite } = _db
  await CapacitorSQLite.run({
    database: DB_NAME,
    statement: 'DELETE FROM destinations WHERE id = ? AND trip_id = ?',
    values: [destId, tripId],
  })
}

export async function deleteDestinationByPlanning(tripId, planningId, fallback = {}) {
  const name = fallback.name || ''
  const category = fallback.category || 'other'
  const legacyCategory = fallback.legacyCategory || category
  const cost = Number(fallback.cost) || 0
  if (!_isNative) {
    const store = _webLoad()
    store.destinations = store.destinations.filter(destination => {
      if (destination.trip_id !== tripId) return true
      if (destination.planning_id === planningId) return false
      const isLegacyMatch = !destination.planning_id &&
        destination.name === name &&
        (destination.category === category || destination.category === legacyCategory) &&
        Number(destination.cost) === cost
      return !isLegacyMatch
    })
    _webSave(store)
    return
  }
  const { CapacitorSQLite } = _db
  await CapacitorSQLite.run({
    database: DB_NAME,
    statement: `DELETE FROM destinations
               WHERE trip_id = ? AND (
                 planning_id = ? OR
                 (COALESCE(planning_id, '') = '' AND name = ? AND category IN (?, ?) AND cost = ?)
               )`,
    values: [tripId, planningId, name, category, legacyCategory, cost],
  })
}

// ============================================================
// PLANNING ITEMS
// ============================================================
export async function addPlanningItem(tripId, data) {
  const item = {
    id: uuid(),
    trip_id: tripId,
    name: data.name || '',
    location: data.location || '',
    category: data.category || 'lainnya',
    cost: Number(data.cost) || 0,
    link: data.link || '',
    notes: data.notes || '',
    status: data.status || 'considering',
    sort_order: data.sort_order || 0,
  }
  if (!_isNative) {
    const store = _webLoad()
    store.planning = store.planning || []
    store.planning.push(item)
    _webSave(store)
    return item
  }
  const { CapacitorSQLite } = _db
  // Idempotent guard for databases created before the Planning tab existed.
  await CapacitorSQLite.execute({
    database: DB_NAME,
    statements: `CREATE TABLE IF NOT EXISTS planning_items (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL,
      name TEXT NOT NULL,
      location TEXT DEFAULT '',
      category TEXT DEFAULT 'lainnya',
      cost REAL DEFAULT 0,
      link TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      status TEXT DEFAULT 'considering',
      sort_order INTEGER DEFAULT 0
    );`,
  })
  await CapacitorSQLite.run({
    database: DB_NAME,
    statement: `INSERT INTO planning_items (id,trip_id,name,location,category,cost,link,notes,status,sort_order)
                VALUES (?,?,?,?,?,?,?,?,?,?)`,
    values: [item.id, item.trip_id, item.name, item.location, item.category, item.cost, item.link, item.notes, item.status, item.sort_order],
  })
  return item
}

export async function updatePlanningItem(tripId, itemId, patch) {
  if (!_isNative) {
    const store = _webLoad()
    const idx = (store.planning || []).findIndex(p => p.id === itemId && p.trip_id === tripId)
    if (idx === -1) return
    store.planning[idx] = { ...store.planning[idx], ...patch }
    _webSave(store)
    return
  }
  const fields = Object.keys(patch).map(k => `${k} = ?`).join(', ')
  const values = [...Object.values(patch), itemId, tripId]
  const { CapacitorSQLite } = _db
  await CapacitorSQLite.run({
    database: DB_NAME,
    statement: `UPDATE planning_items SET ${fields} WHERE id = ? AND trip_id = ?`,
    values,
  })
}

export async function deletePlanningItem(tripId, itemId) {
  if (!_isNative) {
    const store = _webLoad()
    store.planning = (store.planning || []).filter(p => !(p.id === itemId && p.trip_id === tripId))
    _webSave(store)
    return
  }
  const { CapacitorSQLite } = _db
  await CapacitorSQLite.run({
    database: DB_NAME,
    statement: 'DELETE FROM planning_items WHERE id = ? AND trip_id = ?',
    values: [itemId, tripId],
  })
}

// ============================================================
// RUNDOWN
// ============================================================
export async function addRundownItem(tripId, data) {
  const item = {
    id: uuid(),
    trip_id: tripId,
    day: Number(data.day) || 1,
    session: data.session || '',
    time: data.time || '',
    title: data.title || '',
    duration: Number(data.duration) || 0,
    notes: data.notes || '',
    sort_order: data.sort_order ?? 0,
  }
  if (!_isNative) {
    const store = _webLoad()
    store.rundown.push(item)
    _webSave(store)
    return item
  }
  const { CapacitorSQLite } = _db
  await CapacitorSQLite.run({
    database: DB_NAME,
    statement: `INSERT INTO rundown (id,trip_id,day,session,time,title,duration,notes,sort_order)
                VALUES (?,?,?,?,?,?,?,?,?)`,
    values: [item.id, item.trip_id, item.day, item.session, item.time, item.title, item.duration, item.notes, item.sort_order],
  })
  return item
}

// One-time local demo data. Run by opening localhost with ?seed=demo.
export async function seedDemoData() {
  const marker = 'tripplan_demo_seed_v1'
  if (typeof localStorage !== 'undefined' && localStorage.getItem(marker) === '1') {
    return { seeded: false, count: 0, reason: 'already-seeded' }
  }

  const demoTrips = [
    {
      trip: {
        name: 'Jogja Weekend',
        description: 'Wisata, kuliner, dan jalan santai di Yogyakarta.',
        start_date: '2026-10-23',
        end_date: '2026-10-25',
        status: 'planned',
        color: 'purple',
      },
      destinations: [
        { name: 'Malioboro', location: 'Jalan Malioboro', category: 'wisata', cost: 150000, notes: 'Jalan sore dan belanja oleh-oleh.' },
        { name: 'Hotel Prawirotaman', location: 'Prawirotaman, Yogyakarta', category: 'accommodation', cost: 900000, notes: 'Booking untuk 2 malam.' },
      ],
      planning: [
        { name: 'Keraton Yogyakarta', location: 'Alun-alun Utara', category: 'wisata', cost: 50000, status: 'selected', notes: 'Datang pagi agar tidak terlalu ramai.' },
        { name: 'Gudeg Yu Djum', location: 'Wijilan', category: 'food', cost: 120000, status: 'considering' },
      ],
      rundown: [
        { day: 1, time: '09:00', title: 'Berangkat ke Yogyakarta', duration: 60, notes: 'Cek tiket dan barang bawaan.' },
        { day: 1, time: '15:00', title: 'Check-in hotel', duration: 30, notes: 'Istirahat sebentar.' },
        { day: 2, time: '09:00', title: 'Wisata Keraton Yogyakarta', duration: 120 },
        { day: 2, time: '19:00', title: 'Kuliner Gudeg', duration: 90 },
      ],
    },
    {
      trip: {
        name: 'Bandung Escape',
        description: 'Liburan singkat menikmati udara sejuk dan kuliner Bandung.',
        start_date: '2026-11-06',
        end_date: '2026-11-08',
        status: 'planned',
        color: 'teal',
      },
      destinations: [
        { name: 'Farm House Lembang', location: 'Lembang, Bandung Barat', category: 'wisata', cost: 85000, notes: 'Bawa jaket dan kamera.' },
        { name: 'Dusun Bambu', location: 'Kolonel Masturi', category: 'wisata', cost: 100000, notes: 'Makan siang di area taman.' },
      ],
      planning: [
        { name: 'Sewa kendaraan', location: 'Bandung', category: 'transport', cost: 450000, status: 'selected' },
        { name: 'Batagor Kingsley', location: 'Veteran, Bandung', category: 'food', cost: 100000, status: 'considering' },
      ],
      rundown: [
        { day: 1, time: '08:00', title: 'Berangkat menuju Bandung', duration: 180, notes: 'Sarapan sebelum berangkat.' },
        { day: 1, time: '13:00', title: 'Check-in dan makan siang', duration: 90 },
        { day: 2, time: '09:00', title: 'Farm House Lembang', duration: 150 },
        { day: 2, time: '15:00', title: 'Dusun Bambu', duration: 180 },
      ],
    },
  ]

  for (const demo of demoTrips) {
    const trip = await createTrip(demo.trip)
    for (const destination of demo.destinations) await addDestination(trip.id, destination)
    for (const item of demo.planning) await addPlanningItem(trip.id, item)
    for (const item of demo.rundown) await addRundownItem(trip.id, item)
  }

  if (typeof localStorage !== 'undefined') localStorage.setItem(marker, '1')
  return { seeded: true, count: demoTrips.length }
}

export async function updateRundownItem(tripId, itemId, patch) {
  if (!_isNative) {
    const store = _webLoad()
    const idx = store.rundown.findIndex(r => r.id === itemId && r.trip_id === tripId)
    if (idx === -1) return
    store.rundown[idx] = { ...store.rundown[idx], ...patch }
    _webSave(store)
    return
  }
  const fields = Object.keys(patch).map(k => `${k} = ?`).join(', ')
  const values = [...Object.values(patch), itemId, tripId]
  const { CapacitorSQLite } = _db
  await CapacitorSQLite.run({
    database: DB_NAME,
    statement: `UPDATE rundown SET ${fields} WHERE id = ? AND trip_id = ?`,
    values,
  })
}

export async function deleteRundownItem(tripId, itemId) {
  if (!_isNative) {
    const store = _webLoad()
    store.rundown = store.rundown.filter(r => !(r.id === itemId && r.trip_id === tripId))
    _webSave(store)
    return
  }
  const { CapacitorSQLite } = _db
  await CapacitorSQLite.run({
    database: DB_NAME,
    statement: 'DELETE FROM rundown WHERE id = ? AND trip_id = ?',
    values: [itemId, tripId],
  })
}

export async function reorderRundown(tripId, orderedIds) {
  if (!_isNative) {
    const store = _webLoad()
    orderedIds.forEach((id, i) => {
      const item = store.rundown.find(r => r.id === id && r.trip_id === tripId)
      if (item) item.sort_order = i
    })
    _webSave(store)
    return
  }
  const { CapacitorSQLite } = _db
  for (let i = 0; i < orderedIds.length; i++) {
    await CapacitorSQLite.run({
      database: DB_NAME,
      statement: 'UPDATE rundown SET sort_order = ? WHERE id = ? AND trip_id = ?',
      values: [i, orderedIds[i], tripId],
    })
  }
}

// ============================================================
// BACKUP & RESTORE
// ============================================================

/** Export seluruh database sebagai JSON string (untuk backup .db file) */
export async function exportDBJson() {
  if (!_isNative) {
    return localStorage.getItem(WEB_KEY) || '{}'
  }

  const result = await _db.CapacitorSQLite.exportToJson({
    database: DB_NAME,
    jsonexportmode: 'full',
    readonly: false,
    encrypted: false,
  })
  return JSON.stringify(result)
}

/** Import dari JSON string (restore backup) */
export async function importDBJson(jsonStr) {
  if (_isNative) {
    return _db.CapacitorSQLite.importFromJson({ jsonstring: jsonStr })
  }

  try {
    const data = JSON.parse(jsonStr)
    if (!data.trips || !data.destinations || !data.rundown) {
      throw new Error('Format file tidak valid')
    }
    localStorage.setItem(WEB_KEY, jsonStr)
    return true
  } catch (e) {
    throw new Error('File backup tidak valid: ' + e.message)
  }
}

