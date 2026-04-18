import { useEffect, useRef, useState } from 'react'
import { C, FONTS, RADIUS } from './theme'

export default function PriceTicker({ symbol, priceData, connected, compact = false }) {
  const [flash, setFlash] = useState(null)
  const prevRef = useRef(null)

  useEffect(() => {
    if (!priceData?.price) return
    if (prevRef.current !== null) {
      setFlash(priceData.price > prevRef.current ? 'up' : 'down')
      const t = setTimeout(() => setFlash(null), 700)
      return () => clearTimeout(t)
    }
    prevRef.current = priceData.price
  }, [priceData?.price])

  const up    = (priceData?.change ?? 0) >= 0
  const chgColor = up ? C.green : C.red
  const chgBg    = up ? C.greenBg : C.redBg

  if (compact) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: flash === 'up'   ? '#F0FDF4'
                  : flash === 'down' ? '#FEF2F2'
                  : C.inputBg,
        border: `1.5px solid ${flash === 'up' ? '#BBF7D0' : flash === 'down' ? '#FECACA' : C.border}`,
        borderRadius: RADIUS.md,
        padding: '6px 14px',
        transition: 'all 0.3s ease',
      }}>
        {/* Symbol badge */}
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: `linear-gradient(135deg, ${C.blue}, #60A5FA)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: '#fff' }}>
            {symbol.slice(0, 2)}
          </span>
        </div>

        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '0.05em' }}>
            {symbol} / USD
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.text0, letterSpacing: '-0.02em', lineHeight: 1 }}>
            {priceData ? `$${priceData.price?.toFixed(2)}` : '—'}
          </div>
        </div>

        {priceData && (
          <div style={{
            background: chgBg,
            borderRadius: RADIUS.full,
            padding: '3px 8px',
            fontSize: 11, fontWeight: 700, color: chgColor,
          }}>
            {up ? '+' : ''}{Math.abs(priceData.change_pct ?? 0).toFixed(2)}%
          </div>
        )}

        {/* Live dot */}
        <div style={{
          width: 7, height: 7, borderRadius: '50%',
          background: connected ? C.green : C.red,
          boxShadow: `0 0 0 2px ${connected ? '#BBF7D0' : '#FECACA'}`,
          animation: connected ? 'cb-pulse 2s infinite' : 'none',
        }} />
      </div>
    )
  }

  return (
    <div style={{
      background: flash === 'up'   ? '#F0FDF4'
                : flash === 'down' ? '#FEF2F2'
                : C.cardBg,
      border: `1.5px solid ${flash === 'up' ? '#BBF7D0' : flash === 'down' ? '#FECACA' : C.border}`,
      borderRadius: RADIUS.lg,
      padding: '16px 20px',
      display: 'flex', alignItems: 'center', gap: 16,
      boxShadow: C.shadowMd,
      transition: 'all 0.3s ease',
    }}>
      {/* Symbol */}
      <div style={{
        width: 44, height: 44, borderRadius: '50%',
        background: `linear-gradient(135deg, ${C.blue}, #60A5FA)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 4px 12px ${C.blue}30`,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{symbol.slice(0, 2)}</span>
      </div>

      <div>
        <div style={{ fontSize: 11, color: C.text2, fontWeight: 600, marginBottom: 1, letterSpacing: '0.04em' }}>
          {symbol} / USD
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: C.text0, letterSpacing: '-0.03em', lineHeight: 1 }}>
          {priceData ? `$${priceData.price?.toFixed(2)}` : '—'}
        </div>
      </div>

      {priceData ? (
        <div style={{ borderLeft: `1.5px solid ${C.border}`, paddingLeft: 16 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: chgBg, color: chgColor,
            borderRadius: RADIUS.full, padding: '4px 10px',
            fontSize: 12, fontWeight: 700, marginBottom: 3,
          }}>
            {up ? '▲' : '▼'} {Math.abs(priceData.change_pct ?? 0).toFixed(2)}%
          </div>
          <div style={{ fontSize: 11, color: C.text2 }}>
            {up ? '+' : ''}${priceData.change?.toFixed(2)} today
          </div>
        </div>
      ) : (
        <span style={{ fontSize: 12, color: C.text3 }}>
          {connected ? 'Waiting for data…' : 'Connecting…'}
        </span>
      )}

      {/* Connection status */}
      <div style={{
        marginLeft: 'auto',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: connected ? C.green : C.red,
          boxShadow: `0 0 0 3px ${connected ? '#BBF7D0' : '#FECACA'}`,
          animation: connected ? 'cb-pulse 2s infinite' : 'none',
        }} />
        <span style={{ fontSize: 9, fontWeight: 600, color: connected ? C.green : C.red, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {connected ? 'Live' : 'Off'}
        </span>
      </div>
    </div>
  )
}