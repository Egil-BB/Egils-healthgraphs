import { useState, useEffect, useCallback } from 'react'
import { addLifestyle, getAllLifestyle } from '../db/db'
import {
  LIFESTYLE_CATEGORIES, calculateLifestyleScore,
  getRequiredQids, getScoreLabel, getScoreFeedback
} from '../utils/lifestyle'
import { formatDateSv } from '../utils/bp'

export default function LifestyleView({ onDataChange }) {
  const [history, setHistory] = useState([])
  const [thisMonthEntry, setThisMonthEntry] = useState(null)
  const [step, setStep] = useState(0)         // 0 = intro, 1..6 = categories, 7 = done
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)

  const currentMonth = new Date().toISOString().slice(0, 7)
  const TOTAL_STEPS = LIFESTYLE_CATEGORIES.length

  const load = useCallback(async () => {
    const all = await getAllLifestyle()
    const sorted = all.sort((a, b) => b.date.localeCompare(a.date))
    setHistory(sorted)
    const thisMonth = sorted.find(e => e.date?.startsWith(currentMonth))
    setThisMonthEntry(thisMonth || null)
  }, [currentMonth])

  useEffect(() => { load() }, [load])

  function handleAnswer(qid, value) {
    setAnswers(a => ({ ...a, [qid]: value }))
  }

  // Current category (step 1..6 = category 0..5)
  const catIndex = step - 1
  const currentCat = catIndex >= 0 && catIndex < LIFESTYLE_CATEGORIES.length
    ? LIFESTYLE_CATEGORIES[catIndex] : null

  // Visible questions for current category (respects conditional)
  const visibleQs = currentCat
    ? currentCat.questions.filter(q => !q.showIf || q.showIf(answers))
    : []

  const allVisibleQsAnswered = visibleQs
    .filter(q => !q.scoreless)
    .every(q => answers[q.id] !== undefined)

  // Also include scoreless conditionals (optional but should be answered if shown)
  const allCurrentAnswered = visibleQs.every(q => answers[q.id] !== undefined)

  const isLastStep = step === TOTAL_STEPS

  async function handleSubmit() {
    const score = calculateLifestyleScore(answers)
    await addLifestyle({ answers, score })
    setSubmitted(true)
    await load()
    onDataChange?.()
  }

  function resetQuestionnaire() {
    setAnswers({})
    setStep(0)
    setSubmitted(false)
  }

  // ── Show result if this month is already filled ───────────────────────────

  if (thisMonthEntry && !submitted) {
    return <ResultView entry={thisMonthEntry} history={history} onNewEntry={null} />
  }

  if (submitted) {
    // Find the newly submitted entry
    const latest = history[0]
    return latest
      ? <ResultView entry={latest} history={history} onNewEntry={resetQuestionnaire} justSubmitted />
      : null
  }

  // ── Intro ─────────────────────────────────────────────────────────────────

  if (step === 0) {
    return (
      <div className="view-content">
        <div className="card">
          <h2 className="card-title">🌿 Levnadsvanor</h2>
          <p className="card-desc">
            Månadsenkät baserad på Socialstyrelsens riktlinjer, NNR2023 och WHO 2020.
            16 frågor i 6 kategorier. Tar ca 2 minuter.
          </p>
          <div className="lifestyle-category-preview">
            {LIFESTYLE_CATEGORIES.map((cat, i) => (
              <span key={cat.id} className="lifestyle-cat-chip">
                {cat.icon} {cat.title} <span className="cat-chip-max">{cat.maxScore}p</span>
              </span>
            ))}
          </div>
          <button className="btn-primary" style={{ marginTop: 16, width: '100%' }}
            onClick={() => setStep(1)}>
            Starta enkäten →
          </button>
        </div>

        {/* History */}
        {history.length > 0 && <HistoryList history={history} />}
      </div>
    )
  }

  // ── Category wizard step ──────────────────────────────────────────────────

  if (step > 0 && step <= TOTAL_STEPS && currentCat) {
    return (
      <div className="view-content">
        {/* Progress */}
        <div className="wizard-progress-card">
          <div className="wizard-progress-text">
            {currentCat.icon} {currentCat.title}
            <span className="wizard-step-num">steg {step} av {TOTAL_STEPS}</span>
          </div>
          <div className="wizard-progress-bar">
            <div className="wizard-progress-fill" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
          </div>
        </div>

        {/* Questions */}
        <div className="card">
          {visibleQs.map((q, qi) => (
            <div key={q.id} className={`wizard-question ${qi > 0 ? 'wizard-question-sep' : ''}`}>
              <p className="lifestyle-q-text">{q.text}</p>
              {q.hint && <p className="wizard-q-hint">{q.hint}</p>}
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
                      onChange={() => handleAnswer(q.id, opt.value)}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Nav buttons */}
        <div className="wizard-nav">
          <button className="btn-secondary" onClick={() => setStep(s => s - 1)}>
            ← Tillbaka
          </button>
          {isLastStep ? (
            <button
              className="btn-primary"
              disabled={!allVisibleQsAnswered}
              onClick={handleSubmit}
            >
              Skicka in ✓
            </button>
          ) : (
            <button
              className="btn-primary"
              disabled={!allVisibleQsAnswered}
              onClick={() => setStep(s => s + 1)}
            >
              Nästa →
            </button>
          )}
        </div>
      </div>
    )
  }

  return null
}

// ── Result view ───────────────────────────────────────────────────────────────

function ResultView({ entry, history, onNewEntry, justSubmitted }) {
  const { score, date, answers } = entry
  const label = getScoreLabel(score)
  const feedback = getScoreFeedback(score)
  const isSmoker = answers?.tobacco_status === 'yes' || answers?.tobacco === 'yes'

  const nextDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
  const nextStr = nextDate.toLocaleDateString('sv-SE', { month: 'long', day: 'numeric' })

  return (
    <div className="view-content">
      <div className="card">
        <h2 className="card-title">🌿 Levnadsvanor</h2>

        <div className="lifestyle-result-card">
          <div className="lifestyle-score-big" style={{ color: label.color }}>{score}</div>
          <div className="lifestyle-score-max">/100</div>
          <div className="lifestyle-score-label" style={{ color: label.color }}>{label.label}</div>
          <p className="lifestyle-feedback">{feedback}</p>
          <p className="lifestyle-filled-date">Ifyllt {formatDateSv(date)}</p>
          {!justSubmitted && <p className="lifestyle-next-date">Nästa enkät öppnas {nextStr}</p>}
        </div>

        {justSubmitted && (
          <div className="lifestyle-cat-scores">
            <h3 className="card-title" style={{ marginBottom: 8 }}>Poäng per kategori</h3>
            {LIFESTYLE_CATEGORIES.map(cat => {
              let catScore = 0
              for (const q of cat.questions) {
                if (q.scoreless) continue
                const visible = !q.showIf || q.showIf(answers)
                if (!visible) { catScore += q.autoScoreWhenHidden ?? 0; continue }
                const opt = q.options.find(o => o.value === answers[q.id])
                if (opt) catScore += opt.score
              }
              const pct = Math.round((catScore / cat.maxScore) * 100)
              const catLabel = getScoreLabel(pct)
              return (
                <div key={cat.id} className="cat-score-row">
                  <span className="cat-score-name">{cat.icon} {cat.title}</span>
                  <div className="cat-score-bar-wrap">
                    <div className="cat-score-bar" style={{ width: `${pct}%`, background: catLabel.color }} />
                  </div>
                  <span className="cat-score-pts" style={{ color: catLabel.color }}>
                    {catScore}/{cat.maxScore}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Smoking warning */}
      {isSmoker && (
        <div className="smoking-warning-card">
          <p className="smoking-warning-title">⚠️ Vi ser att du röker</p>
          <p className="smoking-warning-text">
            Rökning är den överlägset farligaste levnadsvanan för din hälsa.
            Det är aldrig för sent att sluta — kroppen börjar återhämta sig inom timmar efter den sista cigaretten.
          </p>
          <p className="smoking-warning-text">
            <strong>Tips:</strong> Nikotinläkemedel (plåster, tuggummi, spray), snus eller e-cigaretter kan hjälpa dig trappa ner.
            Det finns också receptbelagda läkemedel som är mycket effektiva. Prata med din vårdgivare.
          </p>
          <div className="smoking-links">
            <a href="tel:020840000" className="smoking-link">📞 020-84 00 00</a>
            <a href="https://www.slutarokalinjen.se" target="_blank" rel="noopener noreferrer" className="smoking-link">
              🌐 slutarokalinjen.se ↗
            </a>
          </div>
        </div>
      )}

      <HistoryList history={history} />
    </div>
  )
}

// ── History list ──────────────────────────────────────────────────────────────

function HistoryList({ history }) {
  if (history.length === 0) return null
  return (
    <div className="card">
      <h3 className="card-title">Historik</h3>
      {history.slice(0, 18).map((e, i) => {
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
  )
}
