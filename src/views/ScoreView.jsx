import { useState, useEffect } from 'react'
import { getProfile, getAllLabs, getAllMeasurements } from '../db/db'
import { calculateScore2, calculateRiskScenarios, LAB_TYPES } from '../utils/score2'
import { getDailyAverages } from '../utils/bp'

function calculateAge(birthdate) {
  const today = new Date()
  const birth = new Date(birthdate)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

export default function ScoreView() {
  const [patientName, setPatientName] = useState('')
  const [autoResult, setAutoResult] = useState(null)
  const [autoScenarios, setAutoScenarios] = useState(null)
  const [autoFilled, setAutoFilled] = useState([])
  const [missing, setMissing] = useState([])
  const [autoParams, setAutoParams] = useState(null)

  useEffect(() => {
    async function load() {
      const [savedProfile, labs, measurements] = await Promise.all([
        getProfile('patientProfile'),
        getAllLabs(),
        getAllMeasurements()
      ])

      const params = {}
      const filled = []
      const miss = []

      // Name
      if (savedProfile?.name) setPatientName(savedProfile.name)

      // Age from birthdate
      if (savedProfile?.birthdate) {
        const age = calculateAge(savedProfile.birthdate)
        if (age >= 40 && age <= 79) {
          params.age = age
          filled.push(`Ålder: ${age} år (beräknat från ${savedProfile.birthdate})`)
        } else if (age < 40) {
          miss.push('Ålder under 40 – SCORE2 gäller 40–79 år')
        } else {
          miss.push('Ålder över 79 – SCORE2 gäller 40–79 år')
        }
      } else {
        miss.push('Födelsedatum (ange i Inställningar)')
      }

      // Sex
      if (savedProfile?.sex) {
        params.sex = savedProfile.sex
        filled.push(`Kön: ${savedProfile.sex === 'male' ? 'Man' : 'Kvinna'}`)
      } else {
        miss.push('Kön (ange i Inställningar)')
      }

      // Smoking
      params.smoking = savedProfile?.smoking || false
      filled.push(`Rökare: ${params.smoking ? 'Ja' : 'Nej'} (ändras i Inställningar)`)

      // SBP from 14-day average
      if (measurements.length > 0) {
        const sorted = [...measurements].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
        const daily = getDailyAverages(sorted)
        const recent14 = daily.slice(-14)
        if (recent14.length > 0) {
          const avgSys = Math.round(recent14.reduce((s, d) => s + d.avgSys, 0) / recent14.length)
          params.sbp = avgSys
          filled.push(`Systoliskt BT: ${avgSys} mmHg (14-dagarssnitt)`)
        }
      } else {
        miss.push('Blodtrycksmätningar (registrera i Mätvärden)')
      }

      // Total cholesterol from latest lab
      const latestTotal = labs
        .filter(l => l.type === 'totalCholesterol')
        .sort((a, b) => b.date.localeCompare(a.date))[0]
      if (latestTotal) {
        params.totalCholesterol = latestTotal.value
        filled.push(`Totalkolesterol: ${latestTotal.value} mmol/L (${latestTotal.date})`)
      } else {
        miss.push('Totalkolesterol (lägg in under Provsvar)')
      }

      // HDL from latest lab
      const latestHdl = labs
        .filter(l => l.type === 'hdl')
        .sort((a, b) => b.date.localeCompare(a.date))[0]
      if (latestHdl) {
        params.hdl = latestHdl.value
        filled.push(`HDL: ${latestHdl.value} mmol/L (${latestHdl.date})`)
      } else {
        filled.push('HDL: ej angivet – medelvärde 1,3 mmol/L används')
      }

      // Non-HDL from latest lab (overrides calculated)
      const latestNonHdl = labs
        .filter(l => l.type === 'nonHdl')
        .sort((a, b) => b.date.localeCompare(a.date))[0]
      if (latestNonHdl) {
        filled.push(`Non-HDL: ${latestNonHdl.value} mmol/L (${latestNonHdl.date}) – direkt från provsvar`)
      }

      setAutoFilled(filled)
      setMissing(miss)
      setAutoParams(params)

      // Auto-calculate if required fields present
      if (params.age && params.sex && params.sbp && params.totalCholesterol) {
        const res = calculateScore2(params)
        const scen = calculateRiskScenarios(params)
        setAutoResult(res)
        setAutoScenarios(scen)
      }
    }
    load()
  }, [])

  const riskBarWidth = autoResult ? Math.min(autoResult.risk * 100 * 4, 100) : 0

  return (
    <div className="view-content">
      <div className="card">
        <h2 className="card-title">SCORE2 – Din hjärt-kärlrisk</h2>
        {patientName && (
          <p className="score-patient-name">{patientName}</p>
        )}
        <p className="card-desc">
          10-årsrisk för hjärt-kärlsjukdom (ESC 2021, Norden). Beräknas automatiskt från dina registrerade värden.
        </p>
      </div>

      {/* Data sources card */}
      <div className="card">
        <h3 className="card-title">Underlag för beräkning</h3>
        {autoFilled.length > 0 && (
          <ul className="autofill-list">
            {autoFilled.map((s, i) => <li key={i} className="autofill-item">✓ {s}</li>)}
          </ul>
        )}
        {missing.length > 0 && (
          <>
            <div className="missing-label">Saknas:</div>
            <ul className="missing-list">
              {missing.map((s, i) => <li key={i} className="missing-item">⚠ {s}</li>)}
            </ul>
          </>
        )}
        <p className="card-hint" style={{ marginTop: 10 }}>
          Uppdatera profil och provsvar i <strong>Inställningar ⚙</strong> och fliken <strong>Provsvar</strong>.
        </p>
      </div>

      {!autoResult && missing.length > 0 && (
        <div className="card">
          <p className="score-waiting">
            Fyll i uppgifterna som saknas ovan för att se din risk automatiskt.
          </p>
        </div>
      )}

      {autoResult && (
        <>
          <div className="card score-result-card" style={{ borderColor: autoResult.category.color }}>
            <div className="score-main">
              <div className="score-percent" style={{ color: autoResult.category.color }}>
                {autoResult.riskPercent}%
              </div>
              <div className="score-category" style={{ background: autoResult.category.color }}>
                {autoResult.category.label}
              </div>
            </div>
            <p className="score-desc">{autoResult.category.desc}</p>

            <div className="risk-bar-track">
              <div className="risk-bar-fill" style={{ width: `${riskBarWidth}%`, background: autoResult.category.color }} />
              <div className="risk-bar-zones">
                <span style={{ left: '0%' }}>0%</span>
                <span style={{ left: '25%' }}>Låg</span>
                <span style={{ left: '50%' }}>Måttlig</span>
                <span style={{ left: '75%' }}>Hög</span>
                <span style={{ right: '0' }}>Mycket hög</span>
              </div>
            </div>

            <div className="score-nonhdl">
              Non-HDL: <strong>{autoResult.nonHdl} mmol/L</strong>
              {!autoParams?.hdl && <span className="form-hint"> (uppskattat – fråga din läkare om ditt faktiska non-HDL!)</span>}
            </div>
          </div>

          {autoScenarios && (
            <div className="card">
              <h3 className="card-title">Om blodtrycket sänks</h3>
              <p className="card-desc">Uppskattad riskförändring vid lägre blodtryck:</p>
              <div className="scenarios">
                {autoScenarios.map((s, i) => (
                  <div
                    key={i}
                    className={`scenario-item ${i === 0 ? 'scenario-current' : ''}`}
                    style={{ borderColor: s.category.color }}
                  >
                    <div className="scenario-label">{s.label}</div>
                    <div className="scenario-sbp">{s.sbp} mmHg</div>
                    <div className="scenario-risk" style={{ color: s.category.color }}>
                      {s.riskPercent}%
                    </div>
                    <div className="scenario-cat" style={{ color: s.category.color }}>
                      {s.category.label}
                    </div>
                    {i > 0 && (
                      <div className="scenario-diff" style={{ color: '#16a34a' }}>
                        −{(parseFloat(autoScenarios[0].riskPercent) - parseFloat(s.riskPercent)).toFixed(1)}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card disclaimer-card">
            <p className="disclaimer">
              <strong>OBS:</strong> SCORE2 är ett screeningverktyg och ersätter inte klinisk bedömning.
              Beräkningen bygger på populationsdata från nordiska länder.
              Diskutera alltid resultatet med din läkare.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
