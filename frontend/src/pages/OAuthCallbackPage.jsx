import { useEffect, useState } from 'react'
import { C, FONTS, RADIUS } from '../components/theme'

export default function OAuthCallbackPage({ onSuccess }) {
  const [status, setStatus] = useState('processing') // 'processing' | 'error'
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const error  = params.get('error')

    if (error) {
      setErrorMsg(decodeURIComponent(error))
      setStatus('error')
      return
    }

    const accessToken  = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const userId       = params.get('user_id')
    const username     = params.get('username')
    const email        = params.get('email')
    const avatarUrl    = params.get('avatar_url') || ''
    const authProvider = params.get('auth_provider') || 'oauth'

    if (!accessToken || !refreshToken) {
      setErrorMsg('Missing tokens in OAuth callback. Please try again.')
      setStatus('error')
      return
    }

    const user = {
      id:           parseInt(userId || '0', 10),
      username:     username   || '',
      email:        email      || '',
      avatar_url:   avatarUrl,
      auth_provider: authProvider,
    }

    try {
      localStorage.setItem('qai_access',  accessToken)
      localStorage.setItem('qai_refresh', refreshToken)
      localStorage.setItem('qai_user',    JSON.stringify(user))
    } catch (e) {
      setErrorMsg('Could not save session. Please enable localStorage.')
      setStatus('error')
      return
    }

    window.history.replaceState({}, document.title, '/')
    onSuccess(user)
  }, [onSuccess])

  return (
    <div style={{
      minHeight:      '100vh',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      background:     C.pageBg,
      fontFamily:     FONTS.sans,
    }}>
      {status === 'processing' && (
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          {/* Spinner */}
          <div style={{
            width:      48,
            height:     48,
            border:     `4px solid ${C.border}`,
            borderTop:  `4px solid ${C.blue}`,
            borderRadius: '50%',
            animation:  'cb-spin 0.8s linear infinite',
          }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: C.text1 }}>
            Completing sign-in…
          </div>
          <div style={{ fontSize: 13, color: C.text3 }}>
            Please wait while we set up your session.
          </div>
        </div>
      )}

      {status === 'error' && (
        <div style={{
          maxWidth:     400,
          width:        '90%',
          background:   C.cardBg,
          border:       `1.5px solid ${C.redBorder}`,
          borderRadius: RADIUS.xl,
          padding:      '32px',
          textAlign:    'center',
          boxShadow:    C.shadowLg,
        }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>⚠️</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.red, marginBottom: 10 }}>
            Sign-in Failed
          </div>
          <div style={{ fontSize: 14, color: C.text2, lineHeight: 1.6, marginBottom: 24 }}>
            {errorMsg || 'Something went wrong during OAuth. Please try again.'}
          </div>
          <button
            onClick={() => window.location.href = '/'}
            style={{
              background:   C.blue,
              border:       'none',
              borderRadius: RADIUS.md,
              color:        '#fff',
              padding:      '10px 28px',
              fontSize:     14,
              fontWeight:   700,
              cursor:       'pointer',
              fontFamily:   FONTS.sans,
            }}
          >
            Back to Home
          </button>
        </div>
      )}
    </div>
  )
}