import { useState } from 'react'
import { C, FONTS, RADIUS } from '../components/theme'
import { ThemeToggle } from '../components/ThemeToggle'
import candleStickLogo from '../assets/candleStick.png'

async function parseResponseBody(res) {
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return res.json().catch(() => null)
  }

  const text = await res.text().catch(() => '')
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return { detail: text }
  }
}

function Field({ label, type = 'text', value, onChange, placeholder, error, autoFocus, hint }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: C.text2, letterSpacing: '0.03em' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete={type === 'password' ? 'current-password' : 'off'}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          background:   C.inputBg,
          border:       `1.5px solid ${error ? C.red : focused ? C.blue : C.border}`,
          borderRadius: RADIUS.md,
          padding:      '10px 14px',
          fontSize:     14,
          color:        C.text0,
          fontFamily:   FONTS.sans,
          outline:      'none',
          transition:   'border-color 0.15s',
          boxShadow:    focused && !error ? `0 0 0 3px ${C.blue}18` : 'none',
        }}
      />
      {error && (
        <span style={{ fontSize: 11, color: C.red }}>{error}</span>
      )}
      {hint && !error && (
        <span style={{ fontSize: 11, color: C.text3 }}>{hint}</span>
      )}
    </div>
  )
}

function PasswordField({ label, value, onChange, error, hint, autoComplete = 'current-password' }) {
  const [show, setShow] = useState(false)
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: C.text2, letterSpacing: '0.03em' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="••••••••"
          autoComplete={autoComplete}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width:        '100%',
            background:   C.inputBg,
            border:       `1.5px solid ${error ? C.red : focused ? C.blue : C.border}`,
            borderRadius: RADIUS.md,
            padding:      '10px 40px 10px 14px',
            fontSize:     14,
            color:        C.text0,
            fontFamily:   FONTS.sans,
            outline:      'none',
            transition:   'border-color 0.15s',
            boxShadow:    focused && !error ? `0 0 0 3px ${C.blue}18` : 'none',
          }}
        />
        <button
          type="button"
          onClick={() => setShow(v => !v)}
          style={{
            position:   'absolute', right: 12, top: '50%',
            transform:  'translateY(-50%)',
            background: 'none', border: 'none',
            color:      C.text3, cursor: 'pointer',
            fontSize:   12, padding: 4,
          }}
        >
          {show ? '🙈' : '👁'}
        </button>
      </div>
      {error && <span style={{ fontSize: 11, color: C.red }}>{error}</span>}
      {hint && !error && <span style={{ fontSize: 11, color: C.text3 }}>{hint}</span>}
    </div>
  )
}

export default function AuthPage({ onSuccess, isDark, onToggle }) {
  const [mode, setMode] = useState('login') 

  return (
    <div style={{
      minHeight:      '100vh',
      background:     C.pageBg,
      display:        'flex',
      flexDirection:  'column',
      fontFamily:     FONTS.sans,
    }}>
      {/* Top bar */}
      <header style={{
        display:     'flex',
        alignItems:  'center',
        justifyContent: 'space-between',
        padding:     '16px 24px',
        background:  C.headerBg,
        borderBottom: `1px solid ${C.border}`,
        boxShadow:   C.shadow,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Logo */}
          <img
            src={candleStickLogo}
            alt="QuantAI"
            style={{ width: 32, height: 32, objectFit: 'contain', flexShrink: 0 }}
          />
          <span style={{ fontSize: 18, fontWeight: 800, color: C.text0, letterSpacing: '-0.03em' }}>
            Quant<span style={{ color: C.blue }}>AI</span>
          </span>
        </div>
        <ThemeToggle isDark={isDark} onToggle={onToggle} />
      </header>

      {/* Center content */}
      <div style={{
        flex:           1,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '40px 16px',
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>

          {/* Hero text */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h1 style={{
              fontSize:      28,
              fontWeight:    800,
              color:         C.text0,
              letterSpacing: '-0.03em',
              lineHeight:    1.15,
              marginBottom:  8,
            }}>
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
            background:   C.cardBg,
            border:       `1px solid ${C.border}`,
            borderRadius: RADIUS.xl,
            padding:      '32px 32px 28px',
            boxShadow:    C.shadowLg,
          }}>
            {mode === 'login'
              ? <LoginForm onSuccess={onSuccess} onSwitch={() => setMode('signup')} />
              : <SignupForm onSuccess={onSuccess} onSwitch={() => setMode('login')} />}
          </div>

          {/* Footer */}
          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: C.text3 }}>
            By using QuantAI you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  )
}

function LoginForm({ onSuccess, onSwitch }) {
  const [cred,     setCred]     = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!cred.trim() || !password) { setError('Please fill in all fields.'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email_or_username: cred.trim(), password }),
      })
      const data = await parseResponseBody(res)
      if (!res.ok) throw new Error(data.detail || 'Login failed')
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

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <Field
        label="Email or username"
        value={cred}
        onChange={setCred}
        placeholder="you@example.com"
        autoFocus
      />
      <PasswordField
        label="Password"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
      />

      {error && (
        <div style={{
          background: C.redBg, border: `1px solid ${C.red}40`,
          borderRadius: RADIUS.md, padding: '10px 14px',
          fontSize: 13, color: C.red,
        }}>
          {error}
        </div>
      )}

      <button type="submit" disabled={loading} style={{
        background:   loading ? C.inputBg : C.blue,
        border:       'none',
        borderRadius: RADIUS.md,
        color:        loading ? C.text3 : '#fff',
        padding:      '12px',
        fontSize:     14,
        fontWeight:   700,
        cursor:       loading ? 'not-allowed' : 'pointer',
        fontFamily:   FONTS.sans,
        boxShadow:    loading ? 'none' : `0 4px 16px ${C.blue}40`,
        transition:   'all 0.2s',
      }}>
        {loading ? 'Signing in…' : 'Sign in'}
      </button>

      <p style={{ textAlign: 'center', fontSize: 13, color: C.text2, marginTop: 4 }}>
        Don't have an account?{' '}
        <button type="button" onClick={onSwitch} style={{
          background: 'none', border: 'none', color: C.blue,
          fontWeight: 700, cursor: 'pointer', fontSize: 13, fontFamily: FONTS.sans,
        }}>
          Sign up free
        </button>
      </p>
    </form>
  )
}

function SignupForm({ onSuccess, onSwitch }) {
  const [fields,  setFields]  = useState({ email: '', username: '', fullName: '', password: '', confirm: '' })
  const [errors,  setErrors]  = useState({})
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  const set = (k) => (v) => setFields(f => ({ ...f, [k]: v }))

  const validate = () => {
    const e = {}
    if (!fields.email.includes('@'))       e.email    = 'Enter a valid email address.'
    if (fields.username.length < 3)        e.username = 'At least 3 characters.'
    if (!/^[a-zA-Z0-9_]+$/.test(fields.username)) e.username = 'Letters, numbers, underscores only.'
    if (fields.password.length < 8)        e.password = 'At least 8 characters.'
    if (fields.password !== fields.confirm) e.confirm  = 'Passwords do not match.'
    return e
  }

  const submit = async (e) => {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length) return
    setLoading(true)
    setApiError('')
    try {
      const res = await fetch('/api/auth/signup', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          email:     fields.email.trim(),
          username:  fields.username.trim(),
          password:  fields.password,
          full_name: fields.fullName.trim(),
        }),
      })
      const data = await parseResponseBody(res)
      if (!res.ok) throw new Error(data.detail || 'Signup failed')
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

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field
          label="Email"
          type="email"
          value={fields.email}
          onChange={set('email')}
          placeholder="you@example.com"
          error={errors.email}
          autoFocus
        />
        <Field
          label="Username"
          value={fields.username}
          onChange={set('username')}
          placeholder="trader123"
          error={errors.username}
          hint="Letters, numbers, _"
        />
      </div>

      <Field
        label="Full name (optional)"
        value={fields.fullName}
        onChange={set('fullName')}
        placeholder="Jane Smith"
      />

      <PasswordField
        label="Password"
        value={fields.password}
        onChange={set('password')}
        error={errors.password}
        hint="Minimum 8 characters"
        autoComplete="new-password"
      />

      <PasswordField
        label="Confirm password"
        value={fields.confirm}
        onChange={set('confirm')}
        error={errors.confirm}
        autoComplete="new-password"
      />

      {apiError && (
        <div style={{
          background: C.redBg, border: `1px solid ${C.red}40`,
          borderRadius: RADIUS.md, padding: '10px 14px',
          fontSize: 13, color: C.red,
        }}>
          {apiError}
        </div>
      )}

      {/* Password strength indicator */}
      {fields.password && (
        <PasswordStrength password={fields.password} />
      )}

      <button type="submit" disabled={loading} style={{
        background:   loading ? C.inputBg : C.blue,
        border:       'none',
        borderRadius: RADIUS.md,
        color:        loading ? C.text3 : '#fff',
        padding:      '12px',
        fontSize:     14,
        fontWeight:   700,
        cursor:       loading ? 'not-allowed' : 'pointer',
        fontFamily:   FONTS.sans,
        boxShadow:    loading ? 'none' : `0 4px 16px ${C.blue}40`,
        transition:   'all 0.2s',
        marginTop:    4,
      }}>
        {loading ? 'Creating account…' : 'Create account'}
      </button>

      <p style={{ textAlign: 'center', fontSize: 13, color: C.text2 }}>
        Already have an account?{' '}
        <button type="button" onClick={onSwitch} style={{
          background: 'none', border: 'none', color: C.blue,
          fontWeight: 700, cursor: 'pointer', fontSize: 13, fontFamily: FONTS.sans,
        }}>
          Sign in
        </button>
      </p>
    </form>
  )
}

function PasswordStrength({ password }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ]
  const score  = checks.filter(Boolean).length
  const labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong']
  const colors = [C.red, C.red, C.amber, C.amber, C.green]
  const color  = colors[score]
  const label  = labels[score]

  return (
    <div>
      <div style={{ display: 'flex', gap: 3, marginBottom: 5 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i <= score ? color : C.border,
            transition: 'background 0.3s',
          }} />
        ))}
      </div>
      <span style={{ fontSize: 11, color, fontWeight: 600 }}>{label}</span>
    </div>
  )
}