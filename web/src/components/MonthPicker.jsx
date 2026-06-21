import { format } from 'date-fns'

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

export default function MonthPicker({ month, year, onChange }) {
  function prev() {
    if (month === 1) {
      onChange(12, year - 1)
    } else {
      onChange(month - 1, year)
    }
  }

  function next() {
    if (month === 12) {
      onChange(1, year + 1)
    } else {
      onChange(month + 1, year)
    }
  }

  const btnStyle = {
    background: 'none',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '6px 10px',
    cursor: 'pointer',
    color: 'var(--text-primary)',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <button style={btnStyle} onClick={prev}>&#8249;</button>
      <span style={{ fontWeight: 500, minWidth: '130px', textAlign: 'center', fontSize: '14px' }}>
        {MONTH_NAMES[month - 1]} {year}
      </span>
      <button style={btnStyle} onClick={next}>&#8250;</button>
    </div>
  )
}
