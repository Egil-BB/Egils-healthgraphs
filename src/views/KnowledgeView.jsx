// ── Om appen / externa länkar ─────────────────────────────────────────────────

const EXTERNAL_LINKS = [
  {
    category: 'Hälsa och levnadsvanor',
    items: [
      { label: 'Fysisk aktivitet – 1177', url: 'https://www.1177.se/Stockholm/liv--halsa/fysisk-aktivitet-och-traning/varfor-ska-jag-rora-pa-mig/' },
      { label: 'Kostråd för vuxna – Livsmedelsverket', url: 'https://www.livsmedelsverket.se/matvanor-halsa--miljo/kostrad/kostrad-vuxna/' },
      { label: 'Alkohol – 1177', url: 'https://www.1177.se/Stockholm/liv--halsa/tobak-och-alkohol/alkohol/sa-kan-du-andra-dina-alkoholvanor/' },
      { label: 'Rökning och snusning – 1177', url: 'https://www.1177.se/Stockholm/liv--halsa/tobak-och-alkohol/tobak/rokning-och-snusning/' },
      { label: 'Sömnsvårigheter – 1177', url: 'https://www.1177.se/Stockholm/liv--halsa/stresshantering-och-somn/somnsvarigheter/' },
      { label: 'Stress – 1177', url: 'https://www.1177.se/Stockholm/liv--halsa/stresshantering-och-somn/stress/' },
    ]
  },
  {
    category: 'Sjukvård och information',
    items: [
      { label: '1177.se – sjukvårdsrådgivning', url: 'https://www.1177.se/' },
      { label: 'Riksförbundet HjärtLung', url: 'https://www.hjart-lung.se/' },
      { label: 'Diabetesförbundet', url: 'https://www.diabetes.se/' },
      { label: 'FASS – läkemedelsinformation', url: 'https://www.fass.se/' },
    ]
  },
]

export default function KnowledgeView() {
  return (
    <div className="view-content">
      <div className="card">
        <h2 className="card-title">📖 Om appen</h2>
        <p className="card-desc">
          <strong>Min Hälsologg</strong> är ett personligt anteckningsverktyg för egna hälsovärden.
          Du kan logga blodtryck, provsvar, vikt, levnadsvanor och mediciner, och sedan se dem i grafer.
        </p>
        <p className="card-desc" style={{ marginTop: 8 }}>
          Appen är <strong>inte</strong> en medicinsk produkt och ger ingen medicinsk rådgivning.
          All data lagras lokalt på din enhet – inget skickas till någon server.
          Beslut om hälsa och behandling tas alltid tillsammans med din vårdgivare.
        </p>
        <p className="card-desc" style={{ marginTop: 8, fontStyle: 'italic' }}>
          Tillhandahålls i befintligt skick, utan garanti.
        </p>
      </div>

      <div className="card">
        <h3 className="card-title">Datalagring och integritet</h3>
        <p className="card-desc">
          All information du registrerar lagras enbart lokalt i din webbläsares IndexedDB.
          Inga uppgifter skickas till externa servrar. Du kan när som helst exportera eller
          rensa din data via Inställningar.
        </p>
      </div>

      <div className="card">
        <h3 className="card-title">Externa resurser</h3>
        <p className="card-desc" style={{ marginBottom: 16 }}>
          Länkar till pålitliga informationskällor. Appen ansvarar inte för innehållet på externa sidor.
        </p>
        {EXTERNAL_LINKS.map(group => (
          <div key={group.category} style={{ marginBottom: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
              {group.category}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {group.items.map((item, i) => (
                <a
                  key={i}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: 'var(--bg)',
                    borderRadius: 10,
                    color: 'var(--primary)',
                    textDecoration: 'none',
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  {item.label}
                  <span style={{ fontSize: 16, marginLeft: 8 }}>↗</span>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
          Personligt loggverktyg. All data lagras lokalt på din enhet.
          Ingenting här utgör medicinsk rådgivning – prata med din vårdgivare om tolkning av dina värden.
        </p>
      </div>
    </div>
  )
}
