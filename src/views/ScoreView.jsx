import { useState, useEffect } from 'react'
import { getAllMeasurements, getAllLabs, getAllWeights, getProfile } from '../db/db'
import { getDailyAverages } from '../utils/bp'
import { LAB_TYPES } from '../utils/score2'

// ── Neutral "Senaste värden" overview ────────────────────────────────────────

export default function ScoreView({ refreshKey }) {
  const [bpLatest, setBpLatest] = useState(null)
  const [labs, setLabs] = useState([])
  const [weightLatest, setWeightLatest] = useState(null)
  const [heightCm, setHeightCm] = useState(null)

  useEffect(() => {
    async function load() {
      const [ms, ls, ws, profile] = await Promise.all([
        getAllMeasurements(), getAllLabs(), getAllWeights(), getProfile('patientProfile')
      ])
      const sorted = ms.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      const daily = getDailyAverages(sorted)
      if (daily.length) {
        const last = daily[daily.length - 1]
        setBpLatest({ sys: last.avgSys, dia: last.avgDia, date: last.date, count: last.count })
      }
      setLabs(ls)
      const ws2 = [...ws].sort((a, b) => b.date.localeCompare(a.date))
      if (ws2.length) setWeightLatest(ws2[0])
      if (profile?.height) setHeightCm(parseFloat(profile.height))
    }
    load()
  }, [refreshKey])

  // Latest value per lab type
  const latestByType = {}
  for (const lab of labs) {
    if (!latestByType[lab.type] || lab.date > latestByType[lab.type].date) {
      latestByType[lab.type] = lab
    }
  }

  const labTypeOrder = [
    'totalCholesterol', 'ldl', 'hdl', 'nonHdl', 'triglycerides',
    'glucose', 'hba1c', 'hemoglobin', 'ferritin',
    'creatinine', 'egfr', 'albKrea', 'kalium',
    'alat', 'tsh', 'crp', 'urat', 'psa'
  ]

  const displayedLabs = labTypeOrder
    .filter(t => latestByType[t])
    .map(t => ({ ...latestByType[t], meta: LAB_TYPES[t] }))

  const bmi = heightCm && weightLatest
    ? (weightLatest.weight / Math.pow(heightCm / 100, 2)).toFixed(1)
    : null

  return (
    <div className="view-content">
      <div className="card">
        <h2 className="card-title">📋 Senaste inmatade värden</h2>
        <p className="card-desc">
          En sammanfattning av det senast inmatade värdet per kategori.
          Inga tolkningar – enbart råa siffror du matat in själv.
        </p>
      </div>

      {/* Blood pressure */}
      <div className="card">
        <h3 className="card-title">Blodtryck</h3>
        {bpLatest ? (
          <div className="overview-row">
            <span className="overview-label">Senaste dagsmedelsvärde</span>
            <span className="overview-value">{bpLatest.sys}/{bpLatest.dia} mmHg</span>
            <span className="overview-date">{bpLatest.date} · {bpLatest.count} mätning{bpLatest.count !== 1 ? 'ar' : ''}</span>
          </div>
        ) : (
          <p className="card-desc">Inga blodtrycksmätningar registrerade.</p>
        )}
      </div>

      {/* Weight / BMI */}
      <div className="card">
        <h3 className="card-title">Vikt</h3>
        {weightLatest ? (
          <div>
            <div className="overview-row">
              <span className="overview-label">Senaste vikt</span>
              <span className="overview-value">{weightLatest.weight} kg</span>
              <span className="overview-date">{weightLatest.date}</span>
            </div>
            {bmi && (
              <div className="overview-row">
                <span className="overview-label">Beräknat BMI</span>
                <span className="overview-value">{bmi}</span>
                <span className="overview-date">baserat på inmatat värde</span>
              </div>
            )}
            {!heightCm && (
              <p style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>
                Ange längd i Inställningar för att beräkna BMI.
              </p>
            )}
          </div>
        ) : (
          <p className="card-desc">Ingen vikt registrerad.</p>
        )}
      </div>

      {/* Lab values */}
      <div className="card">
        <h3 className="card-title">Provsvar</h3>
        <p className="card-desc" style={{ marginBottom: 10 }}>
          Senaste inmatade värde per provtyp.
        </p>
        {displayedLabs.length === 0 ? (
          <p className="card-desc">Inga provsvar registrerade.</p>
        ) : (
          <div>
            {displayedLabs.map(lab => (
              <div key={lab.type} className="overview-row">
                <span className="overview-label">{lab.meta?.label ?? lab.type}</span>
                <span className="overview-value">{lab.value} {lab.meta?.unit ?? ''}</span>
                <span className="overview-date">{lab.date}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
          Personligt loggverktyg. All data lagras lokalt på din enhet.
          Ingenting här utgör medicinsk rådgivning – prata med din vårdgivare om tolkning av dina värden.
        </p>
      </div>
    </div>
  )
}
