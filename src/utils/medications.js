export const COMMON_MEDICATIONS = [
  {
    class: 'ACE-hämmare',
    graphTargets: ['bp'],
    drugs: [
      { name: 'Enalapril', strengths: ['2,5 mg', '5 mg', '10 mg', '20 mg'], fass: 'enalapril' },
      { name: 'Ramipril', strengths: ['1,25 mg', '2,5 mg', '5 mg', '10 mg'], fass: 'ramipril' },
      { name: 'Lisinopril', strengths: ['2,5 mg', '5 mg', '10 mg', '20 mg'], fass: 'lisinopril' },
      { name: 'Perindopril', strengths: ['2 mg', '4 mg', '8 mg'], fass: 'perindopril' },
    ]
  },
  {
    class: 'ARB (angiotensin II-antagonist)',
    graphTargets: ['bp'],
    drugs: [
      { name: 'Losartan', strengths: ['25 mg', '50 mg', '100 mg'], fass: 'losartan' },
      { name: 'Valsartan', strengths: ['40 mg', '80 mg', '160 mg', '320 mg'], fass: 'valsartan' },
      { name: 'Kandesartan', strengths: ['4 mg', '8 mg', '16 mg', '32 mg'], fass: 'kandesartan' },
      { name: 'Irbesartan', strengths: ['75 mg', '150 mg', '300 mg'], fass: 'irbesartan' },
      { name: 'Olmesartan', strengths: ['10 mg', '20 mg', '40 mg'], fass: 'olmesartan' },
      { name: 'Telmisartan', strengths: ['20 mg', '40 mg', '80 mg'], fass: 'telmisartan' },
    ]
  },
  {
    class: 'Kalciumantagonist',
    graphTargets: ['bp'],
    drugs: [
      { name: 'Amlodipin', strengths: ['2,5 mg', '5 mg', '10 mg'], fass: 'amlodipin' },
      { name: 'Felodipin', strengths: ['2,5 mg', '5 mg', '10 mg'], fass: 'felodipin' },
      { name: 'Lerkanidipin', strengths: ['10 mg', '20 mg'], fass: 'lerkanidipin' },
    ]
  },
  {
    class: 'Diuretika',
    graphTargets: ['bp'],
    drugs: [
      { name: 'Hydroklortiazid', strengths: ['12,5 mg', '25 mg'], fass: 'hydroklortiazid' },
      { name: 'Klortalidon', strengths: ['12,5 mg', '25 mg', '50 mg'], fass: 'klortalidon' },
      { name: 'Indapamid', strengths: ['1,25 mg', '2,5 mg'], fass: 'indapamid' },
      { name: 'Spironolakton', strengths: ['25 mg', '50 mg', '100 mg'], fass: 'spironolakton' },
      { name: 'Eplerenon', strengths: ['25 mg', '50 mg'], fass: 'eplerenon' },
    ]
  },
  {
    class: 'Betablockerare',
    graphTargets: ['bp'],
    drugs: [
      { name: 'Metoprolol', strengths: ['25 mg', '50 mg', '100 mg', '200 mg'], fass: 'metoprolol' },
      { name: 'Bisoprolol', strengths: ['1,25 mg', '2,5 mg', '5 mg', '10 mg'], fass: 'bisoprolol' },
      { name: 'Atenolol', strengths: ['25 mg', '50 mg', '100 mg'], fass: 'atenolol' },
      { name: 'Karvedilol', strengths: ['3,125 mg', '6,25 mg', '12,5 mg', '25 mg'], fass: 'karvedilol' },
    ]
  },
  {
    class: 'Kombinationspreparat (BT)',
    graphTargets: ['bp'],
    drugs: [
      { name: 'Losartan/Hydroklortiazid', strengths: ['50/12,5 mg', '100/12,5 mg', '100/25 mg'], fass: 'losartan+hydroklortiazid' },
      { name: 'Valsartan/Hydroklortiazid', strengths: ['80/12,5 mg', '160/12,5 mg', '160/25 mg', '320/25 mg'], fass: 'valsartan+hydroklortiazid' },
      { name: 'Kandesartan/Hydroklortiazid', strengths: ['8/12,5 mg', '16/12,5 mg', '32/25 mg'], fass: 'kandesartan+hydroklortiazid' },
      { name: 'Amlodipin/Valsartan', strengths: ['5/80 mg', '5/160 mg', '10/160 mg', '5/320 mg', '10/320 mg'], fass: 'amlodipin+valsartan' },
      { name: 'Amlodipin/Ramipril', strengths: ['5/5 mg', '5/10 mg', '10/5 mg', '10/10 mg'], fass: 'amlodipin+ramipril' },
      { name: 'Olmesartan/Amlodipin', strengths: ['20/5 mg', '40/5 mg', '40/10 mg'], fass: 'olmesartan+amlodipin' },
    ]
  },
  {
    class: 'Centralt verkande / övrigt (BT)',
    graphTargets: ['bp'],
    drugs: [
      { name: 'Moxonidin', strengths: ['0,2 mg', '0,3 mg', '0,4 mg'], fass: 'moxonidin' },
      { name: 'Doxazosin', strengths: ['1 mg', '2 mg', '4 mg', '8 mg'], fass: 'doxazosin' },
    ]
  },
  {
    class: 'Statiner',
    graphTargets: ['cholesterol'],
    drugs: [
      { name: 'Atorvastatin', strengths: ['10 mg', '20 mg', '40 mg', '80 mg'], fass: 'atorvastatin' },
      { name: 'Rosuvastatin', strengths: ['5 mg', '10 mg', '20 mg', '40 mg'], fass: 'rosuvastatin' },
      { name: 'Simvastatin', strengths: ['10 mg', '20 mg', '40 mg'], fass: 'simvastatin' },
      { name: 'Pravastatin', strengths: ['10 mg', '20 mg', '40 mg'], fass: 'pravastatin' },
      { name: 'Pitavastatin', strengths: ['1 mg', '2 mg', '4 mg'], fass: 'pitavastatin' },
      { name: 'Fluvastatin', strengths: ['20 mg', '40 mg', '80 mg'], fass: 'fluvastatin' },
    ]
  },
  {
    class: 'Ezetimib',
    graphTargets: ['cholesterol'],
    drugs: [
      { name: 'Ezetimib', strengths: ['10 mg'], fass: 'ezetimib' },
      { name: 'Ezetimib/Simvastatin', strengths: ['10/10 mg', '10/20 mg', '10/40 mg'], fass: 'ezetimib+simvastatin' },
    ]
  },
  {
    class: 'Metformin',
    graphTargets: ['glucose'],
    drugs: [
      { name: 'Metformin', strengths: ['500 mg', '850 mg', '1000 mg'], fass: 'metformin' },
    ]
  },
  {
    class: 'SGLT2-hämmare',
    graphTargets: ['glucose', 'weight'],
    drugs: [
      { name: 'Empagliflozin (Jardiance)', strengths: ['10 mg', '25 mg'], fass: 'empagliflozin' },
      { name: 'Dapagliflozin (Forxiga)', strengths: ['5 mg', '10 mg'], fass: 'dapagliflozin' },
      { name: 'Kanagliflozin (Invokana)', strengths: ['100 mg', '300 mg'], fass: 'kanagliflozin' },
    ]
  },
  {
    class: 'GLP-1-agonist (diabetes)',
    graphTargets: ['glucose', 'weight'],
    drugs: [
      { name: 'Semaglutid (Ozempic)', strengths: ['0,25 mg', '0,5 mg', '1 mg', '2 mg'], fass: 'semaglutid' },
      { name: 'Liraglutid (Victoza)', strengths: ['0,6 mg', '1,2 mg', '1,8 mg'], fass: 'liraglutid' },
      { name: 'Dulaglutid (Trulicity)', strengths: ['0,75 mg', '1,5 mg', '3 mg', '4,5 mg'], fass: 'dulaglutid' },
    ]
  },
  {
    class: 'DPP-4-hämmare',
    graphTargets: ['glucose'],
    drugs: [
      { name: 'Sitagliptin (Januvia)', strengths: ['25 mg', '50 mg', '100 mg'], fass: 'sitagliptin' },
      { name: 'Vildagliptin (Galvus)', strengths: ['50 mg'], fass: 'vildagliptin' },
      { name: 'Saxagliptin (Onglyza)', strengths: ['2,5 mg', '5 mg'], fass: 'saxagliptin' },
    ]
  },
  {
    class: 'Sulfonylureider',
    graphTargets: ['glucose'],
    drugs: [
      { name: 'Glipizid', strengths: ['2,5 mg', '5 mg', '10 mg'], fass: 'glipizid' },
      { name: 'Glibenklamid', strengths: ['1,75 mg', '3,5 mg'], fass: 'glibenklamid' },
      { name: 'Glimepirid', strengths: ['1 mg', '2 mg', '3 mg', '4 mg', '6 mg'], fass: 'glimepirid' },
    ]
  },
  {
    class: 'Insulin',
    graphTargets: ['glucose'],
    drugs: [
      { name: 'Insulin glargin (Lantus/Toujeo)', strengths: ['100 E/ml', '300 E/ml'], fass: 'insulin glargin' },
      { name: 'Insulin degludek (Tresiba)', strengths: ['100 E/ml', '200 E/ml'], fass: 'insulin degludek' },
      { name: 'Insulin detemir (Levemir)', strengths: ['100 E/ml'], fass: 'insulin detemir' },
      { name: 'Insulin aspart (Novorapid)', strengths: ['100 E/ml'], fass: 'insulin aspart' },
      { name: 'Insulin lispro (Humalog)', strengths: ['100 E/ml', '200 E/ml'], fass: 'insulin lispro' },
      { name: 'Insulin aspart bifas (Novomix)', strengths: ['100 E/ml'], fass: 'insulin aspart bifas' },
    ]
  },
  {
    class: 'Viktmedicin',
    graphTargets: ['weight'],
    drugs: [
      { name: 'Tirzepatid (Mounjaro)', strengths: ['2,5 mg', '5 mg', '7,5 mg', '10 mg', '12,5 mg', '15 mg'], fass: 'tirzepatid' },
      { name: 'Semaglutid (Wegovy)', strengths: ['0,25 mg', '0,5 mg', '1 mg', '1,7 mg', '2,4 mg'], fass: 'semaglutid wegovy' },
      { name: 'Liraglutid (Saxenda)', strengths: ['0,6 mg', '1,2 mg', '1,8 mg', '2,4 mg', '3 mg'], fass: 'liraglutid saxenda' },
    ]
  },
  {
    class: 'Paracetamol',
    graphTargets: ['pain'],
    drugs: [
      { name: 'Alvedon', strengths: ['500 mg', '1 g'], fass: 'alvedon' },
      { name: 'Panodil', strengths: ['500 mg', '1 g'], fass: 'panodil' },
      { name: 'Paracetamol', strengths: ['500 mg', '1 g'], fass: 'paracetamol' },
    ]
  },
  {
    class: 'NSAID (smärtstillande)',
    graphTargets: ['pain'],
    drugs: [
      { name: 'Ipren (ibuprofen)', strengths: ['200 mg', '400 mg', '600 mg', '800 mg'], fass: 'ibuprofen' },
      { name: 'Ibuprofen', strengths: ['200 mg', '400 mg', '600 mg', '800 mg'], fass: 'ibuprofen' },
      { name: 'Pronaxen (naproxen)', strengths: ['250 mg', '500 mg', '750 mg depot'], fass: 'naproxen' },
      { name: 'Naproxen', strengths: ['250 mg', '500 mg', '750 mg depot'], fass: 'naproxen' },
      { name: 'Voltaren (diklofenak)', strengths: ['25 mg', '50 mg', '75 mg depot', '100 mg depot'], fass: 'diklofenak' },
      { name: 'Diklofenak', strengths: ['25 mg', '50 mg', '75 mg depot', '100 mg depot'], fass: 'diklofenak' },
    ]
  },
  {
    class: 'Opioider',
    graphTargets: ['pain'],
    drugs: [
      { name: 'Morfin (kortverkande)', strengths: ['5 mg', '10 mg', '20 mg'], fass: 'morfin' },
      { name: 'Dolcontin (morfin depot)', strengths: ['10 mg', '30 mg', '60 mg', '100 mg'], fass: 'dolcontin' },
      { name: 'Oxynorm (oxikodon)', strengths: ['5 mg', '10 mg', '20 mg'], fass: 'oxikodon' },
      { name: 'OxyContin (oxikodon depot)', strengths: ['5 mg', '10 mg', '20 mg', '40 mg', '80 mg'], fass: 'oxycontin' },
    ]
  },
  {
    class: 'Laxerande',
    graphTargets: ['gut'],
    drugs: [
      { name: 'Movicol (makrogol)', strengths: ['13,7 g påse'], fass: 'movicol' },
      { name: 'Laxido (makrogol)', strengths: ['13,7 g påse'], fass: 'laxido' },
      { name: 'Duphalac (laktulos)', strengths: ['670 mg/ml lösning'], fass: 'duphalac' },
      { name: 'Laxoberal (natriumpikosulfat)', strengths: ['5 mg tablett', '7,5 mg/ml droppar'], fass: 'laxoberal' },
      { name: 'Dulcolax (bisakodyl)', strengths: ['5 mg tablett', '10 mg suppositorium'], fass: 'dulcolax' },
    ]
  },
  {
    class: 'Bulkmedel / reglerande',
    graphTargets: ['gut'],
    drugs: [
      { name: 'Inolaxol (sterkuliagummi)', strengths: ['granulat'], fass: 'inolaxol' },
      { name: 'Vi-Siblin (psylliumfröskal)', strengths: ['3,5 g påse'], fass: 'vi-siblin' },
    ]
  },
  {
    class: 'Antidiarré',
    graphTargets: ['gut'],
    drugs: [
      { name: 'Imodium (loperamid)', strengths: ['2 mg'], fass: 'imodium' },
      { name: 'Loperamid', strengths: ['2 mg'], fass: 'loperamid' },
    ]
  },
  {
    class: 'Tarmspasm',
    graphTargets: ['gut'],
    drugs: [
      { name: 'Buscopan (butylskopolamin)', strengths: ['10 mg'], fass: 'buscopan' },
    ]
  },
  {
    class: 'Reflux / dyspepsi',
    graphTargets: ['gut'],
    drugs: [
      { name: 'Omeprazol', strengths: ['10 mg', '20 mg', '40 mg'], fass: 'omeprazol' },
      { name: 'Pantoprazol', strengths: ['20 mg', '40 mg'], fass: 'pantoprazol' },
      { name: 'Gaviscon (alginsyra)', strengths: ['oral suspension', 'tuggtablett'], fass: 'gaviscon' },
    ]
  },
]

export function fassUrl(query) {
  return `https://www.fass.se/LIF/result?query=${encodeURIComponent(query)}&userType=2`
}

export function findDrug(name) {
  for (const cls of COMMON_MEDICATIONS) {
    const drug = cls.drugs.find(d => d.name === name)
    if (drug) return { ...drug, drugClass: cls.class, graphTargets: cls.graphTargets }
  }
  return null
}

export function findDrugClass(name) {
  for (const cls of COMMON_MEDICATIONS) {
    if (cls.drugs.some(d => d.name === name)) return cls
  }
  return null
}

export function getMedGraphTargets(name) {
  const cls = findDrugClass(name)
  return cls?.graphTargets || ['bp']
}

export function searchDrugs(query) {
  if (!query || query.length < 2) return []
  const q = query.toLowerCase()
  const results = []
  for (const cls of COMMON_MEDICATIONS) {
    for (const drug of cls.drugs) {
      if (drug.name.toLowerCase().includes(q)) {
        results.push({ ...drug, drugClass: cls.class, graphTargets: cls.graphTargets })
      }
    }
  }
  return results
}
