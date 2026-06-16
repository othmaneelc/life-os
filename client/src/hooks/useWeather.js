import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'

const WMO_CODES = {
  0: { label: 'Clear', icon: 'sun' },
  1: { label: 'Mainly Clear', icon: 'sun' },
  2: { label: 'Partly Cloudy', icon: 'cloud-sun' },
  3: { label: 'Overcast', icon: 'cloud' },
  45: { label: 'Foggy', icon: 'fog' },
  48: { label: 'Fog', icon: 'fog' },
  51: { label: 'Light Drizzle', icon: 'drizzle' },
  53: { label: 'Drizzle', icon: 'drizzle' },
  55: { label: 'Heavy Drizzle', icon: 'drizzle' },
  56: { label: 'Freezing Drizzle', icon: 'drizzle' },
  57: { label: 'Freezing Drizzle', icon: 'drizzle' },
  61: { label: 'Light Rain', icon: 'rain' },
  63: { label: 'Rain', icon: 'rain' },
  65: { label: 'Heavy Rain', icon: 'rain-heavy' },
  66: { label: 'Freezing Rain', icon: 'rain' },
  67: { label: 'Freezing Rain', icon: 'rain' },
  71: { label: 'Light Snow', icon: 'snow' },
  73: { label: 'Snow', icon: 'snow' },
  75: { label: 'Heavy Snow', icon: 'snow' },
  77: { label: 'Snow Grains', icon: 'snow' },
  80: { label: 'Rain Showers', icon: 'rain' },
  81: { label: 'Rain Showers', icon: 'rain' },
  82: { label: 'Violent Showers', icon: 'rain-heavy' },
  85: { label: 'Snow Showers', icon: 'snow' },
  86: { label: 'Snow Showers', icon: 'snow' },
  95: { label: 'Thunderstorm', icon: 'thunderstorm' },
  96: { label: 'Thunderstorm', icon: 'thunderstorm' },
  99: { label: 'Severe Storm', icon: 'thunderstorm' },
}

const DEFAULT_LOCATION = { lat: 31.7917, lon: -7.0926, name: 'Default' }



async function fetchWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat, longitude: lon,
    current: 'temperature_2m,apparent_temperature,weather_code,relative_humidity_2m,wind_speed_10m',
    daily: 'temperature_2m_max,temperature_2m_min,weather_code',
    timezone: 'auto',
  })
  const res = await fetch('https://api.open-meteo.com/v1/forecast?' + params.toString())
  if (!res.ok) throw new Error('Weather fetch failed')
  const data = await res.json()
  const code = data.current.weather_code
  const condition = WMO_CODES[code] || { label: 'Unknown', icon: 'cloud' }
  return {
    temp: Math.round(data.current.temperature_2m),
    feelsLike: Math.round(data.current.apparent_temperature),
    humidity: data.current.relative_humidity_2m,
    wind: Math.round(data.current.wind_speed_10m),
    condition: condition.label,
    icon: condition.icon,
    code,
    high: Math.round(data.daily.temperature_2m_max[0]),
    low: Math.round(data.daily.temperature_2m_min[0]),
    forecastCode: data.daily.weather_code[0],
  }
}

export function useWeather() {
  const [location, setLocation] = useState(null)
  const [geoStatus, setGeoStatus] = useState('idle')

  useEffect(() => {
    let cancelled = false
    async function resolve() {
      try {
        const geo = await new Promise((resolve) => {
          if (!navigator.geolocation) return resolve(null)
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, name: 'Your Location' }),
            () => resolve(null),
            { timeout: 5000, maximumAge: 300000 }
          )
        })
        if (cancelled) return
        if (geo) {
          setGeoStatus('resolved')
          setLocation(geo)
          return
        }
        setGeoStatus('fallback')
        if (!cancelled) setLocation(DEFAULT_LOCATION)
      } catch {
        if (!cancelled) { setGeoStatus('fallback'); setLocation(DEFAULT_LOCATION) }
      }
    }
    resolve()
    return () => { cancelled = true }
  }, [])

  const query = useQuery({
    queryKey: ['weather', location?.lat, location?.lon],
    queryFn: () => fetchWeather(location.lat, location.lon),
    enabled: !!location,
    staleTime: 10 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
    retry: 2,
  })

  return { ...query, location, geoStatus }
}
