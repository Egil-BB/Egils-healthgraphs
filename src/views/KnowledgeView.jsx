const ARTICLES = [
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
      { label: '1177 om salt', url: 'https://www.1177.se' },
      { label: 'Livsmedelsverket om salt', url: 'https://www.livsmedelsverket.se' }
    ]
  },
  {
    id: 'motion',
    icon: '🚶',
    title: 'Fysisk aktivitet',
    summary: 'Regelbunden motion kan sänka blodtrycket med 4–9 mmHg.',
    content: `Regelbunden aerob träning – som promenader, cykling eller simning – är en av de effektivaste icke-farmakologiska behandlingarna mot högt blodtryck.

**Rekommendation:** 150 minuter måttlig intensitet per vecka, eller 75 minuter hård intensitet.

**Effekter:**
- Stärker hjärtmuskeln
- Vidgar blodkärlen
- Minskar stresshormonernas påverkan
- Förbättrar insulinkänsligheten

Även 30 minuters daglig promenad ger mätbara förbättringar. Börja lugnt och öka gradvis.`,
    links: [
      { label: '1177 om träning och hjärtat', url: 'https://www.1177.se' }
    ]
  },
  {
    id: 'vikt',
    icon: '⚖️',
    title: 'Vikt och midjemått',
    summary: 'Varje kg viktnedgång kan sänka blodtrycket med 1 mmHg.',
    content: `Övervikt, särskilt bukfetma, är en stark riskfaktor för högt blodtryck. Fettvävnad runt buken påverkar hormoner och kärlsystemet negativt.

**Midjemått (riskgräns):**
- Män: > 94 cm (hög risk vid > 102 cm)
- Kvinnor: > 80 cm (hög risk vid > 88 cm)

**Tips för viktnedgång:**
- Minska sockerrika drycker och snacks
- Ät mer grönsaker och protein
- Ät långsammare – det tar 20 minuter för mättnadssignalen
- Kombinera kostförändringar med motion

Redan 5 % viktnedgång ger märkbara förbättringar av blodtrycket.`,
    links: [
      { label: '1177 om övervikt', url: 'https://www.1177.se' }
    ]
  },
  {
    id: 'alkohol',
    icon: '🍷',
    title: 'Alkohol',
    summary: 'Alkohol höjer blodtrycket och ökar risken för stroke.',
    content: `Alkohol har en direkt blodtryckshöjande effekt, särskilt vid regelbundet intag. Sambandet är linjärt – ju mer alkohol, desto högre blodtryck.

**Riskgräns:** Mer än 14 standardglas (Sverige) per vecka för män, 9 för kvinnor.

**Effekter av minskat intag:**
- Systoliskt blodtryck kan sjunka 2–4 mmHg
- Bättre sömn och återhämtning
- Minskad risk för förmaksflimmer

En "alkoholfri" period på 2–4 veckor kan ge tydlig förbättring av blodtrycket.`,
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
    summary: 'Sömnbrist och kronisk stress höjer blodtrycket.',
    content: `Under djupsömn sjunker blodtrycket normalt med 10–20 % – ett mönster som kallas "dipping". Vid sömnstörningar eller stress saknas denna återhämtning.

**Sömnrekommendation:** 7–9 timmar per natt för vuxna.

**Sömnhygien:**
- Fast lägg- och uppstigningstid
- Mörkt, svalt och tyst sovrum
- Undvik skärmar 1 timme före sömn
- Undvik koffein efter kl 14

**Stresshantering:**
- Mindfulness och avslappningsövningar
- Regelbunden motion är stressreducerande
- Socialt stöd och meningsfull aktivitet

Sömnbrist ökar också risken för övervikt, diabetes och depression – alla faktorer som påverkar blodtrycket.`,
    links: [
      { label: '1177 om sömn', url: 'https://www.1177.se' }
    ]
  },
  {
    id: 'mediciner',
    icon: '💊',
    title: 'Blodtrycksmediciner',
    summary: 'Moderna mediciner är säkra och effektiva. Ta dem regelbundet.',
    content: `Det finns flera klasser av blodtryckssänkande mediciner. Ofta kombineras flera för bästa effekt.

**Vanliga klasser:**
- **ACE-hämmare** (t.ex. Enalapril, Ramipril) – vidgar blodkärlen
- **ARB** (t.ex. Losartan, Valsartan) – liknande effekt, färre biverkningar
- **Kalciumantagonister** (t.ex. Amlodipin) – vidgar blodkärlen
- **Tiaziddiuretika** (t.ex. Hydroklortiazid) – ökar utsöndringen av salt och vatten
- **Betablockerare** (t.ex. Metoprolol) – sänker hjärtfrekvensen

**Viktigt:**
- Ta medicinen varje dag vid samma tid
- Sluta inte utan att tala med din läkare
- Biverkningar är ofta tillfälliga och kan hanteras

FASS innehåller fullständig information om varje preparat.`,
    links: [
      { label: 'FASS – läkemedelsinformation', url: 'https://www.fass.se' },
      { label: '1177 om blodtrycksläkemedel', url: 'https://www.1177.se' }
    ]
  },
  {
    id: 'matning',
    icon: '📏',
    title: 'Korrekt blodtrycksmätning',
    summary: 'Rätt teknik ger tillförlitliga värden.',
    content: `Blodtrycket varierar naturligt under dagen och påverkas av många faktorer. För att få representativa värden är tekniken viktig.

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

Hemblodtryck är ofta mer tillförlitligt än mottagningstryck (undviker "vitrockseffekt").`,
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
          Korta sammanfattningar om livsstil, behandling och blodtrycksmätning.
          Klicka på ett ämne för att läsa mer.
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
                // Parse inline bold
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
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="knowledge-link"
                    >
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
