import { openDB } from 'idb'

const DB_NAME = 'egils-halsografer'
const DB_VERSION = 2

let dbPromise = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // Version 1 stores
        if (!db.objectStoreNames.contains('measurements')) {
          const ms = db.createObjectStore('measurements', { keyPath: 'id', autoIncrement: true })
          ms.createIndex('date', 'date')
          ms.createIndex('timestamp', 'timestamp')
        }
        if (!db.objectStoreNames.contains('medications')) {
          const med = db.createObjectStore('medications', { keyPath: 'id', autoIncrement: true })
          med.createIndex('startDate', 'startDate')
        }
        if (!db.objectStoreNames.contains('labs')) {
          const lab = db.createObjectStore('labs', { keyPath: 'id', autoIncrement: true })
          lab.createIndex('date', 'date')
        }
        if (!db.objectStoreNames.contains('lifestyle')) {
          const ls = db.createObjectStore('lifestyle', { keyPath: 'id', autoIncrement: true })
          ls.createIndex('date', 'date')
        }
        if (!db.objectStoreNames.contains('profile')) {
          db.createObjectStore('profile', { keyPath: 'key' })
        }
        // Version 2 stores
        if (!db.objectStoreNames.contains('weights')) {
          const w = db.createObjectStore('weights', { keyPath: 'id', autoIncrement: true })
          w.createIndex('date', 'date')
        }
      }
    })
  }
  return dbPromise
}

// ── Measurements ─────────────────────────────────────────────────────────────

export async function addMeasurement(data) {
  const db = await getDB()
  const now = new Date()
  const record = {
    ...data,
    timestamp: now.toISOString(),
    date: now.toISOString().slice(0, 10),
    timeOfDay: getTimeOfDay(now)
  }
  return db.add('measurements', record)
}

export async function getAllMeasurements() {
  const db = await getDB()
  return db.getAllFromIndex('measurements', 'timestamp')
}

export async function getMeasurementsByDateRange(from, to) {
  const db = await getDB()
  const all = await db.getAllFromIndex('measurements', 'date')
  return all.filter(m => m.date >= from && m.date <= to)
}

export async function deleteMeasurement(id) {
  const db = await getDB()
  return db.delete('measurements', id)
}

// ── Medications ───────────────────────────────────────────────────────────────

export async function addMedication(data) {
  const db = await getDB()
  return db.add('medications', data)
}

export async function getAllMedications() {
  const db = await getDB()
  return db.getAll('medications')
}

export async function updateMedication(id, data) {
  const db = await getDB()
  const existing = await db.get('medications', id)
  return db.put('medications', { ...existing, ...data, id })
}

export async function deleteMedication(id) {
  const db = await getDB()
  return db.delete('medications', id)
}

// ── Labs ─────────────────────────────────────────────────────────────────────

export async function addLab(data) {
  const db = await getDB()
  return db.add('labs', data)
}

export async function getAllLabs() {
  const db = await getDB()
  return db.getAllFromIndex('labs', 'date')
}

export async function deleteLab(id) {
  const db = await getDB()
  return db.delete('labs', id)
}

// ── Weights ───────────────────────────────────────────────────────────────────

export async function addWeight(data) {
  const db = await getDB()
  return db.add('weights', { ...data })
}

export async function getAllWeights() {
  const db = await getDB()
  return db.getAllFromIndex('weights', 'date')
}

export async function deleteWeight(id) {
  const db = await getDB()
  return db.delete('weights', id)
}

// ── Lifestyle ─────────────────────────────────────────────────────────────────

export async function addLifestyle(data) {
  const db = await getDB()
  return db.add('lifestyle', { ...data, date: new Date().toISOString().slice(0, 10) })
}

export async function getAllLifestyle() {
  const db = await getDB()
  return db.getAllFromIndex('lifestyle', 'date')
}

// ── Profile ──────────────────────────────────────────────────────────────────

export async function getProfile(key) {
  const db = await getDB()
  const entry = await db.get('profile', key)
  return entry ? entry.value : null
}

export async function setProfile(key, value) {
  const db = await getDB()
  return db.put('profile', { key, value })
}

export async function getAllProfileKeys() {
  const db = await getDB()
  return db.getAll('profile')
}

// ── Export / Import ───────────────────────────────────────────────────────────

export async function exportAllData() {
  const db = await getDB()
  return {
    measurements: await db.getAll('measurements'),
    medications: await db.getAll('medications'),
    labs: await db.getAll('labs'),
    lifestyle: await db.getAll('lifestyle'),
    weights: await db.getAll('weights'),
    profile: await db.getAll('profile'),
    exportedAt: new Date().toISOString()
  }
}

export async function importData(data) {
  const db = await getDB()
  const stores = ['measurements', 'medications', 'labs', 'lifestyle', 'weights', 'profile']
  const tx = db.transaction(stores, 'readwrite')
  for (const m of (data.measurements || [])) {
    try { await tx.objectStore('measurements').put(m) } catch {}
  }
  for (const m of (data.medications || [])) {
    try { await tx.objectStore('medications').put(m) } catch {}
  }
  for (const l of (data.labs || [])) {
    try { await tx.objectStore('labs').put(l) } catch {}
  }
  for (const l of (data.lifestyle || [])) {
    try { await tx.objectStore('lifestyle').put(l) } catch {}
  }
  for (const w of (data.weights || [])) {
    try { await tx.objectStore('weights').put(w) } catch {}
  }
  for (const p of (data.profile || [])) {
    try { await tx.objectStore('profile').put(p) } catch {}
  }
  await tx.done
}

export async function clearAllData() {
  const db = await getDB()
  const stores = ['measurements', 'medications', 'labs', 'lifestyle', 'weights', 'profile']
  const tx = db.transaction(stores, 'readwrite')
  await Promise.all(stores.map(s => tx.objectStore(s).clear()))
  await tx.done
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTimeOfDay(date) {
  const h = date.getHours()
  if (h >= 6 && h < 11) return 'morning'
  if (h >= 11 && h < 17) return 'day'
  if (h >= 17 && h < 22) return 'evening'
  return 'night'
}
