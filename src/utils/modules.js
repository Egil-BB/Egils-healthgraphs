/**
 * All available navigation modules.
 * alwaysOn: true = always in navbar, cannot be disabled
 * defaultOn: true = enabled by default for new users
 * registerSubTab: true = shown as a subtab in Register, not in the main navbar
 */
export const ALL_MODULES = [
  {
    id: 'register',
    label: 'Registrera',
    icon: '💓',
    alwaysOn: false,
    defaultOn: true,
    registerSubTab: false,
    desc: 'Blodtryck, provsvar, vikt och levnadsvanor',
  },
  {
    id: 'graph',
    label: 'Graf',
    icon: '📈',
    alwaysOn: false,
    defaultOn: true,
    registerSubTab: false,
    desc: 'Kurvor och trender över tid',
  },
  {
    id: 'score',
    label: 'Översikt',
    icon: '📋',
    alwaysOn: false,
    defaultOn: true,
    registerSubTab: false,
    desc: 'Senaste inmatade värden per kategori',
  },
  {
    id: 'meds',
    label: 'Mediciner',
    icon: '💊',
    alwaysOn: false,
    defaultOn: true,
    registerSubTab: false,
    desc: 'Medicinlista med FASS-länkar och markering i grafer',
  },
  {
    id: 'diary',
    label: 'Tarm',
    icon: '📔',
    alwaysOn: false,
    defaultOn: false,
    registerSubTab: true,
    desc: 'Tarmdagbok med Bristolskalan (visas under Registrera)',
  },
  {
    id: 'micturition',
    label: 'Miktion',
    icon: '🫧',
    alwaysOn: false,
    defaultOn: false,
    registerSubTab: true,
    desc: 'Miktionslista för inkontinensutredning (visas under Registrera)',
  },
  {
    id: 'pain',
    label: 'Smärta',
    icon: '🩻',
    alwaysOn: false,
    defaultOn: false,
    registerSubTab: true,
    desc: 'Smärtdagbok med PEG-skala och lokalisering (visas under Registrera)',
  },
  {
    id: 'info',
    label: 'Info',
    icon: '📖',
    alwaysOn: false,
    defaultOn: true,
    registerSubTab: false,
    desc: 'Externa länkar och information om appen',
  },
]

export const DEFAULT_ENABLED_IDS = ALL_MODULES.filter(m => m.defaultOn).map(m => m.id)

// Only modules that appear in the bottom navbar (not register sub-tabs)
export function buildEnabledTabs(enabledIds) {
  return ALL_MODULES.filter(m => enabledIds.includes(m.id) && !m.registerSubTab)
}

// Modules that appear as Register sub-tabs
export function buildRegisterSubTabs(enabledIds) {
  return ALL_MODULES.filter(m => enabledIds.includes(m.id) && m.registerSubTab)
}
