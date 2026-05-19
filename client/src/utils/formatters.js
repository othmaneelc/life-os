export function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export const categoryColors = {
  urgent: 'text-apple-red',
  business: 'text-apple-blue',
  personal: 'text-apple-purple',
}

export const categoryBadges = {
  urgent: 'badge-red',
  business: 'badge-blue',
  personal: 'badge-purple',
}

export const priorityStyles = {
  high: { badge: 'badge-red', label: 'High' },
  medium: { badge: 'badge-amber', label: 'Medium' },
  low: { badge: 'badge-gray', label: 'Low' },
}

export const tagColors = {
  CDZ: 'badge-blue',
  HVAC: 'badge-amber',
  Agency: 'badge-purple',
  Brand: 'badge-green',
  Self: 'badge-gray',
  Faith: 'badge-green',
}

export const prayerNames = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']
export const prayerLabels = {
  fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr',
  maghrib: 'Maghrib', isha: 'Isha',
}
export const prayerIcons = {
  fajr: '🌙', dhuhr: '☀️', asr: '🌤️',
  maghrib: '🌇', isha: '🌙',
}

export const moodEmojis = ['😔', '🙁', '🙂', '😊', '🔥']

export const statusLabels = {
  todo: 'To Do',
  inprogress: 'In Progress',
  done: 'Done',
}

export const statusColors = {
  todo: 'badge-gray',
  inprogress: 'badge-amber',
  done: 'badge-green',
}

export const prospectStatuses = [
  { value: 'new_lead', label: 'New Lead', color: 'badge-blue' },
  { value: 'called_no_answer', label: 'Called — No Answer', color: 'badge-amber' },
  { value: 'conversation_started', label: 'Conversation Started', color: 'badge-green' },
  { value: 'meeting_booked', label: 'Meeting Booked', color: 'badge-purple' },
  { value: 'proposal_sent', label: 'Proposal Sent', color: 'badge-amber' },
  { value: 'closed_won', label: 'Closed — Won', color: 'badge-green' },
  { value: 'closed_lost', label: 'Closed — Lost', color: 'badge-red' },
]

export const blockTypeColors = {
  Prayer: '#34C759',
  Faith: '#34C759',
  Rest: '#8E8E93',
  Training: '#FF3B30',
  Personal: '#8E8E93',
  Work: '#0071E3',
  Agency: '#FF9F0A',
  Brand: '#AF52DE',
  Learning: '#AF52DE',
  Reflection: '#AF52DE',
  Planning: '#0071E3',
}

export const motivations = [
  'Built in public. Rooted in faith. No shortcuts.',
  'The work you do today is the proof you show tomorrow.',
  'Every call you avoid is a client you hand to someone else.',
  'Discipline is the bridge between goals and results.',
  'Allah rewards the one who moves, not the one who waits.',
  'You are building the life others will wish they started at 18.',
]
