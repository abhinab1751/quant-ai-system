export const C = {
  pageBg:    '#EEF2F8',
  sidebarBg: '#FFFFFF',
  cardBg:    '#FFFFFF',
  headerBg:  '#FFFFFF',
  inputBg:   '#F4F6FB',
  rowHover:  '#F8FAFD',

  blue:       '#2563EB',
  blueDark:   '#1D4ED8',
  blueLight:  '#EFF6FF',
  blueMid:    '#DBEAFE',

  green:      '#16A34A',
  greenBg:    '#F0FDF4',
  red:        '#DC2626',
  redBg:      '#FEF2F2',
  amber:      '#D97706',
  amberBg:    '#FFFBEB',

  text0:  '#0F172A',  
  text1:  '#1E293B',  
  text2:  '#64748B',  
  text3:  '#94A3B8',  
  text4:  '#CBD5E1',  

  border:     '#E2E8F0',
  borderFocus: '#2563EB',

  shadow:    '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
  shadowMd:  '0 4px 16px rgba(15,23,42,0.08), 0 2px 4px rgba(15,23,42,0.04)',
  shadowLg:  '0 8px 32px rgba(15,23,42,0.10), 0 4px 8px rgba(15,23,42,0.06)',
}

export const FONTS = {
  sans:    "'Plus Jakarta Sans', 'DM Sans', sans-serif",
  mono:    "'JetBrains Mono', 'Fira Code', monospace",
  display: "'Plus Jakarta Sans', sans-serif",
}

export const RADIUS = {
  sm:  '8px',
  md:  '12px',
  lg:  '16px',
  xl:  '20px',
  full: '9999px',
}

export const Card = ({ children, style, onClick }) => (
  <div
    onClick={onClick}
    style={{
      background: C.cardBg,
      borderRadius: RADIUS.lg,
      boxShadow: C.shadowMd,
      border: `1px solid ${C.border}`,
      ...style,
    }}
  >
    {children}
  </div>
)

export const CardHeader = ({ title, right, style }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '18px 20px 14px',
    borderBottom: `1px solid ${C.border}`,
    ...style,
  }}>
    <span style={{
      fontFamily: FONTS.sans, fontSize: 15, fontWeight: 700,
      color: C.text0, letterSpacing: '-0.01em',
    }}>{title}</span>
    {right}
  </div>
)

export const Badge = ({ value, type = 'neutral', style }) => {
  const colors = {
    positive: { bg: C.greenBg,  color: C.green },
    negative: { bg: C.redBg,    color: C.red   },
    neutral:  { bg: C.blueLight, color: C.blue  },
    muted:    { bg: C.inputBg,   color: C.text2 },
  }
  const { bg, color } = colors[type] || colors.neutral
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 2,
      background: bg, color, borderRadius: RADIUS.full,
      fontSize: 11, fontWeight: 700, padding: '2px 8px',
      fontFamily: FONTS.sans, letterSpacing: '0.01em',
      ...style,
    }}>{value}</span>
  )
}

export const Btn = ({ children, variant = 'primary', onClick, disabled, style }) => {
  const styles = {
    primary:  { background: C.blue, color: '#fff', border: 'none' },
    outline:  { background: 'transparent', color: C.blue, border: `1.5px solid ${C.blue}` },
    ghost:    { background: C.inputBg, color: C.text1, border: `1px solid ${C.border}` },
    danger:   { background: C.red, color: '#fff', border: 'none' },
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...styles[variant],
        borderRadius: RADIUS.md,
        padding: '8px 16px',
        fontSize: 13,
        fontWeight: 600,
        fontFamily: FONTS.sans,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >{children}</button>
  )
}

export const SectionLabel = ({ children }) => (
  <div style={{
    fontSize: 10, fontWeight: 700, color: C.text3,
    fontFamily: FONTS.sans, letterSpacing: '0.1em',
    textTransform: 'uppercase', padding: '0 16px',
    marginBottom: 4, marginTop: 20,
  }}>{children}</div>
)

export const Spinner = ({ label, color = C.blue }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: 14 }}>
    <div style={{
      width: 32, height: 32,
      border: `3px solid ${C.border}`,
      borderTop: `3px solid ${color}`,
      borderRadius: '50%',
      animation: 'cb-spin 0.7s linear infinite',
    }} />
    {label && (
      <span style={{ fontSize: 13, color: C.text2, fontFamily: FONTS.sans }}>
        {label}
      </span>
    )}
  </div>
)

export const Tag = ({ children, color = C.blue }) => (
  <span style={{
    fontSize: 11, fontWeight: 600, color,
    background: `${color}14`,
    borderRadius: RADIUS.sm,
    padding: '3px 9px',
    fontFamily: FONTS.sans,
  }}>{children}</span>
)