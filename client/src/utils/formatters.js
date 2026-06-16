export const categoryColors = {
  urgent: 'text-apple-red',
  business: 'text-apple-blue',
  personal: 'text-apple-purple',
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
export const prayerTimeColors = {
  fajr: '#5B5BD6', sunrise: '#FF9F0A', dhuhr: '#0071E3',
  asr: '#AF52DE', maghrib: '#FF3B30', isha: '#34C759',
}
export const prayerTimeGradients = {
  fajr: 'linear-gradient(135deg, #1a1a2e, #16213e)',
  sunrise: 'linear-gradient(135deg, #f12711, #f5af19)',
  dhuhr: 'linear-gradient(135deg, #0071E3, #00C6FB)',
  asr: 'linear-gradient(135deg, #AF52DE, #5B5BD6)',
  maghrib: 'linear-gradient(135deg, #FF3B30, #FF9F0A)',
  isha: 'linear-gradient(135deg, #0f0c29, #302b63)',
}
export const PRAYER_METHODS = [
  { id: 0, name: 'Shia Ithna Ashari (Jafari)', region: 'Shia' },
  { id: 1, name: 'University of Islamic Sciences, Karachi', region: 'Hanafi' },
  { id: 2, name: 'Islamic Society of North America (ISNA)', region: 'North America' },
  { id: 3, name: 'Muslim World League (MWL)', region: 'Europe / Far East' },
  { id: 4, name: 'Umm Al-Qura University, Makkah', region: 'Arabian Peninsula' },
  { id: 5, name: 'Egyptian General Authority of Survey', region: 'Africa' },
  { id: 7, name: 'Institute of Geophysics, University of Tehran', region: 'Iran' },
  { id: 8, name: 'Gulf Region', region: 'Gulf' },
  { id: 9, name: 'Kuwait', region: 'Kuwait' },
  { id: 10, name: 'Qatar', region: 'Qatar' },
  { id: 11, name: 'Majlis Ugama Islam Singapura, Singapore', region: 'Singapore' },
  { id: 12, name: 'Union Organization islamic de France (UOIF)', region: 'France' },
  { id: 13, name: 'Diyanet İşleri Başkanlığı, Turkey (Diyanet)', region: 'Turkey' },
  { id: 14, name: 'Spiritual Administration of Muslims of Russia', region: 'Russia' },
]

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

export const motivations = [
  'Built in public. Rooted in faith. No shortcuts.',
  'The work you do today is the proof you show tomorrow.',
  'Every call you avoid is a client you hand to someone else.',
  'Discipline is the bridge between goals and results.',
  'Allah rewards the one who moves, not the one who waits.',
  'You are building the life others will wish they started at 18.',
]
