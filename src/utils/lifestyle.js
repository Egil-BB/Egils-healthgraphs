/**
 * Levnadsvanor – baserat på Socialstyrelsens nationella riktlinjer 2011
 * Poängmodell: 0–100 totalt
 *   Tobak:          40p (väger tyngst)
 *   Alkohol:        20p (Q1: 10p, Q2: 10p)
 *   Fysisk aktivitet: 25p (Q1: 12p, Q2: 13p)
 *   Matvanor:       15p (Q1: 4p, Q2: 3p, Q3: 4p, Q4: 4p)
 */

export const LIFESTYLE_SECTIONS = [
  {
    id: 'tobacco',
    title: 'Tobak',
    icon: '🚭',
    questions: [
      {
        id: 'tobacco',
        text: 'Röker du för närvarande?',
        options: [
          { label: 'Nej, har aldrig rökt', value: 'never', score: 40 },
          { label: 'Nej, slutade för mer än 6 månader sedan', value: 'quit_long', score: 40 },
          { label: 'Nej, slutade för 1–6 månader sedan', value: 'quit_recent', score: 15 },
          { label: 'Ja, jag röker', value: 'yes', score: 0 },
        ]
      }
    ]
  },
  {
    id: 'alcohol',
    title: 'Alkohol',
    icon: '🍷',
    questions: [
      {
        id: 'alcohol_weekly',
        text: 'Hur många standardglas dricker du en vanlig vecka?',
        options: [
          { label: 'Dricker <1 standardglas/vecka eller inte alls', value: 0, score: 10 },
          { label: '1–4 standardglas/vecka', value: 1, score: 8 },
          { label: '5–9 standardglas/vecka', value: 2, score: 4 },
          { label: '10–14 standardglas/vecka', value: 3, score: 1 },
          { label: '15 eller fler standardglas/vecka', value: 4, score: 0 },
        ]
      },
      {
        id: 'alcohol_binge',
        text: 'Hur ofta dricker du (som kvinna) 4, eller (som man) 5 standardglas eller mer vid samma tillfälle?',
        options: [
          { label: 'Aldrig', value: 0, score: 10 },
          { label: 'Mer sällan än 1 gång/månad', value: 1, score: 8 },
          { label: 'Varje månad', value: 2, score: 5 },
          { label: 'Varje vecka', value: 3, score: 2 },
          { label: 'Dagligen eller nästan dagligen', value: 4, score: 0 },
        ]
      }
    ]
  },
  {
    id: 'activity',
    title: 'Fysisk aktivitet',
    icon: '🚶',
    questions: [
      {
        id: 'exercise_vigorous',
        text: 'Hur mycket tid ägnar du en vanlig vecka åt fysisk träning som får dig att bli andfådd (löpning, gym, bollsport)?',
        options: [
          { label: '0 minuter', value: 0, score: 0 },
          { label: 'Mindre än 30 minuter', value: 1, score: 3 },
          { label: '30–60 minuter', value: 2, score: 7 },
          { label: '60–120 minuter', value: 3, score: 10 },
          { label: 'Mer än 120 minuter', value: 4, score: 12 },
        ]
      },
      {
        id: 'exercise_everyday',
        text: 'Hur mycket tid ägnar du en vanlig vecka åt vardagsmotion (promenader, cykling, trädgårdsarbete)? Räkna samman all tid.',
        options: [
          { label: '0 minuter', value: 0, score: 0 },
          { label: 'Mindre än 30 minuter', value: 1, score: 3 },
          { label: '30–60 minuter', value: 2, score: 6 },
          { label: '60–90 minuter', value: 3, score: 9 },
          { label: '90–150 minuter', value: 4, score: 11 },
          { label: '150–300 minuter', value: 5, score: 12 },
          { label: 'Mer än 300 minuter', value: 6, score: 13 },
        ]
      }
    ]
  },
  {
    id: 'diet',
    title: 'Matvanor',
    icon: '🥗',
    questions: [
      {
        id: 'diet_vegetables',
        text: 'Hur ofta äter du grönsaker och/eller rotfrukter (färska, frysta eller tillagade)?',
        options: [
          { label: 'Två gånger per dag eller oftare', value: 0, score: 4 },
          { label: 'En gång per dag', value: 1, score: 3 },
          { label: 'Några gånger i veckan', value: 2, score: 2 },
          { label: 'En gång i veckan eller mer sällan', value: 3, score: 0 },
        ]
      },
      {
        id: 'diet_fruit',
        text: 'Hur ofta äter du frukt och/eller bär (färska, frysta, konserverade, juice)?',
        options: [
          { label: 'Två gånger per dag eller oftare', value: 0, score: 3 },
          { label: 'En gång per dag', value: 1, score: 2 },
          { label: 'Några gånger i veckan', value: 2, score: 1 },
          { label: 'En gång i veckan eller mer sällan', value: 3, score: 0 },
        ]
      },
      {
        id: 'diet_fish',
        text: 'Hur ofta äter du fisk eller skaldjur som huvudrätt?',
        options: [
          { label: 'Tre gånger i veckan eller oftare', value: 0, score: 4 },
          { label: 'Två gånger i veckan', value: 1, score: 3 },
          { label: 'En gång i veckan', value: 2, score: 2 },
          { label: 'Några gånger i månaden eller mer sällan', value: 3, score: 0 },
        ]
      },
      {
        id: 'diet_junk',
        text: 'Hur ofta äter du kaffebröd, choklad/godis, chips eller dricker läsk/saft?',
        options: [
          { label: 'Dagligen', value: 0, score: 0 },
          { label: 'Nästan varje dag', value: 1, score: 1 },
          { label: 'Några gånger i veckan', value: 2, score: 2 },
          { label: 'En gång i veckan eller mer sällan', value: 3, score: 4 },
        ]
      }
    ]
  }
]

export function calculateLifestyleScore(answers) {
  let total = 0
  for (const section of LIFESTYLE_SECTIONS) {
    for (const q of section.questions) {
      const answer = answers[q.id]
      if (answer !== undefined && answer !== null) {
        const option = q.options.find(o => o.value === answer)
        if (option) total += option.score
      }
    }
  }
  return total
}

/** Returns true = smoker, false = non-smoker, null = unknown */
export function getSmokingFromLifestyle(answers) {
  const t = answers?.tobacco
  if (!t) return null
  return t === 'yes' || t === 'quit_recent'
}

export function getScoreLabel(score) {
  if (score >= 80) return { label: 'Utmärkta levnadsvanor', color: '#16a34a' }
  if (score >= 60) return { label: 'Bra levnadsvanor', color: '#65a30d' }
  if (score >= 40) return { label: 'Måttliga levnadsvanor', color: '#ca8a04' }
  if (score >= 20) return { label: 'Mindre bra levnadsvanor', color: '#ea580c' }
  return { label: 'Ohälsosamma levnadsvanor', color: '#dc2626' }
}
