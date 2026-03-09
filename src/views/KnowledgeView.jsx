import { useState } from 'react'

const ARTICLES = [
  // ── Livsstil ──────────────────────────────────────────────────────────────
  {
    id: 'motion',
    icon: '🚶',
    title: 'Fysisk aktivitet',
    summary: 'Sänker blodtrycket, förbättrar blodsockret och kolesterolet.',
    content: `Regelbunden aerob träning är en av de effektivaste icke-farmakologiska behandlingarna mot högt blodtryck, förhöjt blodsocker och ogynnsamma blodfetter.

**Rekommendation:** 150 minuter måttlig intensitet per vecka (t.ex. rask promenad) eller 75 minuter hård intensitet.

**Effekter på blodtrycket:**
Aerob träning sänker systoliskt blodtryck med 4–9 mmHg. Effekten märks redan efter 2–4 veckor.

**Effekter på blodsockret:**
Motion ökar insulinkänsligheten och sänker HbA1c med 5–15 mmol/mol vid typ 2-diabetes. Promenader efter måltid minskar blodsockertoppar.

**Effekter på blodfetterna:**
Regelbunden motion höjer HDL ("det goda kolesterolet"), sänker triglycerider och LDL. Konditionsträning kombinerat med styrketräning ger bäst effekt.

**Effekter på vikten:**
Konditionsträning förbränner kalorier och motverkar bukfetma, vilket i sin tur minskar insulinresistens.

Börja lugnt och öka gradvis. Redan 30 minuters daglig promenad ger mätbara förbättringar.`,
    links: [
      { label: '1177 om träning och hjärtat', url: 'https://www.1177.se' }
    ]
  },
  {
    id: 'kost',
    icon: '🥗',
    title: 'Kost',
    summary: 'Rätt kost påverkar blodtryck, blodsocker, kolesterol och vikt.',
    content: `Kosten är central för att påverka flera riskfaktorer simultaneously.

**Minska socker och snabba kolhydrater:**
Socker och vitt mjöl höjer blodsockret snabbt och ökar triglycerider. Välj fullkornsprodukter, baljväxter och grönsaker.

**Minska mättat fett:**
Mättat fett (smör, chark, kokosfett) höjer LDL-kolesterol. Byt till olivolja, nötter och fisk.

**Minska salt:**
Max 5–6 gram per dag (en tesked). Minskat saltintag sänker blodtrycket 2–8 mmHg.

**Öka fiber:**
Kostfiber från grönsaker, frukt och fullkorn sänker LDL och förbättrar blodsockerreglering.

**DASH-kost och Medelhavskost:**
Båda har stark evidens för att sänka blodtryck och kardiovaskulär risk.

**Undvik:** Läsk, juice och alkohol – alla höjer triglycerider och kan öka blodtrycket.`,
    links: [
      { label: '1177 om mat och hälsa', url: 'https://www.1177.se' },
      { label: 'Livsmedelsverkets råd', url: 'https://www.livsmedelsverket.se' }
    ]
  },
  {
    id: 'vikt',
    icon: '⚖️',
    title: 'Vikt och midjemått',
    summary: 'Bukfetma driver högt BT, diabetes, dåliga blodfetter och hjärtrisk.',
    content: `Övervikt – framför allt bukfetma – är en stark riskfaktor för högt blodtryck, typ 2-diabetes, ogynnsamma blodfetter och hjärt-kärlsjukdom.

**Midjemått (riskgräns):**
- Män: > 94 cm (hög risk vid > 102 cm)
- Kvinnor: > 80 cm (hög risk vid > 88 cm)

Midjemåttet speglar bukfetma bättre än BMI och används vid bedömning av metabolt syndrom.

**Viktnedgångens effekter:**
- 1 kg viktnedgång sänker systoliskt blodtryck med ~1 mmHg
- 5–10 % viktnedgång kan normalisera blodsocker vid prediabetes
- HDL ökar och triglycerider sjunker vid viktnedgång
- Insulinkänsligheten förbättras markant

**Tips:**
- Minska sockerrika drycker och snacks
- Ät mer grönsaker och protein
- Kombinera kostförändringar med motion
- Sätt rimliga mål – 0,5–1 kg per vecka är hållbart

Redan 5 % viktnedgång ger märkbara förbättringar av alla riskfaktorer.`,
    links: [
      { label: '1177 om övervikt', url: 'https://www.1177.se' }
    ]
  },
  {
    id: 'salt',
    icon: '🧂',
    title: 'Saltintag',
    summary: 'Minskat saltintag kan sänka blodtrycket med 2–8 mmHg.',
    content: `De flesta äter för mycket salt – runt 9–10 gram per dag. Rekommendationen är max 5–6 gram (en tesked).

Salt binder vatten i kroppen och ökar blodvolymen, vilket höjer trycket på kärlväggarna.

**Tips:**
- Minska färdigmat och chark – de innehåller mest salt
- Smaka av maten innan du saltar
- Välj osaltade nötter och knäckebröd
- Använd örter och citron som smaksättning istället

En minskning med 3 gram salt per dag kan sänka systoliskt blodtryck med 3–4 mmHg.`,
    links: [
      { label: '1177 om salt', url: 'https://www.1177.se' }
    ]
  },
  {
    id: 'alkohol',
    icon: '🍷',
    title: 'Alkohol',
    summary: 'Höjer blodtrycket, triglycerider och vikten.',
    content: `Alkohol har en direkt blodtryckshöjande effekt, särskilt vid regelbundet intag. Sambandet är linjärt – ju mer alkohol, desto högre blodtryck.

**Riskgräns:** Mer än 14 standardglas per vecka för män, 9 för kvinnor (Sverige).

**Effekter på blodsockret:**
Alkohol kan ge svårbedömda blodsockersvar – hypoglykemi vid fasta och hyperglykemi annars. Särskilt viktigt för diabetiker.

**Effekter på blodfetterna:**
Alkohol höjer triglycerider avsevärt. Även måttligt intag påverkar.

**Effekter av minskat intag:**
- Systoliskt blodtryck kan sjunka 2–4 mmHg
- Triglycerider normaliseras snabbt
- Viktnedgång av minskade kalorier

En alkoholfri period på 2–4 veckor kan ge tydlig förbättring.`,
    links: [
      { label: '1177 om alkohol', url: 'https://www.1177.se' }
    ]
  },
  {
    id: 'rokning',
    icon: '🚭',
    title: 'Rökning',
    summary: 'Varje cigarett höjer tillfälligt blodtrycket med 10–20 mmHg.',
    content: `Rökning är den enskilt viktigaste påverkningsbara riskfaktorn för hjärt-kärlsjukdom. Nikotin orsakar akut kärlsammandragning och höjer hjärtfrekvensen.

**Effekter av rökstopp:**
- Blodtrycket normaliseras inom timmar
- Risken för hjärtinfarkt halveras inom ett år
- Risken för stroke minskar kraftigt

Rökning multiplicerar dessutom effekten av övriga riskfaktorer som högt blodtryck och högt kolesterol.

Kontakta din vårdcentral för rökavvänjningsstöd – kombinationen av stöd och läkemedel ger bäst resultat.`,
    links: [
      { label: '1177 om rökstopp', url: 'https://www.1177.se' }
    ]
  },
  {
    id: 'somn',
    icon: '😴',
    title: 'Sömn och stress',
    summary: 'Sömnbrist och kronisk stress höjer blodtrycket och blodsockret.',
    content: `Under djupsömn sjunker blodtrycket normalt med 10–20 % ("dipping"). Vid sömnstörningar saknas denna återhämtning och dygnsrytmen för kortisol och insulin rubbas.

**Sömnrekommendation:** 7–9 timmar per natt för vuxna.

**Sömnbrist och ämnesomsättning:**
Sömnbrist ökar hunger (via ghrelin), minskar mättnad (via leptin) och ökar insulinresistens. Det ger ökad risk för fetma och typ 2-diabetes.

**Sömnhygien:**
- Fast lägg- och uppstigningstid
- Mörkt, svalt och tyst sovrum
- Undvik skärmar 1 timme före sömn
- Undvik koffein efter kl 14

**Stresshantering:**
- Mindfulness och avslappningsövningar
- Regelbunden motion är stressreducerande
- Socialt stöd och meningsfull aktivitet`,
    links: [
      { label: '1177 om sömn', url: 'https://www.1177.se' }
    ]
  },

  // ── Sjukdomar ─────────────────────────────────────────────────────────────
  {
    id: 'hypertoni',
    icon: '💓',
    title: 'Högt blodtryck (hypertoni)',
    summary: 'Drabbar var tredje vuxen och är den vanligaste orsaken till stroke.',
    content: `Högt blodtryck definieras som systoliskt ≥140 mmHg och/eller diastoliskt ≥90 mmHg upprepat.

**Varför farligt?**
Högt tryck skadar kärlväggarna gradvis och ökar risken för hjärtinfarkt, stroke, njurskada och hjärtsvikt. Sjukdomen är oftast symptomfri – "den tyste dödaren".

**Målvärden:**
- Allmänt: <140/90 mmHg
- Vid diabetes, njursjukdom, hög kardiovaskulär risk: <130/80 mmHg
- Hemblodtryck är ofta 5 mmHg lägre än mottagningsvärde

**Livsstilsbehandling:**
Saltminskning, viktnedgång, motion och minskat alkohol – kan sänka trycket 5–15 mmHg.

**Mätning i hemmet:**
Morgonmätning (före medicin, efter 5 min vila) ger bäst bild. Registrera i appen!`,
    links: [
      { label: '1177 om högt blodtryck', url: 'https://www.1177.se/sjukdomar--besvar/hjarta-och-blodkarl/blodtryck/hogt-blodtryck/' }
    ]
  },
  {
    id: 'diabetes',
    icon: '🩸',
    title: 'Diabetes och prediabetes',
    summary: 'Typ 2-diabetes kan förebyggas och behandlas med livsstil och läkemedel.',
    content: `**Typ 2-diabetes** uppstår när kroppen inte kan använda insulin effektivt (insulinresistens).

**Gränsvärden:**
- Normalt fasteglukos: < 6,0 mmol/L och HbA1c < 42 mmol/mol
- Prediabetes: fasteglukos 6,0–6,9 eller HbA1c 42–47
- Diabetes: fasteglukos ≥ 7,0 eller HbA1c ≥ 48

**Symtom:**
Ofta inga. Ibland ökad törst, täta urinträngningar, trötthet, dimsyn.

**Komplikationer:**
Njurskada, neuropati, retinopati, ökad hjärt-kärlrisk. Högt blodtryck + diabetes är en farlig kombination.

**Prediabetes kan vändas:**
5–7 % viktnedgång + 150 min/vecka motion minskar risken för diabetes typ 2 med 58 % (DPP-studien). Minska socker och snabba kolhydrater.`,
    links: [
      { label: '1177 om diabetes typ 2', url: 'https://www.1177.se/sjukdomar--besvar/hormoner-och-amnesomsattning/diabetes/diabetes-typ-2/' }
    ]
  },
  {
    id: 'kolesterol',
    icon: '🫀',
    title: 'Kolesterol och hjärtrisk',
    summary: 'LDL och non-HDL driver åderförkalkning. HDL skyddar.',
    content: `**Principen: lägre är bättre**
För LDL och non-HDL gäller generellt att lägre värden ger lägre risk för hjärt-kärlsjukdom — det finns inget "för lågt" för de flesta. Ju högre din totala risk, desto mer att vinna på att sänka fetterna.

**Vanliga referensvärden (ungefärliga riktvärden):**
- **LDL-kolesterol:** < 2,5 mmol/L som utgångspunkt
- **Non-HDL:** < 3,4 mmol/L (fångar alla "dåliga" fetter, används i SCORE2)
- **HDL:** > 1,0 (män) / > 1,3 (kvinnor) mmol/L – skyddar
- **Triglycerider:** < 1,7 mmol/L
- **Totalkolesterol:** < 5,0 mmol/L

**Behandlingsmål beror på din totala risk**
Vid hög eller mycket hög kardiovaskulär risk (t.ex. genomgången hjärtinfarkt, diabetes + riskfaktorer) rekommenderar ESC lägre LDL-mål: < 1,8 eller till och med < 1,4 mmol/L. SCORE2 är ett bra hjälpmedel för att uppskatta din risk, men det ersätter inte en samlad klinisk bedömning av din läkare – som också väger in ärftlighet, övriga sjukdomar och symtom.

**Vad höjer LDL?**
Mättat fett (smör, chark, kokosfett), transfetter, ärftlighet.

**Vad sänker LDL?**
Kostförändringar (minskat mättat fett, mer fiber), motion, viktminskning och statiner.

**Triglycerider höjs av:**
Socker, alkohol, vitt bröd och stillasittande.`,
    links: [
      { label: '1177 om högt kolesterol', url: 'https://www.1177.se/sjukdomar--besvar/hjarta-och-blodkarl/blodtryck/hogt-kolesterol/' }
    ]
  },

  // ── Mediciner ─────────────────────────────────────────────────────────────
  {
    id: 'btmediciner',
    icon: '💊',
    title: 'Blodtrycksmediciner',
    summary: 'Moderna mediciner är säkra och effektiva. Ta dem regelbundet.',
    content: `Det finns flera klasser av blodtryckssänkande mediciner. Ofta kombineras flera.

**Vanliga klasser:**
- **ACE-hämmare** (Ramipril, Enalapril) – vidgar kärlen, skyddar njurarna
- **ARB** (Losartan, Kandesartan) – liknande ACE, färre biverkningar
- **Kalciumantagonister** (Amlodipin) – vidgar kärlen
- **Tiaziddiuretika** (Hydroklortiazid, Indapamid) – ökar saltutsöndringen
- **Betablockerare** (Metoprolol) – sänker hjärtfrekvensen

**Pausera vid uttorkning:**
ARB, ACE-hämmare och diuretika bör pausas vid feber, kräkningar eller diarré.

**Efter dosändring:**
Ta nya blodprover 1–2 veckor efter dosändring av ARB/ACE/diuretika (njurfunktion och kalium).

Ta medicinen varje dag vid samma tid. Sluta inte utan att tala med din läkare.`,
    links: [
      { label: 'FASS – läkemedelsinformation', url: 'https://www.fass.se' },
      { label: '1177 om blodtrycksläkemedel', url: 'https://www.1177.se' }
    ]
  },
  {
    id: 'diabetesmediciner',
    icon: '🩺',
    title: 'Diabetesmediciner',
    summary: 'Från Metformin till GLP-1 och insulin – en översikt.',
    content: `**Metformin (förstahandsval):**
Sänker blodsocker utan viktuppgång. Kontraindicerat vid eGFR <30. Pausas vid uttorkning och röntgenkontrast.

**SGLT2-hämmare** (Dapagliflozin, Empagliflozin):
Utsöndrar socker via urinen. Minskar hjärt-kärlhändelser och njurskada. Ger viss viktnedgång.

**GLP-1-agonister** (Semaglutid/Ozempic, Liraglutid/Victoza):
Injektioner som sänker blodsocker, ger viktnedgång och minskar kardiovaskulär risk.

**DPP-4-hämmare** (Sitagliptin, Vildagliptin):
Tabletter med mild blodsockersänkning. Väl tolererade.

**Insulin:**
Används vid typ 1 och avancerad typ 2. Långverkande (basinsulin) och snabbverkande (måltidsinsulin).

**Målvärde HbA1c:** Individualiserat, ofta <52 mmol/mol.`,
    links: [
      { label: '1177 om diabetesmediciner', url: 'https://www.1177.se' },
      { label: 'FASS', url: 'https://www.fass.se' }
    ]
  },
  {
    id: 'kolesterolmediciner',
    icon: '💉',
    title: 'Kolesterolmediciner',
    summary: 'Statiner är effektiva och välstuderade. Ezetimib och PCSK9 finns vid behov.',
    content: `**Statiner** (Atorvastatin, Rosuvastatin, Simvastatin):
Hämmar kroppens kolesterolsyntetos. Sänker LDL 30–55 %. Ta på kvällen. Biverkningar (muskelvärk) är relativt sällsynta.

**Ezetimib:**
Minskar kolesterolinsuget från tarmen. Sänker LDL 15–20 %. Används som tillägg till statin.

**PCSK9-hämmare** (Evolokumab, Alirokumab):
Injektioner varannan vecka. Sänker LDL 50–65 %. Används vid familjär hyperkolesterolemi eller hög risk.

**Viktigt:**
- Ta statiner regelbundet
- Kombinera med kostomläggning
- Kontrollera levervärden (ALAT) vid start`,
    links: [
      { label: '1177 om statiner', url: 'https://www.1177.se' },
      { label: 'FASS', url: 'https://www.fass.se' }
    ]
  },
  {
    id: 'viktmediciner',
    icon: '🏥',
    title: 'Viktbehandling och kirurgi',
    summary: 'GLP-1, SGLT2 och fetmakirurgi – effektiva alternativ vid svår övervikt.',
    content: `Vid BMI ≥30 (eller ≥27 med följdsjukdomar) kan läkemedel och kirurgi vara aktuellt om livsstilsbehandling inte räckt.

**GLP-1-agonister för vikt:**
- Semaglutid (Wegovy) – injektion en gång/vecka, ger 10–17 % viktnedgång
- Tirzepatid (Mounjaro) – dual GIP/GLP-1, ger upp till 20–22 % viktnedgång
- Liraglutid (Saxenda) – daglig injektion, 5–8 % viktnedgång

Biverkningar: illamående, kräkningar. Vikten återkommer ofta vid utsättning.

**Fetmakirurgi (bariatri):**
- **Gastric bypass:** Minskar magsäcken och kopplar om tarmarna. 60–80 % överviktsminskning. Botar ofta typ 2-diabetes helt.
- **Sleeve gastrektomi:** Stor del av magsäcken tas bort. 50–60 % överviktsminskning.

Bariatri är indicerad vid BMI ≥40, eller ≥35 med allvarlig följdsjukdom. Remiss via vårdcentral.

Vitamintillägg (B12, D, järn, folat) är livslångt nödvändigt efter gastric bypass.`,
    links: [
      { label: '1177 om fetmakirurgi', url: 'https://www.1177.se/sjukdomar--besvar/mage-och-tarm/mage/fetmakirurgi/' },
      { label: '1177 om överviktsbehandling', url: 'https://www.1177.se' }
    ]
  },
  {
    id: 'matning',
    icon: '📏',
    title: 'Korrekt blodtrycksmätning',
    summary: 'Rätt teknik ger tillförlitliga värden.',
    content: `Blodtrycket varierar naturligt under dagen och påverkas av många faktorer.

**Före mätning:**
- Sitt still i 5 minuter
- Tom urinblåsa
- Undvik koffein och motion 30 minuter före
- Inga samtal under mätningen

**Under mätning:**
- Sitt bekvämt med ryggstöd
- Foten platt på golvet (ej korsade ben)
- Manschetten i hjärthöjd
- Arm avslappnad på ett underlag

**Morgonmätning:**
- Ta alltid på morgonen före medicinering
- Registrera 2 mätningar med 1–2 minuters mellanrum
- Använd genomsnittet

Hemblodtryck är mer tillförlitligt än mottagningstryck (undviker "vitrockseffekt").`,
    links: [
      { label: '1177 om blodtrycksundersökning', url: 'https://www.1177.se' }
    ]
  }
]

export default function KnowledgeView() {
  const [open, setOpen] = useState(null)

  return (
    <div className="view-content">
      <div className="card">
        <h2 className="card-title">Kunskap & råd</h2>
        <p className="card-desc">
          Livsstil, sjukdomar och behandling. Klicka på ett ämne för att läsa mer.
          Råden ersätter inte kontakt med sjukvården – se <a href="https://www.1177.se" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>1177.se</a> för mer information.
        </p>
      </div>

      {ARTICLES.map(article => (
        <div key={article.id} className="card knowledge-card">
          <button
            className="knowledge-header"
            onClick={() => setOpen(open === article.id ? null : article.id)}
          >
            <span className="knowledge-icon">{article.icon}</span>
            <div className="knowledge-title-group">
              <span className="knowledge-title">{article.title}</span>
              <span className="knowledge-summary">{article.summary}</span>
            </div>
            <span className="knowledge-chevron">{open === article.id ? '▲' : '▼'}</span>
          </button>

          {open === article.id && (
            <div className="knowledge-content">
              {article.content.split('\n\n').map((para, i) => {
                if (para.startsWith('**') && para.endsWith('**')) {
                  return <h4 key={i} className="knowledge-subheading">{para.slice(2, -2)}</h4>
                }
                if (para.includes('\n- ') || para.startsWith('- ')) {
                  const lines = para.split('\n')
                  const intro = lines[0].startsWith('- ') ? null : lines[0]
                  const items = lines.filter(l => l.startsWith('- '))
                  return (
                    <div key={i}>
                      {intro && (() => {
                        const parts = intro.split(/\*\*(.*?)\*\*/g)
                        return <p className="knowledge-para">{parts.map((p, k) => k % 2 === 1 ? <strong key={k}>{p}</strong> : p)}</p>
                      })()}
                      <ul className="knowledge-list">
                        {items.map((item, j) => {
                          const parts = item.slice(2).split(/\*\*(.*?)\*\*/g)
                          return <li key={j}>{parts.map((p, k) => k % 2 === 1 ? <strong key={k}>{p}</strong> : p)}</li>
                        })}
                      </ul>
                    </div>
                  )
                }
                const parts = para.split(/\*\*(.*?)\*\*/g)
                return (
                  <p key={i} className="knowledge-para">
                    {parts.map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)}
                  </p>
                )
              })}

              {article.links.length > 0 && (
                <div className="knowledge-links">
                  <span className="knowledge-links-label">Mer information:</span>
                  {article.links.map((link, i) => (
                    <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="knowledge-link">
                      {link.label} ↗
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
