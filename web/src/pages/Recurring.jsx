import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import client from '../api/client.js'
import Modal from '../components/Modal.jsx'

function formatCurrency(amount) {
  if (amount == null) return '$0'
  return '$' + Math.round(amount).toLocaleString('en-US')
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  try { return format(new Date(dateStr), 'MMM d, yyyy') } catch { return dateStr }
}

const FREQUENCIES = ['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'YEARLY']

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

const labelStyle = { display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }

export default function Recurring() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState([])

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    description: '',
    amount: '',
    type: 'EXPENSE',
    frequency: 'MONTHLY',
    categoryId: '',
    nextDueDate: '',
  })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [applying, setApplying] = useState(null)

  function fetchRecurring() {
    setLoading(true)
    client.get('/recurring')
      .then((res) => setItems(res.data.recurring || res.data || []))
      .catch(() => setError('Failed to load recurring transactions'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchRecurring() }, [])

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
      await client.post('/recurring', {
        description: form.description,
        amount: parseFloat(form.amount),
        type: form.type,
        frequency: form.frequency,
        categoryId: form.categoryId || undefined,
        startDate: form.nextDueDate || undefined,
      })
      setShowModal(false)
      setForm({ description: '', amount: '', type: 'EXPENSE', frequency: 'MONTHLY', categoryId: '', nextDueDate: '' })
      fetchRecurring()
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to add recurring transaction')
    } finally {
      setSaving(false)
    }
  }

  async function handleApply(item) {
    const id = item.id || item._id
    setApplying(id)
    try {
      await client.post(`/recurring/${id}/apply`)
      fetchRecurring()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to apply transaction')
    } finally {
      setApplying(null)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px' }}>Recurring</h1>
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

      {loading && <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading...</div>}
      {error && <div style={{ color: 'var(--expense)', fontSize: '14px' }}>{error}</div>}

      {!loading && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Description', 'Amount', 'Frequency', 'Next Due', 'Category', ''].map((h) => (
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
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                    No recurring transactions set up
                  </td>
                </tr>
              ) : items.map((item) => {
                const id = item.id || item._id
                return (
                  <tr key={id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>{item.description}</td>
                    <td style={{
                      padding: '12px 16px',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: item.type === 'INCOME' ? 'var(--income)' : 'var(--expense)',
                    }}>
                      {item.type === 'INCOME' ? '+' : '-'}{formatCurrency(item.amount)}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {item.frequency}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {formatDate(item.nextDueDate)}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {item.category?.name || item.category || '-'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={() => handleApply(item)}
                        disabled={applying === id}
                        style={{
                          padding: '5px 10px',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          background: 'none',
                          fontSize: '12px',
                          fontWeight: 500,
                          cursor: applying === id ? 'not-allowed' : 'pointer',
                          opacity: applying === id ? 0.6 : 1,
                        }}
                      >
                        {applying === id ? 'Applying...' : 'Apply'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title="Add Recurring Transaction" onClose={() => setShowModal(false)}>
          <form onSubmit={handleAdd}>
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
              <label style={labelStyle}>Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="e.g. Netflix subscription"
                required
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Amount</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
                required
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Frequency</label>
              <select
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                style={inputStyle}
              >
                {FREQUENCIES.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
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
              <label style={labelStyle}>Next Due Date</label>
              <input
                type="date"
                value={form.nextDueDate}
                onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })}
                style={inputStyle}
              />
            </div>

            {formError && <div style={{ color: 'var(--expense)', fontSize: '13px', marginBottom: '16px' }}>{formError}</div>}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowModal(false)}
                style={{ padding: '8px 16px', border: '1px solid var(--border)', borderRadius: '6px', background: 'none', fontSize: '14px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="submit" disabled={saving}
                style={{ padding: '8px 16px', background: 'var(--neutral-950)', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Adding...' : 'Add Recurring'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
