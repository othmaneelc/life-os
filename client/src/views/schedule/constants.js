export const HOURS = Array.from({ length: 18 }, (_, i) => i + 6)
export const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export const BLOCK_COLORS = {
  Work: '#5B5BD6',
  Agency: '#FF9F0A',
  Brand: '#AF52DE',
  Personal: '#8E8E93',
  Prayer: '#34C759',
  Faith: '#30D158',
  Rest: '#636366',
  Training: '#FF3B30',
  Learning: '#5856D6',
  Reflection: '#BF5AF2',
  Planning: '#5B5BD6',
}

export const viewVariants = {
  enter: { opacity: 0, y: 12, scale: 0.98 },
  center: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -12, scale: 0.98 },
}

export const DEFAULT_TEMPLATES = [
  { name: 'Deep Work', title: 'Deep Work Session', start_time: '09:00', end_time: '11:00', block_type: 'Work', color: '#5B5BD6', icon: 'zap' },
  { name: 'Meeting', title: 'Team Meeting', start_time: '14:00', end_time: '15:00', block_type: 'Work', color: '#5B5BD6', icon: 'users' },
  { name: 'Prayer Block', title: 'Prayer & Reflection', start_time: '05:30', end_time: '06:00', block_type: 'Prayer', color: '#34C759', icon: 'book' },
  { name: 'Workout', title: 'Gym Session', start_time: '17:00', end_time: '18:30', block_type: 'Training', color: '#FF3B30', icon: 'dumbbell' },
  { name: 'Learning', title: 'Study Session', start_time: '20:00', end_time: '21:00', block_type: 'Learning', color: '#5856D6', icon: 'book-open' },
]
