import { create } from 'zustand'
import toast from 'react-hot-toast'

const API = '/api/ai'

export const useAIStore = create((set, get) => ({
  messages: [],
  sessionId: null,
  loading: false,
  suggestions: [],
  analysis: null,
  briefing: null,
  briefingLoading: false,
  isOpen: false,
  isListening: false,

  setOpen: (open) => set({ isOpen: open }),

  sendMessage: async (message, view) => {
    if (!message.trim() || get().loading) return
    const history = get().messages.slice(-6)
    set(state => ({
      messages: [...state.messages, { role: 'user', content: message.trim() }],
      loading: true,
    }))

    try {
      const res = await fetch(API + '/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          view,
          sessionId: get().sessionId,
          history,
        }),
      })
      const data = await res.json()

      if (data.error) {
        if (data.needsKey) {
          set(state => ({
            messages: [...state.messages, {
              role: 'assistant',
              content: `I need a free API key to work.\n\n1. Go to groq.com (free, no credit card)\n2. Sign up and copy your API key\n3. Paste it in Settings > AI Assistant\n\nGroq uses Llama 3.3 70B — fast and completely free.`,
            }],
            loading: false,
          }))
        } else {
          toast.error(data.error)
          set({ loading: false })
        }
        return
      }

      set({
        messages: [...get().messages, { role: 'assistant', content: data.reply }],
        sessionId: data.sessionId,
        suggestions: data.suggestions || [],
        loading: false,
      })

      // Check for actions in reply
      const actionMatch = data.reply.match(/\[ACTION:(\w+):([^\]]+)\]/)
      if (actionMatch) {
        const [, action, paramsStr] = actionMatch
        const params = Object.fromEntries(paramsStr.split('|').map(p => p.split('=')))
        await get().executeAction(action, params)
      }
    } catch {
      set({ loading: false })
      toast.error('AI request failed')
    }
  },

  executeAction: async (action, params) => {
    try {
      const res = await fetch(API + '/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, params }),
      })
      const data = await res.json()
      if (data.success) {
        const labels = {
          create_task: `Created task: ${params.title}`,
          delete_task: 'Task deleted',
          toggle_habit: 'Habit toggled',
          add_journal_entry: 'Journal entry added',
        }
        toast.success(labels[action] || 'Action completed')
        set({
          messages: [...get().messages, {
            role: 'assistant',
            content: `Done — ${labels[action] || 'action completed'}.`,
            isAction: true,
          }],
        })
      }
    } catch {}
  },

  getBriefing: async (view) => {
    set({ briefingLoading: true })
    try {
      const res = await fetch(API + '/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ view }),
      })
      const data = await res.json()
      if (data.error) { toast.error(data.error); set({ briefingLoading: false }); return }
      set({ briefing: data.briefing, briefingLoading: false })
    } catch {
      set({ briefingLoading: false })
      toast.error('Briefing failed')
    }
  },

  getSuggestions: async (view) => {
    try {
      const res = await fetch(API + '/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ view }),
      })
      const data = await res.json()
      set({ suggestions: data.suggestions || [] })
    } catch {}
  },

  prioritize: async () => {
    set({ loading: true })
    try {
      const res = await fetch(API + '/prioritize', { method: 'POST' })
      const data = await res.json()
      if (data.error) { toast.error(data.error); set({ loading: false }); return null }
      set({ loading: false })
      return data.tasks
    } catch { set({ loading: false }); toast.error('Failed to prioritize'); return null }
  },

  analyzeMood: async () => {
    set({ loading: true })
    try {
      const res = await fetch(API + '/analyze-mood', { method: 'POST' })
      const data = await res.json()
      set({ analysis: data.analysis, loading: false })
    } catch { set({ loading: false }); toast.error('Analysis failed') }
  },

  startListening: () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Voice input not supported in this browser')
      return
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      set({ isListening: false })
      get().sendMessage(transcript)
    }
    recognition.onerror = () => {
      set({ isListening: false })
      toast.error('Voice recognition failed')
    }
    recognition.onend = () => set({ isListening: false })

    recognition.start()
    set({ isListening: true })
  },

  stopListening: () => set({ isListening: false }),

  clearChat: () => set({ messages: [], sessionId: null, suggestions: [] }),
}))
