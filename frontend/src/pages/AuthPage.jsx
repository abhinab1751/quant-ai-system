import { useEffect, useState } from 'react'
import { C, FONTS, RADIUS } from '../components/theme'
import { ThemeToggle } from '../components/ThemeToggle'
import candleStickLogo from '../assets/candleStick.png'

const API = '/api'

async function parseResponseBody(res) {
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) return res.json().catch(() => null)
  const text = await res.text().catch(() => '')
  if (!text) return null
  try { return JSON.parse(text) } catch { return { detail: text } }
}

function GoogleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function TwitterXIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  )
}

function OrDivider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
      <div style={{ flex: 1, height: 1, background: C.border }} />
      <span style={{ fontSize: 12, color: C.text3, fontWeight: 500 }}>or continue with</span>
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  )
}

function SocialButton({ icon, label, onClick, disabled }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            10,
        width:          '100%',
        padding:        '10px 16px',
        background:     hovered ? C.inputBg : C.cardBg,
        border:         `1.5px solid ${hovered ? C.blue : C.border}`,
        borderRadius:   RADIUS.md,
        color:          C.text1,
        fontSize:       14,
        fontWeight:     600,
        cursor:         disabled ? 'not-allowed' : 'pointer',
        fontFamily:     FONTS.sans,
        transition:     'all 0.15s',
        opacity:        disabled ? 0.5 : 1,
      }}
    >
      {icon}
      {label}
    </button>
  )
}

function Field({ label, type = 'text', value, onChange, placeholder, error, autoFocus, hint }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: C.text2, letterSpacing: '0.03em' }}>
        {label}
      </label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} autoFocus={autoFocus}
        autoComplete={type === 'password' ? 'current-password' : 'off'}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          background:   C.inputBg,
          border:       `1.5px solid ${error ? C.red : focused ? C.blue : C.border}`,
          borderRadius: RADIUS.md, padding: '10px 14px',
          fontSize: 14, color: C.text0, fontFamily: FONTS.sans, outline: 'none',
          transition: 'border-color 0.15s',
          boxShadow:  focused && !error ? `0 0 0 3px ${C.blue}18` : 'none',
        }}
      />
      {error  && <span style={{ fontSize: 11, color: C.red }}>{error}</span>}
      {hint && !error && <span style={{ fontSize: 11, color: C.text3 }}>{hint}</span>}
    </div>
  )
}

function PasswordField({ label, value, onChange, error, hint, autoComplete = 'current-password' }) {
  const [show, setShow]       = useState(false)
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: C.text2, letterSpacing: '0.03em' }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'} value={value}
          onChange={e => onChange(e.target.value)} placeholder="••••••••"
          autoComplete={autoComplete}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width: '100%', background: C.inputBg,
            border: `1.5px solid ${error ? C.red : focused ? C.blue : C.border}`,
            borderRadius: RADIUS.md, padding: '10px 40px 10px 14px',
            fontSize: 14, color: C.text0, fontFamily: FONTS.sans, outline: 'none',
            boxShadow: focused && !error ? `0 0 0 3px ${C.blue}18` : 'none',
          }}
        />
        <button type="button" onClick={() => setShow(v => !v)} style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', color: C.text3, cursor: 'pointer', fontSize: 12, padding: 4,
        }}>{show ? '🙈' : '👁'}</button>
      </div>
      {error  && <span style={{ fontSize: 11, color: C.red }}>{error}</span>}
      {hint && !error && <span style={{ fontSize: 11, color: C.text3 }}>{hint}</span>}
    </div>
  )
}

function PasswordStrength({ password }) {
  const checks = [password.length >= 8, /[A-Z]/.test(password), /[0-9]/.test(password), /[^A-Za-z0-9]/.test(password)]
  const score  = checks.filter(Boolean).length
  const labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong']
  const colors = [C.red, C.red, C.amber, C.amber, C.green]
  return (
    <div>
      <div style={{ display: 'flex', gap: 3, marginBottom: 5 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= score ? colors[score] : C.border, transition: 'background 0.3s' }} />
        ))}
      </div>
      <span style={{ fontSize: 11, color: colors[score], fontWeight: 600 }}>{labels[score]}</span>
    </div>
  )
}

function LoginForm({ onSuccess, onSwitch, providers }) {
  const [cred,     setCred]     = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!cred.trim() || !password) { setError('Please fill in all fields.'); return }
    setLoading(true); setError('')
    try {
      const res  = await fetch(`${API}/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email_or_username: cred.trim(), password }),
      })
      const data = await parseResponseBody(res)
      if (!res.ok) throw new Error(data?.detail || 'Login failed')
      localStorage.setItem('qai_access',  data.access_token)
      localStorage.setItem('qai_refresh', data.refresh_token)
      localStorage.setItem('qai_user',    JSON.stringify(data.user))
      onSuccess(data.user)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const oauthStart = (provider) => {
    window.location.href = `${API}/auth/oauth/${provider}`
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Field label="Email or username" value={cred} onChange={setCred} placeholder="you@example.com" autoFocus />
      <PasswordField label="Password" value={password} onChange={setPassword} autoComplete="current-password" />

      {error && (
        <div style={{ background: C.redBg, border: `1px solid ${C.red}40`, borderRadius: RADIUS.md, padding: '10px 14px', fontSize: 13, color: C.red }}>
          {error}
        </div>
      )}

      <button type="submit" disabled={loading} style={{
        background: loading ? C.inputBg : C.blue, border: 'none', borderRadius: RADIUS.md,
        color: loading ? C.text3 : '#fff', padding: '12px', fontSize: 14, fontWeight: 700,
        cursor: loading ? 'not-allowed' : 'pointer', fontFamily: FONTS.sans,
        boxShadow: loading ? 'none' : `0 4px 16px ${C.blue}40`, transition: 'all 0.2s',
      }}>
        {loading ? 'Signing in…' : 'Sign in'}
      </button>

      {/* OAuth */}
      {(providers.google || providers.twitter) && (
        <>
          <OrDivider />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {providers.google && (
              <SocialButton
                icon={<GoogleIcon />}
                label="Continue with Google"
                onClick={() => oauthStart('google')}
              />
            )}
            {providers.twitter && (
              <SocialButton
                icon={<TwitterXIcon />}
                label="Continue with X (Twitter)"
                onClick={() => oauthStart('twitter')}
              />
            )}
          </div>
        </>
      )}

      <p style={{ textAlign: 'center', fontSize: 13, color: C.text2, marginTop: 4 }}>
        Don't have an account?{' '}
        <button type="button" onClick={onSwitch} style={{
          background: 'none', border: 'none', color: C.blue, fontWeight: 700,
          cursor: 'pointer', fontSize: 13, fontFamily: FONTS.sans,
        }}>Sign up free</button>
      </p>
    </form>
  )
}

function SignupForm({ onSuccess, onSwitch, providers }) {
  const [fields,   setFields]   = useState({ email: '', username: '', fullName: '', password: '', confirm: '' })
  const [errors,   setErrors]   = useState({})
  const [loading,  setLoading]  = useState(false)
  const [apiError, setApiError] = useState('')

  const set = (k) => (v) => setFields(f => ({ ...f, [k]: v }))

  const validate = () => {
    const e = {}
    if (!fields.email.includes('@'))        e.email    = 'Enter a valid email address.'
    if (fields.username.length < 3)         e.username = 'At least 3 characters.'
    if (!/^[a-zA-Z0-9_]+$/.test(fields.username)) e.username = 'Letters, numbers, underscores only.'
    if (fields.password.length < 8)         e.password = 'At least 8 characters.'
    if (fields.password !== fields.confirm) e.confirm  = 'Passwords do not match.'
    return e
  }

  const submit = async (e) => {
    e.preventDefault()
    const errs = validate(); setErrors(errs)
    if (Object.keys(errs).length) return
    setLoading(true); setApiError('')
    try {
      const res  = await fetch(`${API}/auth/signup`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: fields.email.trim(), username: fields.username.trim(), password: fields.password, full_name: fields.fullName.trim() }),
      })
      const data = await parseResponseBody(res)
      if (!res.ok) throw new Error(data?.detail || 'Signup failed')
      localStorage.setItem('qai_access',  data.access_token)
      localStorage.setItem('qai_refresh', data.refresh_token)
      localStorage.setItem('qai_user',    JSON.stringify(data.user))
      onSuccess(data.user)
    } catch (e) {
      setApiError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const oauthStart = (provider) => {
    window.location.href = `${API}/auth/oauth/${provider}`
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Email" type="email" value={fields.email} onChange={set('email')} placeholder="you@example.com" error={errors.email} autoFocus />
        <Field label="Username" value={fields.username} onChange={set('username')} placeholder="trader123" error={errors.username} hint="Letters, numbers, _" />
      </div>
      <Field label="Full name (optional)" value={fields.fullName} onChange={set('fullName')} placeholder="Jane Smith" />
      <PasswordField label="Password" value={fields.password} onChange={set('password')} error={errors.password} hint="Minimum 8 characters" autoComplete="new-password" />
      <PasswordField label="Confirm password" value={fields.confirm} onChange={set('confirm')} error={errors.confirm} autoComplete="new-password" />
      {fields.password && <PasswordStrength password={fields.password} />}

      {apiError && (
        <div style={{ background: C.redBg, border: `1px solid ${C.red}40`, borderRadius: RADIUS.md, padding: '10px 14px', fontSize: 13, color: C.red }}>
          {apiError}
        </div>
      )}

      <button type="submit" disabled={loading} style={{
        background: loading ? C.inputBg : C.blue, border: 'none', borderRadius: RADIUS.md,
        color: loading ? C.text3 : '#fff', padding: '12px', fontSize: 14, fontWeight: 700,
        cursor: loading ? 'not-allowed' : 'pointer', fontFamily: FONTS.sans,
        boxShadow: loading ? 'none' : `0 4px 16px ${C.blue}40`, transition: 'all 0.2s', marginTop: 4,
      }}>
        {loading ? 'Creating account…' : 'Create account'}
      </button>

      {/* OAuth */}
      {(providers.google || providers.twitter) && (
        <>
          <OrDivider />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {providers.google && (
              <SocialButton
                icon={<GoogleIcon />}
                label="Sign up with Google"
                onClick={() => oauthStart('google')}
              />
            )}
            {providers.twitter && (
              <SocialButton
                icon={<TwitterXIcon />}
                label="Sign up with X (Twitter)"
                onClick={() => oauthStart('twitter')}
              />
            )}
          </div>
        </>
      )}

      <p style={{ textAlign: 'center', fontSize: 13, color: C.text2 }}>
        Already have an account?{' '}
        <button type="button" onClick={onSwitch} style={{
          background: 'none', border: 'none', color: C.blue,
          fontWeight: 700, cursor: 'pointer', fontSize: 13, fontFamily: FONTS.sans,
        }}>Sign in</button>
      </p>
    </form>
  )
}


export default function AuthPage({ onSuccess, onBack, isDark, onToggle, initialMode = 'login' }) {
  const [mode, setMode]           = useState(initialMode === 'signup' ? 'signup' : 'login')
  const [providers, setProviders] = useState({ google: false, twitter: false })

  useEffect(() => {
    setMode(initialMode === 'signup' ? 'signup' : 'login')
  }, [initialMode])

  useEffect(() => {
    window.scrollTo(0, 0)
    fetch(`${API}/auth/oauth/providers`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setProviders(d) })
      .catch(() => {})
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: C.pageBg, display: 'flex', flexDirection: 'column', fontFamily: FONTS.sans }}>
      {/* Top bar */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 24px', background: C.headerBg, borderBottom: `1px solid ${C.border}`, boxShadow: C.shadow,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {onBack && (
            <button type="button" onClick={onBack} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: C.inputBg, border: `1px solid ${C.border}`,
              borderRadius: RADIUS.md, color: C.text1,
              padding: '7px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONTS.sans,
            }}>← Back</button>
          )}
          <img src={candleStickLogo} alt="QuantAI" style={{ width: 32, height: 32, objectFit: 'contain' }} />
          <span style={{ fontSize: 18, fontWeight: 800, color: C.text0, letterSpacing: '-0.03em' }}>
            Quant<span style={{ color: C.blue }}>AI</span>
          </span>
        </div>
        <ThemeToggle isDark={isDark} onToggle={onToggle} />
      </header>

      {/* Centre */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
        <div style={{ width: '100%', maxWidth: 440 }}>

          {/* Hero */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: C.text0, letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 8 }}>
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p style={{ fontSize: 14, color: C.text2 }}>
              {mode === 'login'
                ? 'Sign in to access your trading dashboard'
                : 'Start trading smarter with AI-powered insights'}
            </p>
          </div>

          {/* Card */}
          <div style={{
            background: C.cardBg, border: `1px solid ${C.border}`,
            borderRadius: RADIUS.xl, padding: '28px 28px 24px', boxShadow: C.shadowLg,
          }}>
            {mode === 'login'
              ? <LoginForm  onSuccess={onSuccess} onSwitch={() => setMode('signup')} providers={providers} />
              : <SignupForm onSuccess={onSuccess} onSwitch={() => setMode('login')}  providers={providers} />
            }
          </div>

          <p style={{ textAlign: 'center', marginTop: 18, fontSize: 12, color: C.text3 }}>
            By using QuantAI you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  )
}