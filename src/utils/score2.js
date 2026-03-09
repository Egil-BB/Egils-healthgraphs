/**
 * SCORE2 – 10-årig kardiovaskulär risk
 * Baserat på: SCORE2 working group & ESC Cardiovascular Risk Collaboration, 2021
 * Region: Låg-till-måttlig risk (Sverige)
 *
 * Indata: ålder 40–69, kön, rökstatus, SBP, totalkolesterol (mmol/L)
 * Non-HDL approximeras som: totalkolesterol − 1.3 mmol/L (antaget medel-HDL)
 */

const COEFFICIENTS = {
  male: {
    age: 0.3742,
    smoking: 0.6012,
    sbp: 0.2777,
    nonHdl: 0.1458,
    ageSmoke: 0.0755,
    meanLp: -0.5699,
    baselineS10: 0.9605
  },
  female: {
    age: 0.4648,
    smoking: 0.7744,
    sbp: 0.3131,
    nonHdl: 0.1625,
    ageSmoke: 0.0858,
    meanLp: -0.7187,
    baselineS10: 0.9776
  }
}

/**
 * Beräknar 10-årsrisk enligt SCORE2
 * @param {object} params
 * @param {number} params.age – ålder (40–69)
 * @param {'male'|'female'} params.sex – kön
 * @param {boolean} params.smoking – rökare
 * @param {number} params.sbp – systoliskt blodtryck (mmHg)
 * @param {number} params.totalCholesterol – totalkolesterol (mmol/L)
 * @param {number|null} params.hdl – HDL-kolesterol (mmol/L), valfritt
 * @returns {{ risk: number, riskPercent: string, category: object, nonHdl: number }}
 */
export function calculateScore2({ age, sex, smoking, sbp, totalCholesterol, hdl = null, nonHdlDirect = null }) {
  const c = COEFFICIENTS[sex] || COEFFICIENTS.male

  // Non-HDL kolesterol – prioritet: direkt mätt > total-HDL > total-1.3
  const nonHdl = nonHdlDirect != null
    ? nonHdlDirect
    : (hdl != null ? totalCholesterol - hdl : totalCholesterol - 1.3)
  const nonHdlClamped = Math.max(0.5, Math.min(nonHdl, 10))

  // Centrerade variabler
  const cAge = (age - 60) / 5
  const cSbp = (sbp - 120) / 20
  const cNonHdl = (nonHdlClamped - 3.31) / 1
  const smoke = smoking ? 1 : 0

  // Linjär prediktor
  const lp =
    c.age * cAge +
    c.smoking * smoke +
    c.sbp * cSbp +
    c.nonHdl * cNonHdl +
    c.ageSmoke * cAge * smoke

  // 10-årsrisk
  const risk = 1 - Math.pow(c.baselineS10, Math.exp(lp - c.meanLp))
  const riskClamped = Math.max(0, Math.min(risk, 0.999))

  return {
    risk: riskClamped,
    riskPercent: (riskClamped * 100).toFixed(1),
    category: getRiskCategory(riskClamped * 100, age),
    nonHdl: Math.round(nonHdlClamped * 10) / 10
  }
}

/**
 * Riskkategori per åldersgrupp (ESC 2021, låg-till-måttlig riskregion)
 */
function getRiskCategory(riskPct, age) {
  let thresholds
  if (age < 50) {
    thresholds = [
      { max: 2.5, label: 'Låg risk', color: '#16a34a', desc: 'Inga omedelbara åtgärder rekommenderas.' },
      { max: 5.0, label: 'Måttlig risk', color: '#65a30d', desc: 'Livsstilsåtgärder rekommenderas.' },
      { max: 7.5, label: 'Hög risk', color: '#ca8a04', desc: 'Intensiva livsstilsåtgärder, diskutera läkemedel.' },
      { max: Infinity, label: 'Mycket hög risk', color: '#dc2626', desc: 'Omedelbar behandling rekommenderas.' }
    ]
  } else if (age < 60) {
    thresholds = [
      { max: 5, label: 'Låg risk', color: '#16a34a', desc: 'Inga omedelbara åtgärder rekommenderas.' },
      { max: 10, label: 'Måttlig risk', color: '#65a30d', desc: 'Livsstilsåtgärder rekommenderas.' },
      { max: 15, label: 'Hög risk', color: '#ca8a04', desc: 'Intensiva livsstilsåtgärder, diskutera läkemedel.' },
      { max: Infinity, label: 'Mycket hög risk', color: '#dc2626', desc: 'Omedelbar behandling rekommenderas.' }
    ]
  } else {
    thresholds = [
      { max: 7.5, label: 'Låg risk', color: '#16a34a', desc: 'Inga omedelbara åtgärder rekommenderas.' },
      { max: 10, label: 'Måttlig risk', color: '#65a30d', desc: 'Livsstilsåtgärder rekommenderas.' },
      { max: 15, label: 'Hög risk', color: '#ca8a04', desc: 'Intensiva livsstilsåtgärder, diskutera läkemedel.' },
      { max: Infinity, label: 'Mycket hög risk', color: '#dc2626', desc: 'Omedelbar behandling rekommenderas.' }
    ]
  }
  for (const t of thresholds) {
    if (riskPct < t.max) return t
  }
  return thresholds[thresholds.length - 1]
}

/**
 * Visa hur risken förändras vid lägre blodtryck och/eller kolesterol
 */
export function calculateRiskScenarios(params) {
  const nonHdlNow = params.nonHdlDirect ?? (params.hdl != null ? params.totalCholesterol - params.hdl : (params.totalCholesterol ?? 5) - 1.3)
  const scenarios = [
    { label: 'Nuvarande', sbpOffset: 0, nonHdlOffset: 0 },
    { label: '−10 mmHg BT', sbpOffset: -10, nonHdlOffset: 0 },
    { label: '−20 mmHg BT', sbpOffset: -20, nonHdlOffset: 0 },
    { label: '−1,0 non-HDL', sbpOffset: 0, nonHdlOffset: -1.0 },
    { label: '−10 mmHg + −1,0', sbpOffset: -10, nonHdlOffset: -1.0, combined: true }
  ]
  return scenarios.map(s => {
    const newNonHdl = Math.max(0.5, nonHdlNow + s.nonHdlOffset)
    const adjusted = { ...params, sbp: params.sbp + s.sbpOffset, nonHdlDirect: newNonHdl }
    return { ...s, sbp: adjusted.sbp, nonHdl: newNonHdl, ...calculateScore2(adjusted) }
  })
}

export const LAB_TYPES = [
  { value: 'totalCholesterol', label: 'Totalkolesterol', unit: 'mmol/L', scoreRelevant: true, refMax: 5.0 },
  { value: 'ldl', label: 'LDL-kolesterol', unit: 'mmol/L', scoreRelevant: false, refMax: 2.5 },
  { value: 'hdl', label: 'HDL-kolesterol', unit: 'mmol/L', scoreRelevant: true, refMin: 1.0 },
  { value: 'nonHdl', label: 'Non-HDL-kolesterol', unit: 'mmol/L', scoreRelevant: true, refMax: 3.4 },
  { value: 'triglycerides', label: 'Triglycerider', unit: 'mmol/L', scoreRelevant: false, refMax: 1.7 },
  { value: 'glucose', label: 'P-Glukos (faste)', unit: 'mmol/L', scoreRelevant: false, refMax: 6.1 },
  { value: 'hba1c', label: 'HbA1c', unit: 'mmol/mol', scoreRelevant: false, refMax: 48 },
  { value: 'hb', label: 'Hemoglobin (Hb)', unit: 'g/L', scoreRelevant: false },
  { value: 'methb', label: 'Methemoglobin (MetHb)', unit: '%', scoreRelevant: false, refMax: 1.5 },
  { value: 'ferritin', label: 'Ferritin', unit: 'µg/L', scoreRelevant: false },
  { value: 'potassium', label: 'Kalium', unit: 'mmol/L', scoreRelevant: false, refMin: 3.5, refMax: 5.0 },
  { value: 'creatinine', label: 'Kreatinin', unit: 'µmol/L', scoreRelevant: false },
  { value: 'egfr', label: 'eGFR', unit: 'mL/min', scoreRelevant: false, refMin: 60 },
  { value: 'albKrea', label: 'Alb-krea kvot', unit: 'mg/mmol', scoreRelevant: false, refMax: 3.0 },
  { value: 'wbc', label: 'Leukocyter (LPK)', unit: '10⁹/L', scoreRelevant: false, refMin: 3.5, refMax: 11.0 },
  { value: 'alat', label: 'ALAT', unit: 'µkat/L', scoreRelevant: false },
  { value: 'tsh', label: 'TSH', unit: 'mIE/L', scoreRelevant: false, refMin: 0.4, refMax: 4.0 },
  { value: 'crp', label: 'CRP', unit: 'mg/L', scoreRelevant: false, refMax: 5.0 },
  { value: 'uricAcid', label: 'Urat (urinsyra)', unit: 'µmol/L', scoreRelevant: false, refMax: 420 },
  { value: 'psa', label: 'PSA', unit: 'µg/L', scoreRelevant: false, refMax: 4.0 },
]
