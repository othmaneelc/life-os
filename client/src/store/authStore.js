import { useEffect } from 'react'
import { createWithEqualityFn } from 'zustand/traditional'
import { useMutation, useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'

const API = '/api/auth'

function getStoredToken() {
  try { return localStorage.getItem('lifeos-token') } catch { return null }
}

export const useAuthStore = createWithEqualityFn((set) => ({
  user: null,
  token: getStoredToken(),
  loading: !!getStoredToken(),
  error: null,

  logout: () => {
    localStorage.removeItem('lifeos-token')
    window.location.href = '/login'
  },

  setError: (error) => set({ error }),
  setToken: (token) => set({ token }),
  setLoading: (loading) => set({ loading }),
  setUser: (user) => set({ user }),
}), Object.is)

export const useLogin = () => {
  const store = useAuthStore
  return useMutation({
    mutationFn: async ({ email, password }) => {
      const res = await fetch(API + '/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const text = await res.text()
        let msg
        try { const j = JSON.parse(text); msg = j.error } catch { msg = text || `Server error ${res.status}` }
        throw new Error(msg)
      }
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      return data
    },
    onSuccess: (data) => {
      localStorage.setItem('lifeos-token', data.token)
      store.setState({ user: data.user, token: data.token, loading: false, error: null })
      toast.success('Welcome back!')
    },
    onError: (err) => {
      store.setState({ error: err.message, loading: false })
    },
  })
}

export const useRegister = () => {
  const store = useAuthStore
  return useMutation({
    mutationFn: async ({ username, email, password, name }) => {
      const res = await fetch(API + '/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, name }),
      })
      if (!res.ok) {
        const text = await res.text()
        let msg
        try { const j = JSON.parse(text); msg = j.error } catch { msg = text || `Server error ${res.status}` }
        throw new Error(msg)
      }
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      return data
    },
    onSuccess: (data) => {
      localStorage.setItem('lifeos-token', data.token)
      store.setState({ user: data.user, token: data.token, loading: false, error: null })
      toast.success('Account created! Welcome to Life OS.')
    },
    onError: (err) => {
      store.setState({ error: err.message, loading: false })
    },
  })
}

export const useLoadUser = () => {
  const store = useAuthStore
  const token = getStoredToken()
  const query = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const res = await fetch(API + '/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        localStorage.removeItem('lifeos-token')
        store.setState({ token: null, loading: false })
        return null
      }
      const text = await res.text()
      if (!text) return null
      const data = JSON.parse(text)
      return data.user || data
    },
    staleTime: Infinity,
    retry: false,
    enabled: !!token,
  })
  useEffect(() => {
    if (!query.isLoading && !query.isFetching) {
      store.setState({ loading: false })
      if (query.data) store.setState({ user: query.data })
    }
  }, [query.isLoading, query.isFetching, query.data])
  return query
}
