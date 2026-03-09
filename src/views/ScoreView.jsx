import { useState, useEffect } from 'react'
import { getProfile, getAllLabs, getAllMeasurements, getAllWeights, getAllLifestyle } from '../db/db'
import { calculateScore2, calculateRiskScenarios } from '../utils/score2'
import { getDailyAverages } from '../utils/bp'
import { getSmokingFromLifestyle } from '../utils/lifestyle'

function calculateAge(birthdate) {
  const today = new Date()
  const birth = new Date(birthdate)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

function calcBMI(weight, heightCm) {
  if (!heightCm || heightCm < 100) return null
  const h = heightCm / 100
  return (weight / (h * h)).toFixed(1)
}

function bmiCategory(bmiVal) {
  const v = parseFloat(bmiVal)
  if (v < 18.5) return { label: 'Undervikt', color: '#ca8a04' }
  if (v < 25) return { label: 'Normalvikt', color: '#16a34a' }
  if (v < 30) return { label: 'Övervikt', color: '#ca8a04' }
  return { label: 'Fetma', color: '#dc2626' }
}

export default function ScoreView({ refreshKey }) {
  const [patientName, setPatientName] = useState('')
  const [autoResult, setAutoResult] = useState(null)
  const [autoScenarios, setAutoScenarios] = useState(null)
  const [autoFilled, setAutoFilled] = useState([])
  const [missing, setMissing] = useState([])
  const [autoParams, setAutoParams] = useState(null)
  const [bmiData, setBmiData] = useState(null)

  useEffect(() => {
    async function load() {
      const [savedProfile, labs, measurements, weights, lifestyles] = await Promise.all([
        getProfile('patientProfile'),
        getAllLabs(),
        getAllMeasurements(),
        getAllWeights(),
        getAllLifestyle()
      ])

      const params = {}
      const filled = []
      const miss = []

      if (savedProfile?.name) setPatientName(savedProfile.name)

      // Height + latest weight → BMI
      if (savedProfile?.height && weights.length > 0) {
        const latestW = [...weights].sort((a, b) => b.date.localeCompare(a.date))[0]
        const bmi = calcBMI(latestW.weight, savedProfile.height)
        if (bmi) setBmiData({ bmi, weight: latestW.weight, height: savedProfile.height, date: latestW.date, category: bmiCategory(bmi) })
      }

      // Age from birthdate
      if (savedProfile?.birthdate) {
        const age = calculateAge(savedProfile.birthdate)
        if (age >= 40 && age <= 79) {
          params.age = age
          filled.push(`Ålder: ${age} år`)
        } else if (age < 40) {
          miss.push('Ålder under 40 – SCORE2 gäller 40–79 år')
        } else {
          miss.push('Ålder över 79 – SCORE2 gäller 40–79 år')
        }
      } else {
        miss.push('Födelsedatum (ange i Inställningar ⚙)')
      }

      // Sex
      if (savedProfile?.sex) {
        params.sex = savedProfile.sex
        filled.push(`Kön: ${savedProfile.sex === 'male' ? 'Man' : 'Kvinna'}`)
      } else {
        miss.push('Kön (ange i Inställningar ⚙)')
      }

      // Smoking – from latest lifestyle questionnaire
      const sortedLifestyles = [...lifestyles].sort((a, b) => b.date.localeCompare(a.date))
      const latestLifestyle = sortedLifestyles[0]
      let isSmoker = savedProfile?.smoking || false
      if (latestLifestyle?.answers) {
        const fromQuestionnaire = getSmokingFromLifestyle(latestLifestyle.answers)
        if (fromQuestionnaire !== null) {
          isSmoker = fromQuestionnaire
          filled.push(`Rökare: ${isSmoker ? 'Ja' : 'Nej'} (enkät ${latestLifestyle.date})`)
        } else {
          filled.push(`Rökare: ${isSmoker ? 'Ja' : 'Nej'} (från profil)`)
        }
      } else {
        filled.push(`Rökare: ${isSmoker ? 'Ja' : 'Nej'} (profil – fyll i Levnadsvanor)`)
      }
      params.smoking = isSmoker

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
        miss.push('Blodtrycksmätningar (registrera under Blodtryck)')
      }

      // Total cholesterol
      const latestTotal = labs.filter(l => l.type === 'totalCholesterol').sort((a, b) => b.date.localeCompare(a.date))[0]
      if (latestTotal) {
        params.totalCholesterol = latestTotal.value
        filled.push(`Totalkolesterol: ${latestTotal.value} mmol/L`)
      } else {
        miss.push('Totalkolesterol (lägg in under Provsvar)')
      }

      // HDL
      const latestHdl = labs.filter(l => l.type === 'hdl').sort((a, b) => b.date.localeCompare(a.date))[0]
      if (latestHdl) {
        params.hdl = latestHdl.value
        filled.push(`HDL: ${latestHdl.value} mmol/L`)
      } else {
        filled.push('HDL: ej angivet – medelvärde 1,3 används')
      }

      setAutoFilled(filled)
      setMissing(miss)
      setAutoParams(params)

      if (params.age && params.sex && params.sbp && params.totalCholesterol) {
        setAutoResult(calculateScore2(params))
        setAutoScenarios(calculateRiskScenarios(params))
      }
    }
    load()
  }, [refreshKey])

  const riskBarWidth = autoResult ? Math.min(autoResult.risk * 100 * 4, 100) : 0

  return (
    <div className="view-content">
      <div className="card">
        <h2 className="card-title">Risk & hälsoöversikt</h2>
        {patientName && <p className="score-patient-name">{patientName}</p>}
      </div>

      {/* BMI */}
      {bmiData && (
        <div className="card">
          <h3 className="card-title">BMI</h3>
          <div className="bmi-score-row">
            <div className="bmi-score-val" style={{ color: bmiData.category.color }}>{bmiData.bmi}</div>
            <div>
              <div className="bmi-score-cat" style={{ color: bmiData.category.color }}>{bmiData.category.label}</div>
              <div className="bmi-score-sub">{bmiData.weight} kg · {bmiData.height} cm</div>
            </div>
          </div>
          <div className="bmi-bar-wrap">
            <div className="bmi-bar-track">
              {[
                { label: 'Undervikt', color: '#ca8a04', flex: 1 },
                { label: 'Normal', color: '#16a34a', flex: 2 },
                { label: 'Övervikt', color: '#ca8a04', flex: 1.5 },
                { label: 'Fetma', color: '#dc2626', flex: 2 },
              ].map((zone, i) => (
                <div key={i} className="bmi-bar-zone" style={{ background: zone.color + '30', flex: zone.flex }}>
                  <span className="bmi-zone-label">{zone.label}</span>
                </div>
              ))}
            </div>
            <div
              className="bmi-marker"
              style={{ left: `${Math.min(Math.max((parseFloat(bmiData.bmi) - 15) / 28 * 100, 0), 98)}%` }}
            >▼</div>
          </div>
          <p className="bmi-disclaimer">BMI kan vara missvisande vid hög muskelmassa.</p>
        </div>
      )}

      {/* SCORE2 underlag */}
      <div className="card">
        <h3 className="card-title">SCORE2 – underlag</h3>
        <p className="card-desc">10-årsrisk hjärt-kärlsjukdom, ESC 2021 (Norden).</p>
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
      </div>

      {!autoResult && missing.length > 0 && (
        <div className="card">
          <p className="score-waiting">Fyll i uppgifterna som saknas ovan för att se din risk automatiskt.</p>
        </div>
      )}

      {autoResult && (
        <>
          <div className="card score-result-card" style={{ borderColor: autoResult.category.color }}>
            <div className="score-main">
              <div className="score-percent" style={{ color: autoResult.category.color }}>{autoResult.riskPercent}%</div>
              <div className="score-category" style={{ background: autoResult.category.color }}>{autoResult.category.label}</div>
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
              {!autoParams?.hdl && (
                <span className="form-hint"> (uppskattat – fråga din läkare om ditt faktiska non-HDL!)</span>
              )}
            </div>
          </div>

          {autoScenarios && (
            <div className="card">
              <h3 className="card-title">Om blodtrycket sänks</h3>
              <div className="scenarios">
                {autoScenarios.map((s, i) => (
                  <div key={i} className={`scenario-item ${i === 0 ? 'scenario-current' : ''}`} style={{ borderColor: s.category.color }}>
                    <div className="scenario-label">{s.label}</div>
                    <div className="scenario-sbp">{s.sbp} mmHg</div>
                    <div className="scenario-risk" style={{ color: s.category.color }}>{s.riskPercent}%</div>
                    <div className="scenario-cat" style={{ color: s.category.color }}>{s.category.label}</div>
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
              Diskutera alltid resultatet med din läkare.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
