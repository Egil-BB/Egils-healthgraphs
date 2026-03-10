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

// ── Clinical flag detection ───────────────────────────────────────────────────

function detectClinicalFlags({ labs, avgSys, avgDia, waist, sex, bmi }) {
  const flags = []
  const latestLab = (type) => labs.filter(l => l.type === type).sort((a, b) => b.date.localeCompare(a.date))[0]?.value ?? null

  const glucose = latestLab('glucose')
  const hba1c = latestLab('hba1c')
  const tg = latestLab('triglycerides')
  const hdl = latestLab('hdl')
  const egfr = latestLab('egfr')
  const creatinine = latestLab('creatinine')
  const albKrea = latestLab('albKrea')

  // ── Diabetes / Prediabetes ──────────────────────────────────────────────
  const hasDiabetes = (glucose !== null && glucose >= 7.0) || (hba1c !== null && hba1c >= 48)
  const hasPrediabetes = !hasDiabetes && ((glucose !== null && glucose >= 6.0) || (hba1c !== null && hba1c >= 42))

  if (hasDiabetes) {
    flags.push({
      id: 'diabetes',
      level: 'danger',
      icon: '🩸',
      title: 'Möjlig diabetes detekterad',
      details: [
        glucose !== null && glucose >= 7.0 ? `Fasteglukos ${glucose} mmol/L (≥7,0)` : null,
        hba1c !== null && hba1c >= 48 ? `HbA1c ${hba1c} mmol/mol (≥48)` : null
      ].filter(Boolean),
      advice: 'Kontakta din vårdcentral. Diabetes kräver diagnos via läkare och ofta behandling med kost, motion och/eller läkemedel. Målvärde HbA1c <52 (ofta <48 vid nydiagnostiserad).',
      link: 'https://www.1177.se/sjukdomar--besvar/hormoner-och-amnesomsattning/diabetes/'
    })
  } else if (hasPrediabetes) {
    flags.push({
      id: 'prediabetes',
      level: 'warn',
      icon: '🩸',
      title: 'Prediabetes/förhöjt socker',
      details: [
        glucose !== null && glucose >= 6.0 ? `Fasteglukos ${glucose} mmol/L (norm <6,0)` : null,
        hba1c !== null && hba1c >= 42 ? `HbA1c ${hba1c} mmol/mol (norm <42)` : null
      ].filter(Boolean),
      advice: 'Livsstilsförändringar kan förebygga diabetes typ 2. Fokusera på regelbunden motion, kostomläggning (minska snabba kolhydrater) och viktnedgång om övervikt föreligger. Diskutera med din läkare.',
      link: 'https://www.1177.se'
    })
  }

  // ── Kidney disease ──────────────────────────────────────────────────────
  const kidneyFlag = (egfr !== null && egfr < 60) || (albKrea !== null && albKrea > 3) ||
    (creatinine !== null && ((sex === 'male' && creatinine > 105) || (sex === 'female' && creatinine > 90)))

  if (kidneyFlag) {
    flags.push({
      id: 'kidney',
      level: egfr !== null && egfr < 45 ? 'danger' : 'warn',
      icon: '🫘',
      title: 'Tecken på nedsatt njurfunktion',
      details: [
        egfr !== null && egfr < 60 ? `eGFR ${egfr} mL/min (norm ≥60)` : null,
        creatinine !== null && ((sex === 'male' && creatinine > 105) || (sex === 'female' && creatinine > 90))
          ? `Kreatinin ${creatinine} µmol/L (norm: män <105, kvinnor <90)` : null,
        albKrea !== null && albKrea > 3 ? `Alb-krea kvot ${albKrea} mg/mmol (norm <3)` : null
      ].filter(Boolean),
      advice: 'Njurpåverkan kan ha flera orsaker (högt BT, diabetes, läkemedel m.m.). Kontrollera blodtrycksmediciner (ARB/ACE, HKTZ) och Metformin. Diskutera med din läkare om uppföljning.',
      link: 'https://www.1177.se/sjukdomar--besvar/njurar-och-urinvagar/'
    })
  }

  // ── Metabolic syndrome ──────────────────────────────────────────────────
  let metSyndCriteria = 0
  const metSyndDetails = []
  const waistLimit = sex === 'female' ? 80 : 94
  if (waist && waist >= waistLimit) { metSyndCriteria++; metSyndDetails.push(`Midjemått ${waist} cm (gräns ${waistLimit} cm)`) }
  if (tg !== null && tg >= 1.7) { metSyndCriteria++; metSyndDetails.push(`Triglycerider ${tg} mmol/L (≥1,7)`) }
  const hdlLimit = sex === 'female' ? 1.3 : 1.0
  if (hdl !== null && hdl < hdlLimit) { metSyndCriteria++; metSyndDetails.push(`HDL ${hdl} mmol/L (<${hdlLimit})`) }
  if (avgSys && avgDia && (avgSys >= 130 || avgDia >= 85)) { metSyndCriteria++; metSyndDetails.push(`BT ${avgSys}/${avgDia} mmHg (≥130/85)`) }
  if (glucose !== null && glucose >= 6.0) { metSyndCriteria++ } // already counted above if prediabetes shown

  if (metSyndCriteria >= 3 && !hasDiabetes) {
    flags.push({
      id: 'metsynd',
      level: 'warn',
      icon: '⚖️',
      title: 'Möjligt metabolt syndrom',
      details: metSyndDetails,
      advice: 'Metabolt syndrom ökar risken för hjärt-kärlsjukdom och typ 2-diabetes avsevärt. Livsstilsbehandling (ökad motion, minskat socker/kolhydrater, viktnedgång) är förstahandsval. Diskutera med din läkare.',
      link: 'https://www.1177.se'
    })
  }

  return flags
}

// ── PSA recommendation ────────────────────────────────────────────────────────

function getPsaRecommendation(psaValue, age, hereditary) {
  if (psaValue === null || !age) return null
  let nextTest, comment, level = 'info'

  if (psaValue >= 4.0) {
    nextTest = 'Snarast – remiss till urolog'
    comment = 'PSA ≥4,0 µg/L. Kontakta din läkare för bedömning och eventuell remiss till urolog.'
    level = 'danger'
  } else if (psaValue >= 2.0) {
    nextTest = hereditary ? 'Om 6–12 månader' : 'Om 12 månader'
    comment = `PSA ${psaValue} µg/L (2,0–4,0). Tätare kontroller rekommenderas.${hereditary ? ' Ärftlig riskgrupp – tätare kontroll.' : ''}`
    level = 'warn'
  } else if (psaValue >= 1.0) {
    nextTest = hereditary ? 'Om 1–2 år' : 'Om 2 år'
    comment = `PSA ${psaValue} µg/L (1,0–2,0). Regelbunden kontroll rekommenderas.`
  } else {
    nextTest = hereditary ? 'Om 2 år' : (age < 55 ? 'Om 5–8 år' : 'Om 4 år')
    comment = `PSA ${psaValue} µg/L (< 1,0). Låg risk, gles kontroll räcker.`
  }

  return { nextTest, comment, level }
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ScoreView({ refreshKey }) {
  const [patientName, setPatientName] = useState('')
  const [autoResult, setAutoResult] = useState(null)
  const [autoScenarios, setAutoScenarios] = useState(null)
  const [autoFilled, setAutoFilled] = useState([])
  const [missing, setMissing] = useState([])
  const [autoParams, setAutoParams] = useState(null)
  const [bmiData, setBmiData] = useState(null)
  const [waistData, setWaistData] = useState(null)
  const [clinicalFlags, setClinicalFlags] = useState([])
  const [psaData, setPsaData] = useState(null)
  const [psaHereditary, setPsaHereditary] = useState(false)
  const [sex, setSex] = useState(null)

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
      if (savedProfile?.sex) setSex(savedProfile.sex)

      // Height + latest weight → BMI
      let latestWaist = null
      if (savedProfile?.height && weights.length > 0) {
        const latestW = [...weights].sort((a, b) => b.date.localeCompare(a.date))[0]
        const bmi = calcBMI(latestW.weight, savedProfile.height)
        if (bmi) setBmiData({ bmi, weight: latestW.weight, height: savedProfile.height, date: latestW.date, category: bmiCategory(bmi) })
        if (latestW.waist) {
          latestWaist = latestW.waist
          const profileSex = savedProfile?.sex || 'male'
          const riskLimit = profileSex === 'female' ? 80 : 94
          const highRiskLimit = profileSex === 'female' ? 88 : 102
          let riskLevel, riskColor, riskLabel
          if (latestW.waist < riskLimit) { riskLevel = 'ok'; riskColor = '#16a34a'; riskLabel = 'Ingen förhöjd risk' }
          else if (latestW.waist < highRiskLimit) { riskLevel = 'warn'; riskColor = '#ca8a04'; riskLabel = 'Ökad risk' }
          else { riskLevel = 'high'; riskColor = '#dc2626'; riskLabel = 'Hög risk' }
          setWaistData({ waist: latestW.waist, sex: profileSex, riskLimit, highRiskLimit, riskLevel, riskColor, riskLabel, date: latestW.date })
        }
      }

      // Age from birthdate
      let age = null
      if (savedProfile?.birthdate) {
        age = calculateAge(savedProfile.birthdate)
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

      // Smoking
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
      let avgSys = null, avgDia = null
      if (measurements.length > 0) {
        const sorted = [...measurements].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
        const daily = getDailyAverages(sorted)
        const recent14 = daily.slice(-14)
        if (recent14.length > 0) {
          avgSys = Math.round(recent14.reduce((s, d) => s + d.avgSys, 0) / recent14.length)
          avgDia = Math.round(recent14.reduce((s, d) => s + d.avgDia, 0) / recent14.length)
          params.sbp = avgSys
          filled.push(`Systoliskt BT: ${avgSys} mmHg (14-dagarssnitt)`)
        }
      } else {
        miss.push('Blodtrycksmätningar (registrera under Blodtryck)')
      }

      // Non-HDL direct
      const latestNonHdlDirect = labs.filter(l => l.type === 'nonHdl').sort((a, b) => b.date.localeCompare(a.date))[0]
      if (latestNonHdlDirect) {
        params.nonHdlDirect = latestNonHdlDirect.value
        filled.push(`Non-HDL (direkt): ${latestNonHdlDirect.value} mmol/L`)
      }

      // Total cholesterol
      const latestTotal = labs.filter(l => l.type === 'totalCholesterol').sort((a, b) => b.date.localeCompare(a.date))[0]
      if (latestTotal) {
        params.totalCholesterol = latestTotal.value
        filled.push(`Totalkolesterol: ${latestTotal.value} mmol/L`)
      } else if (!latestNonHdlDirect) {
        miss.push('Totalkolesterol (lägg in under Provsvar)')
      }

      // HDL
      const latestHdl = labs.filter(l => l.type === 'hdl').sort((a, b) => b.date.localeCompare(a.date))[0]
      if (latestHdl) {
        params.hdl = latestHdl.value
        filled.push(`HDL: ${latestHdl.value} mmol/L`)
      } else if (!latestNonHdlDirect) {
        filled.push('HDL: ej angivet – medelvärde 1,3 används')
      }

      setAutoFilled(filled)
      setMissing(miss)
      setAutoParams(params)

      if (params.age && params.sex && params.sbp && (params.totalCholesterol || params.nonHdlDirect)) {
        setAutoResult(calculateScore2(params))
        setAutoScenarios(calculateRiskScenarios(params))
      }

      // Clinical flags
      const flags = detectClinicalFlags({
        labs,
        avgSys,
        avgDia,
        waist: latestWaist,
        sex: savedProfile?.sex,
        bmi: null
      })
      setClinicalFlags(flags)

      // PSA (males only)
      if (savedProfile?.sex === 'male') {
        const latestPsa = labs.filter(l => l.type === 'psa').sort((a, b) => b.date.localeCompare(a.date))[0]
        if (latestPsa) {
          setPsaData({ value: latestPsa.value, date: latestPsa.date, age })
        }
      }
    }
    load()
  }, [refreshKey])

  const riskBarWidth = autoResult ? Math.min(autoResult.risk * 100 * 4, 100) : 0

  // PSA recommendation (live update when hereditary toggle changes)
  const psaRec = psaData ? getPsaRecommendation(psaData.value, psaData.age, psaHereditary) : null

  return (
    <div className="view-content">
      <div className="card">
        <h2 className="card-title">Risk & hälsoöversikt</h2>
        {patientName && <p className="score-patient-name">{patientName}</p>}
        <p className="card-desc" style={{ marginTop: 6, fontSize: 13 }}>
          Kalkylatorn läser automatiskt in dina senaste blodtrycksmätningar, provsvar och profil och beräknar SCORE2-risk samt söker efter tecken på diabetes, njursjukdom och metabolt syndrom.
        </p>
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

          {waistData && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Midjemått</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: waistData.riskColor }}>
                  {waistData.waist} cm
                  <span style={{ fontSize: 13, fontWeight: 600, marginLeft: 8 }}>{waistData.riskLabel}</span>
                </span>
              </div>
              <div style={{ position: 'relative', height: 28, borderRadius: 6, overflow: 'hidden', display: 'flex' }}>
                <div style={{ flex: waistData.riskLimit, background: '#dcfce730', borderRight: '2px solid #16a34a' }} />
                <div style={{ flex: waistData.highRiskLimit - waistData.riskLimit, background: '#fef9c330', borderRight: '2px solid #ca8a04' }} />
                <div style={{ flex: 20, background: '#fee2e230' }} />
                <div style={{
                  position: 'absolute', top: 0, bottom: 0, width: 3, background: waistData.riskColor, borderRadius: 2,
                  left: `${Math.min(Math.max((waistData.waist - (waistData.riskLimit - 20)) / ((waistData.highRiskLimit + 20) - (waistData.riskLimit - 20)) * 100, 1), 98)}%`
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                <span style={{ color: '#16a34a' }}>Normal (&lt;{waistData.riskLimit} cm)</span>
                <span style={{ color: '#ca8a04' }}>Ökad ({waistData.riskLimit}–{waistData.highRiskLimit - 1})</span>
                <span style={{ color: '#dc2626' }}>Hög risk (≥{waistData.highRiskLimit})</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Gränser gäller {waistData.sex === 'female' ? 'kvinnor' : 'män'}.
                Midjemått är central för bedömning av metabol risk.
              </p>
            </div>
          )}
          {!waistData && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
              Registrera midjemått under Vikt för riskvärdering av bukfetma.
            </p>
          )}
        </div>
      )}

      {/* Clinical flags */}
      {clinicalFlags.length > 0 && (
        <div className="card">
          <h3 className="card-title">Kliniska fynd</h3>
          {clinicalFlags.map(f => (
            <div key={f.id} className={`clin-flag clin-flag-${f.level}`}>
              <div className="clin-flag-header">
                <span className="clin-flag-icon">{f.icon}</span>
                <span className="clin-flag-title">{f.title}</span>
              </div>
              {f.details.length > 0 && (
                <ul className="clin-flag-details">
                  {f.details.map((d, i) => <li key={i}>{d}</li>)}
                </ul>
              )}
              <p className="clin-flag-advice">{f.advice}</p>
              <a href={f.link} target="_blank" rel="noopener noreferrer" className="clin-flag-link">
                Mer på 1177 ↗
              </a>
            </div>
          ))}
        </div>
      )}

      {clinicalFlags.length === 0 && autoResult && (
        <div className="card">
          <p className="score-no-flags">✓ Inga kroniska sjukdomar detekterade utifrån tillgängliga provsvar.</p>
        </div>
      )}

      {/* PSA (males only) */}
      {sex === 'male' && psaData && psaRec && (
        <div className="card">
          <h3 className="card-title">PSA-uppföljning</h3>
          <div className="psa-row">
            <span className="psa-val">{psaData.value} µg/L</span>
            <span className="psa-date">({psaData.date})</span>
          </div>
          <label className="checkbox-label" style={{ marginTop: 8 }}>
            <input type="checkbox" checked={psaHereditary} onChange={e => setPsaHereditary(e.target.checked)} />
            Ärftlig riskgrupp (nära manlig släkting med prostatacancer)
          </label>
          <div className={`psa-rec psa-rec-${psaRec.level}`}>
            <span className="psa-rec-next">Nästa provtagning: <strong>{psaRec.nextTest}</strong></span>
            <p className="psa-rec-comment">{psaRec.comment}</p>
          </div>
          <p className="psa-disclaimer">PSA-screening är individuell och inte en del av allmän screening i Sverige. Diskutera med din läkare. <a href="https://www.1177.se" target="_blank" rel="noopener noreferrer">1177 ↗</a></p>
        </div>
      )}
      {sex === 'male' && !psaData && (
        <div className="card">
          <p className="card-desc">
            <strong>PSA:</strong> Lägg till PSA-värde under Provsvar för att se rekommendation om nästa provtagning.
          </p>
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

          {autoScenarios && autoScenarios.improvements.length > 0 && (
            <div className="card">
              <h3 className="card-title">Förväntad riskminskning</h3>
              <p className="card-desc" style={{ marginBottom: 10, fontSize: 13 }}>
                Visar hur mycket din 10-årsrisk kan sänkas om du når blodtrycksmålet (&lt;130 mmHg) och/eller förbättrar blodfetterna.
              </p>
              {autoScenarios.current.sbp < 130 && (
                <p className="card-desc" style={{ fontSize: 12, marginBottom: 8, color: '#16a34a' }}>
                  ✓ Blodtryck redan under mål (&lt;130 mmHg).
                </p>
              )}
              <div className="scenarios">
                {autoScenarios.improvements.map((s, i) => {
                  const reduction = (parseFloat(autoScenarios.current.riskPercent) - parseFloat(s.riskPercent)).toFixed(1)
                  return (
                    <div
                      key={i}
                      className={`scenario-item ${s.combined ? 'scenario-combined' : ''}`}
                      style={{ borderColor: s.category.color }}
                    >
                      <div className="scenario-label">{s.label}</div>
                      <div className="scenario-sbp">{s.sbp} mmHg · non-HDL {s.nonHdl}</div>
                      <div className="scenario-risk" style={{ color: s.category.color }}>{s.riskPercent}%</div>
                      <div className="scenario-cat" style={{ color: s.category.color }}>{s.category.label}</div>
                      <div className="scenario-diff" style={{ color: '#16a34a' }}>−{reduction}% risk</div>
                    </div>
                  )
                })}
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
