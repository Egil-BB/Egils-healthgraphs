import { useState, useEffect, useCallback } from 'react'
import { addLifestyle, getAllLifestyle } from '../db/db'
import { LIFESTYLE_SECTIONS, calculateLifestyleScore, getScoreLabel } from '../utils/lifestyle'
import { formatDateSv } from '../utils/bp'

export default function LifestyleView({ onDataChange }) {
  const [history, setHistory] = useState([])
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [thisMonthEntry, setThisMonthEntry] = useState(null)

  const currentMonth = new Date().toISOString().slice(0, 7)

  const load = useCallback(async () => {
    const all = await getAllLifestyle()
    const sorted = all.sort((a, b) => b.date.localeCompare(a.date))
    setHistory(sorted)
    const thisMonth = sorted.find(e => e.date?.startsWith(currentMonth))
    setThisMonthEntry(thisMonth || null)
  }, [currentMonth])

  useEffect(() => { load() }, [load])

  const allQids = LIFESTYLE_SECTIONS.flatMap(s => s.questions.map(q => q.id))
  const allAnswered = allQids.every(id => answers[id] !== undefined)
  const previewScore = allAnswered ? calculateLifestyleScore(answers) : null

  async function handleSubmit() {
    if (!allAnswered) return
    const score = calculateLifestyleScore(answers)
    await addLifestyle({ answers, score })
    setSubmitted(true)
    setAnswers({})
    await load()
    onDataChange?.()
  }

  // Show result if already filled this month
  if (thisMonthEntry && !submitted) {
    const { score, date, answers: prevAnswers } = thisMonthEntry
    const label = getScoreLabel(score)
    const nextDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
    const nextStr = nextDate.toLocaleDateString('sv-SE', { month: 'long', day: 'numeric' })

    return (
      <div className="view-content">
        <div className="card">
          <h2 className="card-title">Levnadsvanor</h2>
          <div className="lifestyle-done-card">
            <div className="lifestyle-score-big" style={{ color: label.color }}>{score}</div>
            <div className="lifestyle-score-max">/100</div>
            <div className="lifestyle-score-label" style={{ color: label.color }}>{label.label}</div>
            <p className="lifestyle-filled-date">Ifyllt {formatDateSv(date)}</p>
            <p className="lifestyle-next-date">Nästa ifyllning öppnas {nextStr}</p>
          </div>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="card">
            <h3 className="card-title">Historik</h3>
            {history.slice(0, 12).map((e, i) => {
              const l = getScoreLabel(e.score)
              return (
                <div key={e.id || i} className="lifestyle-history-row">
                  <span className="lifestyle-history-date">{formatDateSv(e.date)}</span>
                  <div className="lifestyle-history-bar-wrap">
                    <div
                      className="lifestyle-history-bar"
                      style={{ width: `${e.score}%`, background: l.color }}
                    />
                  </div>
                  <span className="lifestyle-history-score" style={{ color: l.color }}>
                    {e.score}p
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Show questionnaire form
  return (
    <div className="view-content">
      <div className="card">
        <h2 className="card-title">Levnadsvanor</h2>
        <p className="card-desc">
          Månadsenkät baserad på Socialstyrelsens nationella riktlinjer.
          Kan fyllas i en gång per månad. Maxpoäng: <strong>100p</strong>
        </p>
        <p className="card-hint" style={{ marginTop: 6 }}>
          Tobak väger tyngst (40p). Rökning påverkar även din SCORE2-riskberäkning.
        </p>
        {submitted && <div className="lifestyle-saved-msg">✓ Levnadsvanor sparade!</div>}
      </div>

      {LIFESTYLE_SECTIONS.map(section => (
        <div key={section.id} className="card">
          <h3 className="card-title">{section.icon} {section.title}</h3>
          {section.questions.map(q => (
            <div key={q.id} className="lifestyle-question">
              <p className="lifestyle-q-text">{q.text}</p>
              <div className="lifestyle-options">
                {q.options.map(opt => (
                  <label
                    key={String(opt.value)}
                    className={`lifestyle-option ${answers[q.id] === opt.value ? 'lifestyle-option-selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      checked={answers[q.id] === opt.value}
                      onChange={() => setAnswers(a => ({ ...a, [q.id]: opt.value }))}
                    />
                    <span>{opt.label}</span>
                    <span className="lifestyle-opt-score">+{opt.score}p</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Live score preview */}
      {previewScore !== null && (
        <div className="card lifestyle-preview-card" style={{ borderColor: getScoreLabel(previewScore).color }}>
          <div className="lifestyle-preview-row">
            <span>Poäng hittills:</span>
            <span style={{ color: getScoreLabel(previewScore).color, fontWeight: 700, fontSize: 20 }}>
              {previewScore}/100
            </span>
            <span style={{ color: getScoreLabel(previewScore).color }}>
              {getScoreLabel(previewScore).label}
            </span>
          </div>
        </div>
      )}

      <div style={{ padding: '0 12px 12px' }}>
        <button
          className="btn-primary"
          style={{ width: '100%' }}
          disabled={!allAnswered}
          onClick={handleSubmit}
        >
          {allAnswered
            ? 'Spara levnadsvanor'
            : `Svara på alla frågor (${Object.keys(answers).length}/${allQids.length} klara)`}
        </button>
      </div>
    </div>
  )
}
