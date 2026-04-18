import React from 'react'

export const THEME_CSS = `
  /* ── Light mode (default) ─────────────────────────────────────── */
  :root,
  [data-theme="light"] {
    --qai-page-bg:       #EEF2F8;
    --qai-sidebar-bg:    #FFFFFF;
    --qai-card-bg:       #FFFFFF;
    --qai-header-bg:     #FFFFFF;
    --qai-input-bg:      #F4F6FB;
    --qai-row-hover:     #F8FAFD;

    --qai-blue:          #2563EB;
    --qai-blue-dark:     #1D4ED8;
    --qai-blue-light:    #EFF6FF;
    --qai-blue-mid:      #DBEAFE;

    --qai-green:         #16A34A;
    --qai-green-bg:      #F0FDF4;
    --qai-red:           #DC2626;
    --qai-red-bg:        #FEF2F2;
    --qai-amber:         #D97706;
    --qai-amber-bg:      #FFFBEB;
    --qai-purple:        #7C3AED;

    --qai-text0:         #0F172A;
    --qai-text1:         #1E293B;
    --qai-text2:         #64748B;
    --qai-text3:         #94A3B8;
    --qai-text4:         #CBD5E1;

    --qai-border:        #E2E8F0;
    --qai-border-focus:  #2563EB;
    --qai-border-card:   rgba(15,23,42,0.08);

    --qai-shadow-sm:     0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04);
    --qai-shadow-md:     0 4px 16px rgba(15,23,42,0.08), 0 2px 4px rgba(15,23,42,0.04);
    --qai-shadow-lg:     0 8px 32px rgba(15,23,42,0.10), 0 4px 8px rgba(15,23,42,0.06);

    /* Toggle button */
    --qai-toggle-bg:     #E2E8F0;
    --qai-toggle-thumb:  #FFFFFF;
  }

  /* ── Dark mode ─────────────────────────────────────────────────── */
  [data-theme="dark"] {
    --qai-page-bg:       #0B0F19;
    --qai-sidebar-bg:    #111827;
    --qai-card-bg:       #1A2235;
    --qai-header-bg:     #111827;
    --qai-input-bg:      #1E2A40;
    --qai-row-hover:     #1F2D43;

    --qai-blue:          #3B82F6;
    --qai-blue-dark:     #2563EB;
    --qai-blue-light:    rgba(59,130,246,0.12);
    --qai-blue-mid:      rgba(59,130,246,0.18);

    --qai-green:         #22C55E;
    --qai-green-bg:      rgba(34,197,94,0.10);
    --qai-red:           #F87171;
    --qai-red-bg:        rgba(248,113,113,0.10);
    --qai-amber:         #FBBF24;
    --qai-amber-bg:      rgba(251,191,36,0.10);
    --qai-purple:        #A78BFA;

    --qai-text0:         #F1F5F9;
    --qai-text1:         #CBD5E1;
    --qai-text2:         #94A3B8;
    --qai-text3:         #64748B;
    --qai-text4:         #334155;

    --qai-border:        #1E2D45;
    --qai-border-focus:  #3B82F6;
    --qai-border-card:   rgba(255,255,255,0.06);

    --qai-shadow-sm:     0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2);
    --qai-shadow-md:     0 4px 16px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.2);
    --qai-shadow-lg:     0 8px 32px rgba(0,0,0,0.5), 0 4px 8px rgba(0,0,0,0.3);

    --qai-toggle-bg:     #334155;
    --qai-toggle-thumb:  #F1F5F9;
  }

  /* ── Transitions ────────────────────────────────────────────────── */
  *,
  *::before,
  *::after {
    transition:
      background-color 0.2s ease,
      border-color     0.2s ease,
      color            0.2s ease,
      box-shadow       0.2s ease;
  }
  /* Disable transition on interactive elements to keep them snappy */
  button, a, input, select, textarea {
    transition:
      background-color 0.15s ease,
      border-color     0.15s ease,
      color            0.15s ease,
      box-shadow       0.15s ease,
      opacity          0.15s ease;
  }
`

export const C = {
  pageBg:      'var(--qai-page-bg)',
  sidebarBg:   'var(--qai-sidebar-bg)',
  cardBg:      'var(--qai-card-bg)',
  headerBg:    'var(--qai-header-bg)',
  inputBg:     'var(--qai-input-bg)',
  rowHover:    'var(--qai-row-hover)',

  blue:        'var(--qai-blue)',
  blueDark:    'var(--qai-blue-dark)',
  blueLight:   'var(--qai-blue-light)',
  blueMid:     'var(--qai-blue-mid)',

  green:       'var(--qai-green)',
  greenBg:     'var(--qai-green-bg)',
  red:         'var(--qai-red)',
  redBg:       'var(--qai-red-bg)',
  amber:       'var(--qai-amber)',
  amberBg:     'var(--qai-amber-bg)',
  purple:      'var(--qai-purple)',

  text0:       'var(--qai-text0)',
  text1:       'var(--qai-text1)',
  text2:       'var(--qai-text2)',
  text3:       'var(--qai-text3)',
  text4:       'var(--qai-text4)',

  border:      'var(--qai-border)',
  borderFocus: 'var(--qai-border-focus)',
  borderCard:  'var(--qai-border-card)',

  shadow:      'var(--qai-shadow-sm)',
  shadowMd:    'var(--qai-shadow-md)',
  shadowLg:    'var(--qai-shadow-lg)',
}

export const FONTS = {
  sans:    "'Plus Jakarta Sans', 'DM Sans', sans-serif",
  mono:    "'JetBrains Mono', 'Fira Code', monospace",
  display: "'Plus Jakarta Sans', sans-serif",
}

export const RADIUS = {
  sm:   '6px',
  md:   '10px',
  lg:   '14px',
  xl:   '20px',
  full: '9999px',
}


export function Card({ children, style, onClick }) {
  return (
    <div onClick={onClick} style={{
      background:   C.cardBg,
      borderRadius: RADIUS.lg,
      boxShadow:    C.shadowMd,
      border:       `1px solid ${C.border}`,
      ...style,
    }}>
      {children}
    </div>
  )
}

export function CardHeader({ title, right, style }) {
  return (
    <div style={{
      display:        'flex',
      justifyContent: 'space-between',
      alignItems:     'center',
      padding:        '16px 20px 14px',
      borderBottom:   `1px solid ${C.border}`,
      ...style,
    }}>
      <span style={{
        fontFamily:    FONTS.sans,
        fontSize:      15,
        fontWeight:    700,
        color:         C.text0,
        letterSpacing: '-0.01em',
      }}>{title}</span>
      {right && <div>{right}</div>}
    </div>
  )
}

export function Badge({ value, type = 'neutral', style }) {
  const map = {
    positive: { bg: C.greenBg,  color: C.green  },
    negative: { bg: C.redBg,    color: C.red    },
    neutral:  { bg: C.blueLight, color: C.blue  },
    muted:    { bg: C.inputBg,  color: C.text2  },
    amber:    { bg: C.amberBg,  color: C.amber  },
  }
  const { bg, color } = map[type] || map.neutral
  return (
    <span style={{
      display:      'inline-flex',
      alignItems:   'center',
      gap:          2,
      background:   bg,
      color,
      borderRadius: RADIUS.full,
      fontSize:     11,
      fontWeight:   700,
      padding:      '2px 8px',
      fontFamily:   FONTS.sans,
      ...style,
    }}>{value}</span>
  )
}

export function Spinner({ label, color }) {
  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      padding:        '48px 0',
      gap:            14,
    }}>
      <div style={{
        width:       32,
        height:      32,
        border:      `3px solid ${C.border}`,
        borderTop:   `3px solid ${color || C.blue}`,
        borderRadius: '50%',
        animation:   'cb-spin 0.7s linear infinite',
      }} />
      {label && (
        <span style={{ fontSize: 13, color: C.text2, fontFamily: FONTS.sans }}>
          {label}
        </span>
      )}
    </div>
  )
}

export function Tag({ children, color }) {
  const c = color || C.blue
  return (
    <span style={{
      fontSize:     11,
      fontWeight:   600,
      color:        c,
      background:   `color-mix(in srgb, ${c} 14%, transparent)`,
      borderRadius: RADIUS.sm,
      padding:      '3px 9px',
      fontFamily:   FONTS.sans,
    }}>{children}</span>
  )
}