import React from 'react'

export const THEME_CSS = `
  /* ── Light mode (default) ─────────────────────────────────────── */
  :root,
  [data-theme="light"] {
    --qai-font-sans:     'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    --qai-font-display:  'DM Serif Display', Georgia, serif;
    --qai-font-mono:     'JetBrains Mono', 'Fira Code', monospace;

    --qai-page-bg:       #F5F5F3;
    --qai-sidebar-bg:    #FFFFFF;
    --qai-card-bg:       #FFFFFF;
    --qai-header-bg:     #FFFFFF;
    --qai-input-bg:      #ECECEA;
    --qai-row-hover:     #F0F0EE;

    --qai-blue:          #1F1F1F;
    --qai-blue-dark:     #000000;
    --qai-blue-light:    #F2F2F0;
    --qai-blue-mid:      #E4E4E2;
    --qai-blue-border:   #CFCFCD;

    --qai-green:         #16A34A;
    --qai-green-bg:      #F0FDF4;
    --qai-green-border:  #BBF7D0;
    --qai-red:           #DC2626;
    --qai-red-bg:        #FEF2F2;
    --qai-red-border:    #FECACA;
    --qai-amber:         #D97706;
    --qai-amber-bg:      #FFFBEB;
    --qai-amber-border:  #FDE68A;
    --qai-purple:        #7C3AED;

    --qai-text0:         #111111;
    --qai-text1:         #2B2B2B;
    --qai-text2:         #525252;
    --qai-text3:         #7A7A7A;
    --qai-text4:         #A3A3A3;

    --qai-border:        #D4D4D0;
    --qai-border-focus:  #1F1F1F;
    --qai-border-card:   rgba(17,17,17,0.08);

    --qai-shadow-sm:     0 1px 3px rgba(17,17,17,0.06), 0 1px 2px rgba(17,17,17,0.04);
    --qai-shadow-md:     0 4px 16px rgba(17,17,17,0.08), 0 2px 4px rgba(17,17,17,0.04);
    --qai-shadow-lg:     0 8px 32px rgba(17,17,17,0.10), 0 4px 8px rgba(17,17,17,0.06);

    /* Toggle button */
    --qai-toggle-bg:     #E2E8F0;
    --qai-toggle-thumb:  #FFFFFF;
  }

  /* ── Dark mode ─────────────────────────────────────────────────── */
  [data-theme="dark"] {
    --qai-font-sans:     'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    --qai-font-display:  'DM Serif Display', Georgia, serif;
    --qai-font-mono:     'JetBrains Mono', 'Fira Code', monospace;

    --qai-page-bg:       #0F1612;
    --qai-sidebar-bg:    #131D17;
    --qai-card-bg:       #17231C;
    --qai-header-bg:     #0F1612;
    --qai-input-bg:      #1D2B22;
    --qai-row-hover:     #223328;

    --qai-blue:          #9ABF7A;
    --qai-blue-dark:     #7FA35F;
    --qai-blue-light:    #1F2F24;
    --qai-blue-mid:      #2A3D2F;
    --qai-blue-border:   #3D5644;

    --qai-green:         #9BD97C;
    --qai-green-bg:      #1C3524;
    --qai-green-border:  #3F6D47;
    --qai-red:           #E38D86;
    --qai-red-bg:        #3B1F1C;
    --qai-red-border:    #5C2F2B;
    --qai-amber:         #D8B56A;
    --qai-amber-bg:      #3B3321;
    --qai-amber-border:  #5D5232;
    --qai-purple:        #A8B68E;

    --qai-text0:         #EDF4E9;
    --qai-text1:         #D8E3D2;
    --qai-text2:         #AABAA3;
    --qai-text3:         #82917D;
    --qai-text4:         #5F6D5A;

    --qai-border:        #324336;
    --qai-border-focus:  #9ABF7A;
    --qai-border-card:   rgba(154,191,122,0.10);

    --qai-shadow-sm:     0 1px 3px rgba(7,14,10,0.34), 0 1px 2px rgba(7,14,10,0.22);
    --qai-shadow-md:     0 4px 16px rgba(7,14,10,0.46), 0 2px 4px rgba(7,14,10,0.24);
    --qai-shadow-lg:     0 8px 32px rgba(7,14,10,0.58), 0 4px 8px rgba(7,14,10,0.34);

    --qai-toggle-bg:     #2F4234;
    --qai-toggle-thumb:  #EDF4E9;
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
  blueBorder:  'var(--qai-blue-border)',

  green:       'var(--qai-green)',
  greenBg:     'var(--qai-green-bg)',
  greenBorder: 'var(--qai-green-border)',
  red:         'var(--qai-red)',
  redBg:       'var(--qai-red-bg)',
  redBorder:   'var(--qai-red-border)',
  amber:       'var(--qai-amber)',
  amberBg:     'var(--qai-amber-bg)',
  amberBorder: 'var(--qai-amber-border)',
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
  sans:    'var(--qai-font-sans)',
  mono:    'var(--qai-font-mono)',
  display: 'var(--qai-font-display)',
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
    <div
      onClick={onClick}
      style={{
      background:   C.cardBg,
      borderRadius: RADIUS.lg,
      boxShadow:    C.shadowMd,
      border:       `1px solid ${C.border}`,
      transition:   'box-shadow 220ms ease, border-color 220ms ease',
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