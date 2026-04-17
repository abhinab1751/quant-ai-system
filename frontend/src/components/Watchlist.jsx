import { useState, useEffect } from 'react'
import { getPrice } from '../api/client'

const DEFAULT = ['AAPL', 'TSLA', 'MSFT', 'NVDA', 'GOOGL']

export default function Watchlist({ activeSymbol, onSelect }) {
  const [symbols,  setSymbols]  = useState(DEFAULT)
  const [prices,   setPrices]   = useState({})
  const [newSym,   setNewSym]   = useState('')

  useEffect(() => {
    const fetchAll = () => {
      symbols.forEach(sym => {
        getPrice(sym)
          .then(d => setPrices(prev => ({ ...prev, [sym]: d })))
          .catch(() => {})
      })
    }
    fetchAll()
    const id = setInterval(fetchAll, 10_000)
    return () => clearInterval(id)
  }, [symbols])

  const add = (e) => {
    e.preventDefault()
    const s = newSym.trim().toUpperCase()
    if (s && !symbols.includes(s)) setSymbols(prev => [...prev, s])
    setNewSym('')
  }

  const remove = (sym) => setSymbols(prev => prev.filter(s => s !== sym))

  return (
    <aside style={styles.aside}>
      <p style={styles.heading}>Watchlist</p>

      <form onSubmit={add} style={styles.addForm}>
        <input
          value={newSym}
          onChange={e => setNewSym(e.target.value.toUpperCase())}
          placeholder="Add symbol…"
          style={styles.input}
        />
        <button type="submit" style={styles.addBtn}>+</button>
      </form>

      <div style={styles.list}>
        {symbols.map(sym => {
          const d      = prices[sym]
          const active = sym === activeSymbol
          const up     = d?.price && d.price >= 0
          return (
            <div
              key={sym}
              onClick={() => onSelect(sym)}
              style={{ ...styles.row, ...(active ? styles.rowActive : {}) }}
            >
              <div>
                <span style={styles.sym}>{sym}</span>
                {d?.price && (
                  <span style={{ fontSize: 11, color: '#666', marginLeft: 6 }}>
                    ${d.price.toFixed(2)}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={styles.removeBtn} onClick={e => { e.stopPropagation(); remove(sym) }}>×</span>
              </div>
            </div>
          )
        })}
      </div>
    </aside>
  )
}

const styles = {
  aside:     { width: 180, background: '#16162a', borderRight: '1px solid #2a2a3e',
               padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 10,
               minHeight: '100vh' },
  heading:   { fontSize: 11, fontWeight: 600, color: '#555', textTransform: 'uppercase',
               letterSpacing: '0.1em' },
  addForm:   { display: 'flex', gap: 4 },
  input:     { flex: 1, background: '#2a2a3e', border: '1px solid #44445a', borderRadius: 6,
               color: '#e0e0f0', padding: '5px 8px', fontSize: 12, minWidth: 0 },
  addBtn:    { background: '#7c6af7', border: 'none', borderRadius: 6, color: '#fff',
               width: 28, fontSize: 16, cursor: 'pointer' },
  list:      { display: 'flex', flexDirection: 'column', gap: 2 },
  row:       { display: 'flex', justifyContent: 'space-between', alignItems: 'center',
               padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
               border: '1px solid transparent' },
  rowActive: { background: '#2a2a3e', borderColor: '#7c6af7' },
  sym:       { fontSize: 13, fontWeight: 600, color: '#e0e0f0' },
  removeBtn: { color: '#555', fontSize: 16, cursor: 'pointer', lineHeight: 1 },
}