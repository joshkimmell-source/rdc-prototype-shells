/**
 * Seed data ported verbatim from ContentOrchestrationShell.dc.html.
 * Georgia Booth, buyer's agent in Austin, TX. "Today" in the prototype is Tue Jul 21, 2026.
 */

export type TagColor =
  | 'blueSubtle'
  | 'greenSubtle'
  | 'orangeSubtle'
  | 'graySubtle'
  | 'purpleSubtle'

export interface Client {
  id: string
  name: string
  initials: string
  stage: string
  budget: string
  looking: string
  financing: string
  lastActivity: string
  saved: number
  nextTour: string
}

export interface Listing {
  address: string
  meta: string
  hood: string
}

export interface Buyer {
  id: string
  name: string
  initials: string
  sub: string
  online?: boolean
}

export interface TourListItem {
  id: string
  name: string
  initials: string
  meta: string
  upcoming: boolean
}

export interface UpcomingTour {
  when: string
  address: string
  client: string
  type: string
}

export interface Thread {
  title: string
  when: string
}

export const CLIENTS: Client[] = [
  {
    id: 'maya',
    name: 'Maya Chen',
    initials: 'MC',
    stage: 'Actively touring',
    budget: '$550K–$650K',
    looking: '3 bd · 2 ba in East Austin with a home office',
    financing: 'Pre-approved to $640K',
    lastActivity: 'Viewed 3 homes today',
    saved: 12,
    nextTour: '—',
  },
  {
    id: 'sofia',
    name: 'Sofia Reyes',
    initials: 'SR',
    stage: 'Making offers',
    budget: '$700K–$800K',
    looking: '4 bd in Mueller, move-in ready',
    financing: 'Pre-approved to $790K',
    lastActivity: 'Offer pending · 2204 Vaughn St',
    saved: 8,
    nextTour: '—',
  },
  {
    id: 'devon',
    name: 'Devon Park',
    initials: 'DP',
    stage: 'New lead',
    budget: '$400K–$475K',
    looking: 'Downtown condo, low HOA, walkable',
    financing: 'Not pre-approved yet',
    lastActivity: 'Signed up 2 days ago',
    saved: 3,
    nextTour: '—',
  },
  {
    id: 'nair',
    name: 'James & Priya Nair',
    initials: 'JP',
    stage: 'Nurturing',
    budget: '$500K–$575K',
    looking: 'Round Rock ISD, ~6-month timeline',
    financing: 'Pre-approval expired',
    lastActivity: 'Opened your newsletter Tue',
    saved: 5,
    nextTour: '—',
  },
  {
    id: 'grace',
    name: 'Grace Okafor',
    initials: 'GO',
    stage: 'Under contract',
    budget: '$525,000',
    looking: '1310 Larkspur Dr · closing Aug 14',
    financing: 'Cleared to close',
    lastActivity: 'Inspection passed Friday',
    saved: 0,
    nextTour: '—',
  },
]

export const LISTINGS: Listing[] = [
  { address: '42 Birchwood Ln', meta: '$612,000 · 3 bd · 2 ba · 1,840 sqft', hood: 'East Austin' },
  { address: '1108 Poppy Ct', meta: '$589,900 · 3 bd · 2 ba · 1,720 sqft', hood: 'Govalle' },
  { address: '2811 Fernhill Dr', meta: '$634,500 · 3 bd · 2.5 ba · 2,010 sqft', hood: 'Cherrywood' },
  { address: '2204 Vaughn St', meta: '$749,000 · 4 bd · 3 ba · 2,380 sqft', hood: 'Mueller' },
]

/**
 * Stage → Tag colour. The DC file used the legacy `styleType: '<color>-subtle'` API;
 * Haven v4 takes a camelCase `dataColor`.
 */
export const TAGC: Record<string, TagColor> = {
  'New lead': 'blueSubtle',
  'Actively touring': 'greenSubtle',
  'Making offers': 'orangeSubtle',
  Nurturing: 'graySubtle',
  'Under contract': 'purpleSubtle',
}

export const THREADS: Thread[] = [
  { title: 'Tour plan for Maya Chen', when: 'Monday' },
  { title: 'Mueller comps for Sofia', when: 'Last week' },
  { title: 'Welcome email for Devon', when: 'Last week' },
]

export const BUYERS: Buyer[] = [
  { id: 'georgia', name: 'Georgia Booth', initials: 'GB', sub: 'Your personal feed', online: true },
  { id: 'jessica', name: 'Jessica Lin and Dave Firenze', initials: 'JD', sub: 'Last seen now', online: true },
  { id: 'jim', name: 'Jim Nunchousen', initials: 'JN', sub: 'Last seen now' },
  { id: 'laura', name: 'Laura Kim', initials: 'LK', sub: 'Last seen now' },
  { id: 'jo', name: 'Jo Frost', initials: 'JF', sub: 'Last seen now' },
  { id: 'heatherjorge', name: 'Heather Lee and Jorge Ramos', initials: 'HJ', sub: 'Last seen now' },
  { id: 'mike', name: 'Mike Pantages', initials: 'MP', sub: 'Last seen now' },
  { id: 'heather', name: 'Heather Lee', initials: 'HL', sub: 'Last seen now' },
  { id: 'steven', name: 'Steven Robles', initials: 'SR', sub: 'Last seen now' },
]

export const TOURS: TourListItem[] = [
  { id: 'josh', name: 'Josh Kimmell', initials: 'JK', meta: 'Sat, Aug 1 | 3 Stops', upcoming: true },
  { id: 'maya', name: 'Maya Chen', initials: 'MC', meta: 'Sat, Jul 18 | 4 Stops', upcoming: false },
  { id: 'sofia', name: 'Sofia Reyes', initials: 'SR', meta: 'Sun, Jul 12 | 2 Stops', upcoming: false },
  { id: 'jim', name: 'Jim Nunchousen', initials: 'JN', meta: 'Sat, Jun 27 | 3 Stops', upcoming: false },
]

export const INITIAL_UPCOMING_TOURS: UpcomingTour[] = [
  {
    when: 'Sat Aug 1',
    address: '8232 Tanforan Ct +2 stops',
    client: 'Josh Kimmell',
    type: 'Buyer tour · 3 stops',
  },
]

export const STAGES: Array<[string, string]> = [
  ['all', 'All clients'],
  ['New lead', 'New leads'],
  ['Actively touring', 'Actively touring'],
  ['Making offers', 'Making offers'],
  ['Nurturing', 'Nurturing'],
  ['Under contract', 'Under contract'],
]

export const CLIENT_PILLS: Array<[string, string]> = [
  ['active', 'Active (4)'],
  ['price', 'Price change (0)'],
  ['contingent', 'Contingent/Pending (2)'],
  ['open', 'Open houses (1)'],
  ['chat', 'Chat list'],
]

export const CHIPS: string[] = [
  'What is Maya looking for?',
  'Set up a tour for Maya at 42 Birchwood Ln on Saturday morning',
  'Who needs a follow-up this week?',
  'How does Sofia’s offer stack up in Mueller?',
]

export const MENU_ITEMS: string[] = [
  'Export client list',
  'Import contacts',
  'Manage stages',
  'Settings',
]
