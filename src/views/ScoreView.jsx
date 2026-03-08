import { useState, useEffect } from 'react'
import { getProfile, setProfile, getAllLabs, getAllMeasurements } from '../db/db'
import { calculateScore2, calculateRiskScenarios, LAB_TYPES } from '../utils/score2'
import { getDailyAverages } from '../utils/bp'

export default function ScoreView() {
  const [form, setForm] = useState({
    age: '',
    sex: 'male',
    smoking: false,
    sbp: '',
    totalCholesterol: '',
    hdl: ''
  })
  const [result, setResult] = useState(null)
  const [scenarios, setScenarios] = useState(null)
  const [autoFilled, setAutoFilled] = useState([])

  useEffect(() => {
    async function load() {
      const saved = await getProfile('score2params')
      const labs = await getAllLabs()
      const measurements = await getAllMeasurements()

      let newForm = saved ? { ...form, ...saved } : { ...form }
      const filled = []

      // Auto-fill SBP from 14-day average
      if (measurements.length > 0) {
        const sorted = [...measurements].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
        const daily = getDailyAverages(sorted)
        const recent14 = daily.slice(-14)
        if (recent14.length > 0) {
          const avgSys = Math.round(recent14.reduce((s, d) => s + d.avgSys, 0) / recent14.length)
          newForm.sbp = String(avgSys)
          filled.push(`SBP (${avgSys} mmHg – 14-dagarssnitt)`)
        }
      }

      // Auto-fill from latest labs
      const latestTotal = labs.filter(l => l.type === 'totalCholesterol').sort((a, b) => b.date.localeCompare(a.date))[0]
      const latestHdl = labs.filter(l => l.type === 'hdl').sort((a, b) => b.date.localeCompare(a.date))[0]

      if (latestTotal) {
        newForm.totalCholesterol = String(latestTotal.value)
        filled.push(`Totalkolesterol (${latestTotal.value} mmol/L från ${latestTotal.date})`)
      }
      if (latestHdl) {
        newForm.hdl = String(latestHdl.value)
        filled.push(`HDL (${latestHdl.value} mmol/L från ${latestHdl.date})`)
      }

      setForm(newForm)
      setAutoFilled(filled)
    }
    load()
  }, [])

  function handleChange(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setResult(null); setScenarios(null)
  }

  async function handleCalculate(e) {
    e.preventDefault()
    const params = {
      age: parseInt(form.age),
      sex: form.sex,
      smoking: form.smoking,
      sbp: parseInt(form.sbp),
      totalCholesterol: parseFloat(form.totalCholesterol),
      hdl: form.hdl ? parseFloat(form.hdl) : null
    }
    if (!params.age || !params.sbp || !params.totalCholesterol) return
    if (params.age < 40 || params.age > 79) {
      alert('SCORE2 är validerat för åldrarna 40–79 år.')
      return
    }

    await setProfile('score2params', {
      age: form.age, sex: form.sex, smoking: form.smoking,
      totalCholesterol: form.totalCholesterol, hdl: form.hdl
    })

    const res = calculateScore2(params)
    const scen = calculateRiskScenarios(params)
    setResult(res)
    setScenarios(scen)
  }

  const riskBarWidth = result ? Math.min(result.risk * 100 * 4, 100) : 0 // Scale for visual

  return (
    <div className="view-content">
      <div className="card">
        <h2 className="card-title">SCORE2 – Hjärt-kärlrisk</h2>
        <p className="card-desc">
          Beräknar 10-årsrisk för hjärt-kärlsjukdom enligt ESC 2021 (Norden – låg riskregion).
        </p>
        {autoFilled.length > 0 && (
          <div className="autofill-notice">
            <span>✓ Förifyllt från dina data:</span>
            <ul>{autoFilled.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </div>
        )}
      </div>

      <div className="card">
        <form onSubmit={handleCalculate} className="score-form">
          <div className="form-row">
            <div className="form-group">
              <label>Ålder (40–79) *</label>
              <input
                type="number"
                inputMode="numeric"
                value={form.age}
                onChange={e => handleChange('age', e.target.value)}
                placeholder="60"
                min="40" max="79"
                required
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Kön *</label>
              <select
                value={form.sex}
                onChange={e => handleChange('sex', e.target.value)}
                className="form-input"
              >
                <option value="male">Man</option>
                <option value="female">Kvinna</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.smoking}
                onChange={e => handleChange('smoking', e.target.checked)}
              />
              Rökare (aktuell)
            </label>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Systoliskt BT (mmHg) *</label>
              <input
                type="number"
                inputMode="numeric"
                value={form.sbp}
                onChange={e => handleChange('sbp', e.target.value)}
                placeholder="130"
                min="80" max="260"
                required
                className="form-input"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Totalkolesterol (mmol/L) *</label>
              <input
                type="number"
                step="0.1"
                value={form.totalCholesterol}
                onChange={e => handleChange('totalCholesterol', e.target.value)}
                placeholder="5.0"
                min="1" max="15"
                required
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>HDL (mmol/L, valfri)</label>
              <input
                type="number"
                step="0.1"
                value={form.hdl}
                onChange={e => handleChange('hdl', e.target.value)}
                placeholder="1.3"
                min="0.1" max="5"
                className="form-input"
              />
              <span className="form-hint">Utelämnas: medel-HDL 1.3 antas</span>
            </div>
          </div>

          <button type="submit" className="btn-primary">Beräkna risk</button>
        </form>
      </div>

      {result && (
        <>
          <div className="card score-result-card" style={{ borderColor: result.category.color }}>
            <div className="score-main">
              <div className="score-percent" style={{ color: result.category.color }}>
                {result.riskPercent}%
              </div>
              <div className="score-category" style={{ background: result.category.color }}>
                {result.category.label}
              </div>
            </div>
            <p className="score-desc">{result.category.desc}</p>

            {/* Risk bar */}
            <div className="risk-bar-track">
              <div className="risk-bar-fill" style={{ width: `${riskBarWidth}%`, background: result.category.color }} />
              <div className="risk-bar-zones">
                <span style={{ left: '0%' }}>0%</span>
                <span style={{ left: '25%' }}>Låg</span>
                <span style={{ left: '50%' }}>Måttlig</span>
                <span style={{ left: '75%' }}>Hög</span>
                <span style={{ right: '0' }}>Mycket hög</span>
              </div>
            </div>

            <div className="score-nonhdl">
              Non-HDL: {result.nonHdl} mmol/L
              {!form.hdl && <span className="form-hint"> (uppskattat)</span>}
            </div>
          </div>

          {/* BP scenarios */}
          {scenarios && (
            <div className="card">
              <h3 className="card-title">Om blodtrycket sänks</h3>
              <p className="card-desc">Uppskattad riskförändring vid lägre blodtryck:</p>
              <div className="scenarios">
                {scenarios.map((s, i) => (
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
                        −{(parseFloat(scenarios[0].riskPercent) - parseFloat(s.riskPercent)).toFixed(1)}%
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
