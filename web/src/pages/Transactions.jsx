import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import client from '../api/client.js'
import Modal from '../components/Modal.jsx'
import MonthPicker from '../components/MonthPicker.jsx'

function formatCurrency(amount) {
  if (amount == null) return '$0'
  return '$' + Math.round(amount).toLocaleString('en-US')
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  try { return format(new Date(dateStr), 'MMM d, yyyy') } catch { return dateStr }
}

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  fontSize: '14px',
  background: 'var(--surface)',
  color: 'var(--text-primary)',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle = {
  display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px',
}

export default function Transactions() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const limit = 20

  const [showModal, setShowModal] = useState(false)
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState({
    amount: '',
    type: 'EXPENSE',
    description: '',
    categoryId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
  })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const fetchTransactions = useCallback(() => {
    setLoading(true)
    client.get(`/transactions?month=${month}&year=${year}&page=${page}&limit=${limit}`)
      .then((res) => {
        setTransactions(res.data.transactions || res.data.data || res.data || [])
        setTotalPages(res.data.totalPages || Math.ceil((res.data.total || 0) / limit) || 1)
      })
      .catch(() => setError('Failed to load transactions'))
      .finally(() => setLoading(false))
  }, [month, year, page])

  useEffect(() => { fetchTransactions() }, [fetchTransactions])

  useEffect(() => {
    client.get('/categories')
      .then((res) => setCategories(res.data.categories || res.data || []))
      .catch(() => {})
  }, [])

  async function handleAdd(e) {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      await client.post('/transactions', {
        amount: parseFloat(form.amount),
        type: form.type,
        description: form.description,
        categoryId: form.categoryId || undefined,
        date: form.date,
      })
      setShowModal(false)
      setForm({ amount: '', type: 'EXPENSE', description: '', categoryId: '', date: format(new Date(), 'yyyy-MM-dd') })
      fetchTransactions()
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to add transaction')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this transaction?')) return
    try {
      await client.delete(`/transactions/${id}`)
      fetchTransactions()
    } catch {
      alert('Failed to delete')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px' }}>Transactions</h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <MonthPicker month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y); setPage(1) }} />
          <button
            onClick={() => setShowModal(true)}
            style={{
              padding: '8px 16px',
              background: 'var(--neutral-950)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            + Add
          </button>
        </div>
      </div>

      {loading && <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading...</div>}
      {error && <div style={{ color: 'var(--expense)', fontSize: '14px' }}>{error}</div>}

      {!loading && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Date', 'Description', 'Category', 'Type', 'Amount', ''].map((h) => (
                  <th key={h} style={{
                    textAlign: 'left',
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    fontWeight: 500,
                    padding: '12px 16px',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                    No transactions found
                  </td>
                </tr>
              ) : transactions.map((tx) => (
                <tr key={tx.id || tx._id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {formatDate(tx.date)}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px' }}>{tx.description}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {tx.category?.name || tx.category || '-'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 500,
                      background: tx.type === 'INCOME' ? '#dcfce7' : '#fee2e2',
                      color: tx.type === 'INCOME' ? 'var(--income)' : 'var(--expense)',
                    }}>
                      {tx.type}
                    </span>
                  </td>
                  <td style={{
                    padding: '12px 16px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: tx.type === 'INCOME' ? 'var(--income)' : 'var(--expense)',
                  }}>
                    {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button
                      onClick={() => handleDelete(tx.id || tx._id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: '13px',
                        padding: '2px 8px',
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '16px', borderTop: '1px solid var(--border)' }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: '6px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  background: 'none',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  opacity: page === 1 ? 0.5 : 1,
                  fontSize: '13px',
                }}
              >
                Previous
              </button>
              <span style={{ display: 'flex', alignItems: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  padding: '6px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  background: 'none',
                  cursor: page === totalPages ? 'not-allowed' : 'pointer',
                  opacity: page === totalPages ? 0.5 : 1,
                  fontSize: '13px',
                }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <Modal title="Add Transaction" onClose={() => setShowModal(false)}>
          <form onSubmit={handleAdd}>
            {/* Type toggle */}
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Type</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['EXPENSE', 'INCOME'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm({ ...form, type: t })}
                    style={{
                      flex: 1,
                      padding: '8px',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      background: form.type === t ? 'var(--neutral-950)' : 'none',
                      color: form.type === t ? '#FFFFFF' : 'var(--text-secondary)',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
                required
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What was this for?"
                required
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Category</label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                style={inputStyle}
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id || c._id} value={c.id || c._id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
                style={inputStyle}
              />
            </div>

            {formError && <div style={{ color: 'var(--expense)', fontSize: '13px', marginBottom: '16px' }}>{formError}</div>}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{
                  padding: '8px 16px',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  background: 'none',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '8px 16px',
                  background: 'var(--neutral-950)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? 'Adding...' : 'Add Transaction'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
