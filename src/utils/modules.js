/**
 * All available navigation modules.
 * alwaysOn: true = always in navbar, cannot be disabled
 * defaultOn: true = enabled by default for new users
 */
export const ALL_MODULES = [
  {
    id: 'register',
    label: 'Registrera',
    icon: '💓',
    alwaysOn: true,
    defaultOn: true,
    desc: 'Blodtryck, provsvar, vikt och levnadsvanor',
  },
  {
    id: 'graph',
    label: 'Graf',
    icon: '📈',
    alwaysOn: true,
    defaultOn: true,
    desc: 'Kurvor och trender över tid',
  },
  {
    id: 'score',
    label: 'Risk',
    icon: '🎯',
    alwaysOn: true,
    defaultOn: true,
    desc: 'SCORE2 kardiovaskulär 10-årsrisk och BMI',
  },
  {
    id: 'meds',
    label: 'Mediciner',
    icon: '💊',
    alwaysOn: false,
    defaultOn: true,
    desc: 'Medicinlista med FASS-länkar och markering i grafer',
  },
  {
    id: 'diary',
    label: 'Dagbok',
    icon: '📔',
    alwaysOn: false,
    defaultOn: false,
    desc: 'Tarmdagbok med Bristolskalan',
  },
  {
    id: 'info',
    label: 'Info',
    icon: '📖',
    alwaysOn: false,
    defaultOn: true,
    desc: 'Hälsoinformation och kunskapsbank',
  },
]

export const DEFAULT_ENABLED_IDS = ALL_MODULES.filter(m => m.defaultOn).map(m => m.id)

export function buildEnabledTabs(enabledIds) {
  return ALL_MODULES.filter(m => m.alwaysOn || enabledIds.includes(m.id))
}
