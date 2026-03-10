// Blood pressure utility functions

export const BP_CATEGORIES = [
  { label: 'Mycket lågt',   maxSys: 90,       maxDia: 60,       color: '#7c3aed', bg: '#ede9fe', crisis: false, low: true },
  { label: 'Lågt',          maxSys: 100,      maxDia: 65,       color: '#9333ea', bg: '#f3e8ff', crisis: false, low: true },
  { label: 'Optimalt',      maxSys: 130,      maxDia: 80,       color: '#16a34a', bg: '#dcfce7', crisis: false },
  { label: 'Acceptabelt',   maxSys: 136,      maxDia: 86,       color: '#65a30d', bg: '#ecfccb', crisis: false },
  { label: 'Förhöjt',      maxSys: 140,      maxDia: 90,       color: '#ca8a04', bg: '#fef9c3', crisis: false },
  { label: 'Högt',          maxSys: 160,      maxDia: 100,      color: '#ea580c', bg: '#ffedd5', crisis: false },
  { label: 'Mycket högt',   maxSys: 180,      maxDia: 110,      color: '#dc2626', bg: '#fee2e2', crisis: false },
  { label: 'Mycket högt!',  maxSys: Infinity, maxDia: Infinity, color: '#7f1d1d', bg: '#fca5a5', crisis: true }
]

export function classifyBP(sys, dia) {
  // Low BP: primarily driven by systolic
  if (sys < 90) return BP_CATEGORIES[0]
  if (sys < 100) return BP_CATEGORIES[1]
  for (const cat of BP_CATEGORIES.slice(2)) {
    if (sys < cat.maxSys && dia < cat.maxDia) return cat
  }
  return BP_CATEGORIES[BP_CATEGORIES.length - 1]
}

export function classifyBPByLabel(sys, dia) {
  return classifyBP(sys, dia).label
}

export function getBPColor(sys, dia) {
  return classifyBP(sys, dia).color
}

export function getBPBg(sys, dia) {
  return classifyBP(sys, dia).bg
}

export function isCrisisBP(sys, dia) {
  return classifyBP(sys, dia).crisis === true
}

// Time of day label (Swedish)
export const TIME_OF_DAY_LABELS = {
  morning: 'Morgon',
  day: 'Dag',
  evening: 'Kväll',
  night: 'Natt'
}

// Calculate reliability stars for a day's measurements
// 1 star: 1+ measurements any time
// 2 stars: at least 1 morning + 1 evening
// 3 stars: 2+ morning + 2+ evening
export function getReliabilityStars(ms) {
  if (!ms || ms.length === 0) return 0
  const morningMs = ms.filter(m => m.timeOfDay === 'morning')
  const eveningMs = ms.filter(m => m.timeOfDay === 'evening')
  if (morningMs.length >= 2 && eveningMs.length >= 2) return 3
  if (morningMs.length >= 1 && eveningMs.length >= 1) return 2
  return 1
}

// Group measurements by date and calculate daily averages
export function getDailyAverages(measurements) {
  const byDate = {}
  for (const m of measurements) {
    if (!byDate[m.date]) byDate[m.date] = []
    byDate[m.date].push(m)
  }
  return Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, ms]) => {
      const avgSys = Math.round(ms.reduce((s, m) => s + m.sys, 0) / ms.length)
      const avgDia = Math.round(ms.reduce((s, m) => s + m.dia, 0) / ms.length)
      const avgPulse = ms.some(m => m.pulse)
        ? Math.round(ms.filter(m => m.pulse).reduce((s, m) => s + m.pulse, 0) / ms.filter(m => m.pulse).length)
        : null
      const hasMorning = ms.some(m => m.timeOfDay === 'morning')
      const hasEvening = ms.some(m => m.timeOfDay === 'evening')
      const stars = getReliabilityStars(ms)
      return { date, avgSys, avgDia, avgPulse, count: ms.length, hasMorning, hasEvening, reliable: hasMorning && hasEvening, stars }
    })
}

// Calculate 14-day moving average from daily averages
export function getMovingAverage(dailyAverages, windowDays = 14) {
  return dailyAverages.map((day, i) => {
    const window = dailyAverages.slice(Math.max(0, i - windowDays + 1), i + 1)
    const avgSys = Math.round(window.reduce((s, d) => s + d.avgSys, 0) / window.length)
    const avgDia = Math.round(window.reduce((s, d) => s + d.avgDia, 0) / window.length)
    return { date: day.date, avgSys, avgDia, windowSize: window.length }
  })
}

// Trend feedback: compare last 14 days to previous 14 days
export function getTrendFeedback(measurements) {
  if (measurements.length === 0) return null

  const sorted = [...measurements].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  const now = new Date()
  const d14 = new Date(now); d14.setDate(d14.getDate() - 14)
  const d28 = new Date(now); d28.setDate(d28.getDate() - 28)

  const recent = sorted.filter(m => new Date(m.timestamp) >= d14)
  const previous = sorted.filter(m => new Date(m.timestamp) >= d28 && new Date(m.timestamp) < d14)

  if (recent.length === 0) return null

  const recentAvgSys = Math.round(recent.reduce((s, m) => s + m.sys, 0) / recent.length)
  const recentAvgDia = Math.round(recent.reduce((s, m) => s + m.dia, 0) / recent.length)

  const lastTenSys = sorted.slice(-10)
  const underTarget140 = lastTenSys.filter(m => m.sys < 140 && m.dia < 90).length
  const underTarget135 = lastTenSys.filter(m => m.sys < 135 && m.dia < 85).length
  const underTarget130 = lastTenSys.filter(m => m.sys < 130 && m.dia < 80).length

  let trend = null
  if (previous.length >= 3) {
    const prevAvgSys = Math.round(previous.reduce((s, m) => s + m.sys, 0) / previous.length)
    const prevAvgDia = Math.round(previous.reduce((s, m) => s + m.dia, 0) / previous.length)
    trend = { sysDiff: recentAvgSys - prevAvgSys, diaDiff: recentAvgDia - prevAvgDia }
  }

  return {
    recentAvgSys,
    recentAvgDia,
    recentCount: recent.length,
    trend,
    lastTenCount: lastTenSys.length,
    underTarget140,
    underTarget135,
    underTarget130,
    category: classifyBP(recentAvgSys, recentAvgDia)
  }
}

// Today's measurements summary
export function getTodaySummary(measurements) {
  const today = new Date().toISOString().slice(0, 10)
  const todayMs = measurements.filter(m => m.date === today)
  if (todayMs.length === 0) return null
  const avgSys = Math.round(todayMs.reduce((s, m) => s + m.sys, 0) / todayMs.length)
  const avgDia = Math.round(todayMs.reduce((s, m) => s + m.dia, 0) / todayMs.length)
  return { avgSys, avgDia, count: todayMs.length, measurements: todayMs }
}

// Format date to Swedish readable format
export function formatDateSv(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatTimeSv(isoStr) {
  const d = new Date(isoStr)
  return d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
}

// Get date N days ago as YYYY-MM-DD
export function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

// Fill in missing dates with null for chart continuity
export function fillDateGaps(dailyAverages, fromDate, toDate) {
  const map = {}
  for (const d of dailyAverages) map[d.date] = d

  const result = []
  const cur = new Date(fromDate)
  const end = new Date(toDate)
  while (cur <= end) {
    const dateStr = cur.toISOString().slice(0, 10)
    result.push(map[dateStr] || { date: dateStr, avgSys: null, avgDia: null, count: 0 })
    cur.setDate(cur.getDate() + 1)
  }
  return result
}
