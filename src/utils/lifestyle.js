/**
 * Levnadsvanor – uppdaterad modell (NNR2023, WHO 2020, AHA Life's Essential 8)
 * 16 frågor, 6 kategorier, 100 poäng totalt
 *   🚭 Tobak:          35p
 *   🍷 Alkohol:        20p
 *   🚶 Fysisk aktivitet: 20p
 *   😴 Sömn:           10p
 *   🥗 Matvanor:       10p
 *   🧠 Stress:          5p
 *
 * Villkorliga frågor:
 *   - tobacco_amount: visas endast om tobacco_status === 'yes' (lagras, ger inga poäng)
 *   - alcohol_amount, alcohol_binge: hoppas över om alcohol_freq === 'never' → automax 7+5p
 */

export const LIFESTYLE_CATEGORIES = [
  {
    id: 'tobacco',
    title: 'Tobak',
    icon: '🚭',
    maxScore: 35,
    questions: [
      {
        id: 'tobacco_status',
        text: 'Röker du för närvarande?',
        options: [
          { label: 'Nej, har aldrig rökt', value: 'never', score: 35 },
          { label: 'Nej, slutade för mer än 6 månader sedan', value: 'quit_long', score: 35 },
          { label: 'Nej, slutade för 1–6 månader sedan', value: 'quit_recent', score: 15 },
          { label: 'Ja, jag röker', value: 'yes', score: 0 },
        ]
      },
      {
        id: 'tobacco_amount',
        text: 'Hur många cigaretter röker du per dag?',
        hint: 'Registreras för att följa nedtrappning. Påverkar inte poängen.',
        showIf: answers => answers.tobacco_status === 'yes',
        scoreless: true,
        options: [
          { label: '1–5 cigaretter/dag', value: '1_5', score: 0 },
          { label: '6–10 cigaretter/dag', value: '6_10', score: 0 },
          { label: '11–20 cigaretter/dag', value: '11_20', score: 0 },
          { label: 'Mer än 20 cigaretter/dag', value: '20plus', score: 0 },
        ]
      }
    ]
  },
  {
    id: 'alcohol',
    title: 'Alkohol',
    icon: '🍷',
    maxScore: 20,
    questions: [
      {
        id: 'alcohol_freq',
        text: 'Hur ofta dricker du alkohol?',
        options: [
          { label: 'Aldrig', value: 'never', score: 8 },
          { label: 'Månadsvis eller mer sällan', value: 'monthly', score: 6 },
          { label: '2–4 gånger per månad', value: '2_4_month', score: 4 },
          { label: '2–3 gånger per vecka', value: '2_3_week', score: 2 },
          { label: '4 gånger per vecka eller mer', value: '4plus_week', score: 0 },
        ]
      },
      {
        id: 'alcohol_amount',
        text: 'Hur många standardglas dricker du en typisk dag när du dricker?',
        showIf: answers => answers.alcohol_freq !== 'never',
        autoScoreWhenHidden: 7,
        options: [
          { label: '1–2 glas', value: '1_2', score: 7 },
          { label: '3–4 glas', value: '3_4', score: 4 },
          { label: '5–6 glas', value: '5_6', score: 1 },
          { label: '7 eller fler glas', value: '7plus', score: 0 },
        ]
      },
      {
        id: 'alcohol_binge',
        text: 'Hur ofta dricker du 4 standardglas eller mer vid ett och samma tillfälle?',
        showIf: answers => answers.alcohol_freq !== 'never',
        autoScoreWhenHidden: 5,
        options: [
          { label: 'Aldrig', value: 'never', score: 5 },
          { label: 'Mer sällan än 1 gång per månad', value: 'rare', score: 3 },
          { label: 'Varje månad', value: 'monthly', score: 2 },
          { label: 'Varje vecka', value: 'weekly', score: 1 },
          { label: 'Dagligen eller nästan dagligen', value: 'daily', score: 0 },
        ]
      }
    ]
  },
  {
    id: 'activity',
    title: 'Fysisk aktivitet',
    icon: '🚶',
    maxScore: 20,
    questions: [
      {
        id: 'activity_moderate',
        text: 'Hur många minuter i veckan ägnar du åt måttlig fysisk aktivitet?\n(rask promenad, cykling, vardagsmotion – du blir lite varm men kan prata)',
        options: [
          { label: '0 minuter', value: '0', score: 0 },
          { label: 'Mindre än 75 minuter', value: 'lt75', score: 2 },
          { label: '75–150 minuter', value: '75_150', score: 4 },
          { label: '150–300 minuter', value: '150_300', score: 7 },
          { label: 'Mer än 300 minuter', value: 'gt300', score: 8 },
        ]
      },
      {
        id: 'activity_vigorous',
        text: 'Hur många minuter i veckan ägnar du åt ansträngande aktivitet?\n(löpning, gym, bollsport – du blir andfådd och kan knappt prata)',
        options: [
          { label: '0 minuter', value: '0', score: 0 },
          { label: 'Mindre än 75 minuter', value: 'lt75', score: 3 },
          { label: '75 minuter eller mer', value: 'ge75', score: 6 },
        ]
      },
      {
        id: 'activity_strength',
        text: 'Hur ofta tränar du styrka eller muskelstärkande övningar?\n(gym, yoga, trädgårdsarbete med belastning, armhävningar)',
        options: [
          { label: '2 gånger per vecka eller mer', value: '2plus', score: 6 },
          { label: '1 gång per vecka', value: '1_week', score: 4 },
          { label: 'Mer sällan än 1 gång per vecka', value: 'rare', score: 1 },
          { label: 'Aldrig', value: 'never', score: 0 },
        ]
      }
    ]
  },
  {
    id: 'sleep',
    title: 'Sömn',
    icon: '😴',
    maxScore: 10,
    questions: [
      {
        id: 'sleep_hours',
        text: 'Hur många timmar sover du i genomsnitt per natt?',
        options: [
          { label: '7–9 timmar', value: '7_9', score: 6 },
          { label: '6–7 timmar', value: '6_7', score: 4 },
          { label: '9–10 timmar', value: '9_10', score: 4 },
          { label: 'Mindre än 6 timmar', value: 'lt6', score: 1 },
          { label: 'Mer än 10 timmar', value: 'gt10', score: 1 },
        ]
      },
      {
        id: 'sleep_quality',
        text: 'Hur ofta känner du dig utvilad när du vaknar?',
        options: [
          { label: 'Nästan alltid', value: 'always', score: 4 },
          { label: 'Ofta', value: 'often', score: 3 },
          { label: 'Ibland', value: 'sometimes', score: 2 },
          { label: 'Sällan eller aldrig', value: 'never', score: 0 },
        ]
      }
    ]
  },
  {
    id: 'food',
    title: 'Matvanor',
    icon: '🥗',
    maxScore: 10,
    questions: [
      {
        id: 'food_vegetables',
        text: 'Hur ofta äter du grönsaker, rotfrukter eller baljväxter?\n(bönor, linser, kikärtor räknas)',
        options: [
          { label: 'Två eller fler portioner dagligen', value: '2plus', score: 3 },
          { label: 'En portion dagligen', value: '1_daily', score: 2 },
          { label: 'Några gånger i veckan', value: 'few_week', score: 1 },
          { label: 'En gång i veckan eller mer sällan', value: 'rare', score: 0 },
        ]
      },
      {
        id: 'food_wholegrains',
        text: 'Hur ofta äter du fullkornsprodukter?\n(fullkornsbröd, havregryn, råg, fullkornsris, fullkornspasta)',
        options: [
          { label: 'Dagligen', value: 'daily', score: 2 },
          { label: 'Några gånger i veckan', value: 'few_week', score: 1 },
          { label: 'Sällan eller aldrig', value: 'never', score: 0 },
        ]
      },
      {
        id: 'food_fish',
        text: 'Hur ofta äter du fisk eller skaldjur som huvudrätt?',
        options: [
          { label: 'Tre gånger i veckan eller oftare', value: '3plus', score: 3 },
          { label: 'Två gånger i veckan', value: '2_week', score: 2 },
          { label: 'En gång i veckan', value: '1_week', score: 1 },
          { label: 'Mer sällan', value: 'rare', score: 0 },
        ]
      },
      {
        id: 'food_junk',
        text: 'Hur ofta äter du sötsaker, chips, snacks eller dricker söta drycker?\n(inkl. juice, energidryck, läsk)',
        options: [
          { label: 'Mer sällan än en gång i veckan', value: 'rare', score: 2 },
          { label: 'En gång i veckan', value: '1_week', score: 1 },
          { label: 'Flera gånger i veckan eller dagligen', value: 'daily', score: 0 },
        ]
      }
    ]
  },
  {
    id: 'stress',
    title: 'Stress',
    icon: '🧠',
    maxScore: 5,
    questions: [
      {
        id: 'stress_control',
        text: 'Hur ofta har du under den senaste månaden känt att du inte kunnat hantera allt du behöver göra?',
        options: [
          { label: 'Aldrig', value: 'never', score: 3 },
          { label: 'Sällan', value: 'rare', score: 2 },
          { label: 'Ibland', value: 'sometimes', score: 1 },
          { label: 'Ofta eller väldigt ofta', value: 'often', score: 0 },
        ]
      },
      {
        id: 'stress_overwhelmed',
        text: 'Hur ofta har du under den senaste månaden känt dig överväldigad av svårigheter?',
        options: [
          { label: 'Aldrig', value: 'never', score: 2 },
          { label: 'Sällan', value: 'rare', score: 1 },
          { label: 'Ibland eller ofta', value: 'often', score: 0 },
        ]
      }
    ]
  }
]

export function calculateLifestyleScore(answers) {
  let total = 0
  for (const cat of LIFESTYLE_CATEGORIES) {
    for (const q of cat.questions) {
      if (q.scoreless) continue
      const isVisible = !q.showIf || q.showIf(answers)
      if (!isVisible) {
        total += q.autoScoreWhenHidden ?? 0
        continue
      }
      const answer = answers[q.id]
      if (answer !== undefined && answer !== null) {
        const option = q.options.find(o => o.value === answer)
        if (option) total += option.score
      }
    }
  }
  return Math.round(total)
}

/** Get all required question IDs given current answers (respects conditional visibility) */
export function getRequiredQids(answers) {
  const ids = []
  for (const cat of LIFESTYLE_CATEGORIES) {
    for (const q of cat.questions) {
      if (q.scoreless) continue
      const visible = !q.showIf || q.showIf(answers)
      if (visible) ids.push(q.id)
    }
  }
  return ids
}

/** Returns true = smoker, false = non-smoker, null = unknown */
export function getSmokingFromLifestyle(answers) {
  const t = answers?.tobacco_status ?? answers?.tobacco // backward compat
  if (!t) return null
  return t === 'yes' || t === 'quit_recent'
}

export function getScoreLabel(score) {
  if (score >= 80) return { label: 'Högt resultat', color: '#16a34a' }
  if (score >= 60) return { label: 'Mellanhögt resultat', color: '#65a30d' }
  if (score >= 40) return { label: 'Lägre resultat', color: '#ca8a04' }
  return { label: 'Lågt resultat', color: '#64748b' }
}

export function getScoreFeedback(score) {
  if (score >= 80) return 'Högt resultat den här månaden.'
  if (score >= 60) return 'Mellanhögt resultat.'
  if (score >= 40) return 'Lägre resultat.'
  return 'Lågt resultat.'
}
