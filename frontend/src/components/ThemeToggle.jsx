import { C, FONTS, RADIUS } from './theme'

function SunIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1"  x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22"   x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1"  y1="12" x2="3"  y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22"  y1="19.78" x2="5.64"  y2="18.36"/>
      <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22"/>
    </svg>
  )
}

function MoonIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  )
}

export function ThemeToggle({ isDark, onToggle }) {
  return (
    <button
      onClick={onToggle}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        display:        'inline-flex',
        alignItems:     'center',
        gap:            8,
        background:     'var(--qai-input-bg)',
        border:         `1px solid var(--qai-border)`,
        borderRadius:   RADIUS.full,
        padding:        '6px 12px',
        cursor:         'pointer',
        fontFamily:     FONTS.sans,
        fontSize:       12,
        fontWeight:     600,
        color:          'var(--qai-text1)',
        whiteSpace:     'nowrap',
        userSelect:     'none',
      }}
    >
      {/* Animated icon container */}
      <span style={{
        width:          18,
        height:         18,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        color:          isDark ? 'var(--qai-amber)' : 'var(--qai-blue)',
        transform:      isDark ? 'rotate(-30deg)' : 'rotate(0deg)',
        transition:     'transform 0.3s ease, color 0.2s ease',
      }}>
        {isDark ? <MoonIcon size={14} /> : <SunIcon size={14} />}
      </span>

      {/* Sliding track */}
      <span style={{
        width:          34,
        height:         18,
        borderRadius:   RADIUS.full,
        background:     isDark ? 'var(--qai-blue)' : 'var(--qai-toggle-bg)',
        position:       'relative',
        flexShrink:     0,
        transition:     'background 0.25s ease',
      }}>
        <span style={{
          position:     'absolute',
          top:          2,
          left:         isDark ? 16 : 2,
          width:        14,
          height:       14,
          borderRadius: '50%',
          background:   'var(--qai-toggle-thumb)',
          boxShadow:    '0 1px 3px rgba(0,0,0,0.2)',
          transition:   'left 0.22s ease',
        }} />
      </span>

      <span>{isDark ? 'Dark' : 'Light'}</span>
    </button>
  )
}

export function ThemeToggleIcon({ isDark, onToggle }) {
  return (
    <button
      onClick={onToggle}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        width:          36,
        height:         36,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        background:     'var(--qai-input-bg)',
        border:         `1px solid var(--qai-border)`,
        borderRadius:   RADIUS.md,
        cursor:         'pointer',
        color:          isDark ? 'var(--qai-amber)' : 'var(--qai-blue)',
        transition:     'all 0.15s ease',
      }}
    >
      <span style={{
        display:    'flex',
        transform:  isDark ? 'rotate(-20deg)' : 'rotate(0deg)',
        transition: 'transform 0.3s ease',
      }}>
        {isDark ? <MoonIcon size={16} /> : <SunIcon size={16} />}
      </span>
    </button>
  )
}
export function ThemeSelector({ currentTheme, onSetTheme }) {
  const options = [
    { value: 'light', label: 'Light',  icon: <SunIcon size={13} />  },
    { value: 'dark',  label: 'Dark',   icon: <MoonIcon size={13} /> },
  ]
  return (
    <div style={{
      display:        'flex',
      background:     'var(--qai-input-bg)',
      border:         `1px solid var(--qai-border)`,
      borderRadius:   RADIUS.md,
      padding:        3,
      gap:            3,
    }}>
      {options.map(opt => {
        const active = currentTheme === opt.value
        return (
          <button key={opt.value} onClick={() => onSetTheme(opt.value)} style={{
            display:        'flex',
            alignItems:     'center',
            gap:            5,
            padding:        '5px 12px',
            borderRadius:   RADIUS.sm,
            border:         'none',
            background:     active ? 'var(--qai-card-bg)' : 'transparent',
            color:          active ? 'var(--qai-text0)' : 'var(--qai-text3)',
            fontSize:       12,
            fontWeight:     active ? 600 : 400,
            cursor:         'pointer',
            fontFamily:     FONTS.sans,
            boxShadow:      active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            transition:     'all 0.15s ease',
          }}>
            <span style={{ color: active ? 'var(--qai-blue)' : 'inherit' }}>
              {opt.icon}
            </span>
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export default ThemeToggle