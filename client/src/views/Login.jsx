import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore, useLogin, useRegister } from '../store/authStore'
import { LogIn, UserPlus, Eye, EyeOff, Loader2, KeyRound, ArrowLeft } from 'lucide-react'
import { LogoIcon } from '../components/Logo'
import toast from 'react-hot-toast'

export default function Login() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [resetToken, setResetToken] = useState('')
  const [forgotStep, setForgotStep] = useState('email') // email | done
  const [sending, setSending] = useState(false)
  const [resetting, setResetting] = useState(false)

  const navigate = useNavigate()
  const error = useAuthStore(s => s.error)
  const loading = useAuthStore(s => s.loading)
  const login = useLogin()
  const register = useRegister()

  async function handleSubmit(e) {
    e.preventDefault()
    if (mode === 'register') {
      if (!username.trim()) {
        useAuthStore.getState().setError('Username is required')
        return
      }
      if (password !== confirmPassword) {
        useAuthStore.getState().setError('Passwords do not match')
        return
      }
      const res = await register.mutateAsync({ username: username.trim(), email: email.trim(), password, name: name.trim() })
      if (res && !useAuthStore.getState().error) navigate('/dashboard', { replace: true })
    } else {
      const res = await login.mutateAsync({ email: email.trim(), password })
      if (res && !useAuthStore.getState().error) navigate('/dashboard', { replace: true })
    }
  }

  async function handleForgotEmail(e) {
    e.preventDefault()
    if (!email.trim()) return toast.error('Enter your email')
    setSending(true)
    try {
      const res = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim() }) })
      const data = await res.json()
      if (data.token) {
        setResetToken(data.token)
        setForgotStep('done')
      } else {
        toast.success(data.message || 'Check your email for reset instructions')
        setForgotStep('done')
      }
    } catch { toast.error('Failed to send reset email') }
    finally { setSending(false) }
  }

  async function handleResetPassword(e) {
    e.preventDefault()
    if (password.length < 6) return toast.error('Password must be at least 6 characters')
    if (password !== confirmPassword) return toast.error('Passwords do not match')
    setResetting(true)
    try {
      const res = await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), token: resetToken, password }) })
      const data = await res.json()
      if (data.success) {
        toast.success('Password reset successfully! Sign in with your new password.')
        setForgotMode(false)
        setForgotStep('email')
        setResetToken('')
        setPassword('')
        setConfirmPassword('')
      } else {
        toast.error(data.error || 'Failed to reset password')
      }
    } catch { toast.error('Failed to reset password') }
    finally { setResetting(false) }
  }

  function toggleMode() {
    setMode(m => m === 'login' ? 'register' : 'login')
    useAuthStore.getState().setError(null)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-mesh-animated" style={{ background: 'var(--bg-primary)' }}>
      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 0.5, scale: 1 }} transition={{ duration: 1.5, ease: 'easeOut' }} className="login-orb" />
      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 0.5, scale: 1 }} transition={{ duration: 1.5, delay: 0.3, ease: 'easeOut' }} className="login-orb" />
      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 0.5, scale: 1 }} transition={{ duration: 1.5, delay: 0.6, ease: 'easeOut' }} className="login-orb" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <div className="glass-deep rounded-2xl p-8 relative" style={{ boxShadow: 'var(--shadow-card-hover)' }}>
          <div className="text-center mb-8">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
            >
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 15 }}
                className="flex items-center justify-center gap-3 mb-1"
              >
                <LogoIcon size={36} animate />
                <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Life <span className="gradient-text">OS</span></h1>
              </motion.div>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                {mode === 'login' ? 'Welcome back' : 'Create your account'}
              </p>
            </motion.div>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 px-4 py-2.5 rounded-lg text-sm font-medium"
                style={{ background: 'rgba(255,59,48,0.1)', color: 'var(--danger)', border: '1px solid rgba(255,59,48,0.2)' }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {forgotMode ? (
            <form onSubmit={forgotStep === 'email' ? handleForgotEmail : handleResetPassword} className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <button type="button" onClick={() => { setForgotMode(false); setForgotStep('email'); setResetToken('') }} className="p-1 rounded-lg hover:bg-[var(--bg-surface)] transition-colors" style={{ color: 'var(--text-muted)' }} aria-label="Back to login">
                  <ArrowLeft size={16} />
                </button>
                <span className="text-body font-medium" style={{ color: 'var(--text-primary)' }}>Reset Password</span>
              </div>
              {forgotStep === 'email' ? (
                <>
                  <p className="text-small mb-3" style={{ color: 'var(--text-muted)' }}>Enter your email and we'll generate a reset token for you.</p>
                  <div>
                    <label htmlFor="login-forgot-email" className="section-label block mb-1.5">Email</label>
                    <input id="login-forgot-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="input-field" required />
                  </div>
                  <motion.button type="submit" disabled={sending} whileTap={{ scale: 0.98 }} className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
                    {sending ? <Loader2 size={18} className="animate-spin" /> : <KeyRound size={18} />}
                    {sending ? 'Sending...' : 'Send Reset Token'}
                  </motion.button>
                </>
              ) : (
                <>
                  <p className="text-small mb-3" style={{ color: 'var(--text-muted)' }}>Your reset token has been generated. Enter your new password below.</p>
                  <div className="p-2.5 rounded-lg text-micro font-mono break-all mb-2" style={{ background: 'var(--bg-surface)', color: 'var(--accent)', border: '1px solid var(--border-color)' }}>{resetToken}</div>
                  <div>
                    <label htmlFor="login-reset-password" className="section-label block mb-1.5">New Password</label>
                    <div className="relative">
                      <input id="login-reset-password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="input-field pr-10" minLength={6} required />
                      <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="login-reset-confirm" className="section-label block mb-1.5">Confirm Password</label>
                    <div className="relative">
                      <input id="login-reset-confirm" type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" className="input-field pr-10" required />
                      <button type="button" onClick={() => setShowConfirm(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}>{showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                    </div>
                  </div>
                  <motion.button type="submit" disabled={resetting} whileTap={{ scale: 0.98 }} className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
                    {resetting ? <Loader2 size={18} className="animate-spin" /> : <KeyRound size={18} />}
                    {resetting ? 'Resetting...' : 'Reset Password'}
                  </motion.button>
                </>
              )}
            </form>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {mode === 'register' && (
                <motion.div
                  key="username-field"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <label htmlFor="login-username" className="section-label block mb-1.5">Username</label>
                  <input
                    id="login-username"
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="your_username"
                    className="input-field"
                    autoComplete="username"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label htmlFor="login-email" className="section-label block mb-1.5">Email</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input-field"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label htmlFor="login-password" className="section-label block mb-1.5">Password</label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pr-10"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-tertiary)' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {mode === 'login' && (
                <button type="button" onClick={() => { setForgotMode(true); useAuthStore.getState().setError(null) }} className="text-xs mt-1.5 transition-colors" style={{ color: 'var(--text-tertiary)' }}>
                  Forgot password?
                </button>
              )}
            </div>

            <AnimatePresence mode="wait">
              {mode === 'register' && (
                <motion.div
                  key="register-fields"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div>
                    <label htmlFor="login-confirm-password" className="section-label block mb-1.5">Confirm Password</label>
                    <div className="relative">
                      <input
                        id="login-confirm-password"
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="input-field pr-10"
                        autoComplete="new-password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="login-display-name" className="section-label block mb-1.5">Display Name</label>
                    <input
                      id="login-display-name"
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Your full name"
                      className="input-field"
                      autoComplete="name"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.98 }}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : mode === 'login' ? (
                <LogIn size={18} />
              ) : (
                <UserPlus size={18} />
              )}
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </motion.button>
          </form>
          )}

          <div className="mt-6 text-center">
            {!forgotMode && (
            <button
              type="button"
              onClick={toggleMode}
              className="text-sm font-medium transition-colors"
              style={{ color: 'var(--accent)' }}
            >
              {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
            )}
          </div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
          className="text-center mt-6 text-xs"
          style={{ color: 'var(--text-tertiary)' }}
        >
          Your personal Life OS dashboard
        </motion.p>
      </motion.div>

      <p className="fixed bottom-4 left-0 right-0 text-center text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
        v2.0 — Built in public. Rooted in faith. No shortcuts.
      </p>
    </div>
  )
}
