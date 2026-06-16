export function extractArray(data) {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && Array.isArray(data.value)) return data.value
  return data
}
