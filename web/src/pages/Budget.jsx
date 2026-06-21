import { useState, useEffect, useCallback } from 'react'
import client from '../api/client.js'
import Modal from '../components/Modal.jsx'
import MonthPicker from '../components/MonthPicker.jsx'

function formatCurrency(amount) {
  if (amount == null) return '$0'
  return '$' + Math.round(amount).toLocaleString('en-US')
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

const labelStyle = { display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }

export default function Budget() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [budget, setBudget] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState([])

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [budgetName, setBudgetName] = useState('')
  const [items, setItems] = useState([{ categoryId: '', amount: '' }])
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const fetchBudget = useCallback(() => {
    setLoading(true)
    setError('')
    client.get(`/budgets?month=${month}&year=${year}`)
      .then((res) => {
        const data = res.data
        setBudget(Array.isArray(data) ? (data[0] || null) : (data.budget || data || null))
      })
      .catch((err) => {
        if (err.response?.status === 404) {
          setBudget(null)
        } else {
          setError('Failed to load budget')
        }
      })
      .finally(() => setLoading(false))
  }, [month, year])

  useEffect(() => { fetchBudget() }, [fetchBudget])

  useEffect(() => {
    client.get('/categories')
      .then((res) => setCategories(res.data.categories || res.data || []))
      .catch(() => {})
  }, [])

  function addItem() {
    setItems([...items, { categoryId: '', amount: '' }])
  }

  function updateItem(i, field, value) {
    const updated = [...items]
    updated[i][field] = value
    setItems(updated)
  }

  function removeItem(i) {
    setItems(items.filter((_, idx) => idx !== i))
  }

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      await client.post('/budgets', {
        name: budgetName,
        month,
        year,
        items: items.filter((it) => it.categoryId && it.amount).map((it) => ({
          categoryId: it.categoryId,
          amount: parseFloat(it.amount),
        })),
      })
      setShowCreateModal(false)
      setBudgetName('')
      setItems([{ categoryId: '', amount: '' }])
      fetchBudget()
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create budget')
    } finally {
      setSaving(false)
    }
  }

  const totalPlanned = budget?.items?.reduce((sum, it) => sum + (it.amount || 0), 0) || 0
  const totalSpent = budget?.items?.reduce((sum, it) => sum + (it.spent || 0), 0) || 0
  const progressPct = totalPlanned > 0 ? Math.min(100, (totalSpent / totalPlanned) * 100) : 0

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px' }}>Budget</h1>
        <MonthPicker month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y) }} />
      </div>

      {loading && <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading...</div>}
      {error && <div style={{ color: 'var(--expense)', fontSize: '14px' }}>{error}</div>}

      {!loading && !budget && !error && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '48px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '15px', fontWeight: 500, marginBottom: '8px' }}>No budget for this month</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
            Create a budget to track your spending against targets.
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: '8px 20px',
              background: 'var(--neutral-950)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Create Budget
          </button>
        </div>
      )}

      {!loading && budget && (
        <div>
          {/* Summary card */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '24px',
            marginBottom: '16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>{budget.name}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {formatCurrency(totalSpent)} spent of {formatCurrency(totalPlanned)}
                </div>
              </div>
              <div style={{ fontSize: '20px', fontWeight: 600 }}>{Math.round(progressPct)}%</div>
            </div>
            <div style={{ height: '8px', background: 'var(--border)', borderRadius: '4px' }}>
              <div style={{
                height: '100%',
                background: progressPct > 90 ? 'var(--expense)' : 'var(--neutral-950)',
                borderRadius: '4px',
                width: `${progressPct}%`,
                transition: 'width 0.3s',
              }} />
            </div>
          </div>

          {/* Item breakdown */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            overflow: 'hidden',
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontSize: '14px', fontWeight: 600 }}>
              Category Breakdown
            </div>
            {budget.items && budget.items.length > 0 ? (
              budget.items.map((item, i) => {
                const pct = item.amount > 0 ? Math.min(100, ((item.spent || 0) / item.amount) * 100) : 0
                return (
                  <div key={i} style={{ padding: '16px 20px', borderBottom: i < budget.items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 500 }}>
                        {item.category?.name || item.categoryName || item.category || 'Unknown'}
                      </span>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {formatCurrency(item.spent || 0)} / {formatCurrency(item.amount)}
                      </span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px' }}>
                      <div style={{
                        height: '100%',
                        background: pct > 90 ? 'var(--expense)' : 'var(--neutral-950)',
                        borderRadius: '3px',
                        width: `${pct}%`,
                      }} />
                    </div>
                  </div>
                )
              })
            ) : (
              <div style={{ padding: '24px 20px', color: 'var(--text-muted)', fontSize: '13px' }}>
                No budget items
              </div>
            )}
          </div>
        </div>
      )}

      {showCreateModal && (
        <Modal title="Create Budget" onClose={() => setShowCreateModal(false)}>
          <form onSubmit={handleCreate}>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Budget Name</label>
              <input
                type="text"
                value={budgetName}
                onChange={(e) => setBudgetName(e.target.value)}
                placeholder="e.g. June 2025"
                required
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>Budget Items</div>

            {items.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                <select
                  value={item.categoryId}
                  onChange={(e) => updateItem(i, 'categoryId', e.target.value)}
                  style={{ ...inputStyle, flex: 2 }}
                >
                  <option value="">Category</option>
                  {categories.map((c) => (
                    <option key={c.id || c._id} value={c.id || c._id}>{c.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0"
                  value={item.amount}
                  onChange={(e) => updateItem(i, 'amount', e.target.value)}
                  placeholder="Amount"
                  style={{ ...inputStyle, flex: 1 }}
                />
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px', padding: '0 4px' }}
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addItem}
              style={{
                padding: '6px 12px',
                border: '1px dashed var(--border)',
                borderRadius: '6px',
                background: 'none',
                fontSize: '13px',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                marginBottom: '20px',
                width: '100%',
              }}
            >
              + Add Item
            </button>

            {formError && <div style={{ color: 'var(--expense)', fontSize: '13px', marginBottom: '16px' }}>{formError}</div>}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ padding: '8px 16px', border: '1px solid var(--border)', borderRadius: '6px', background: 'none', fontSize: '14px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{ padding: '8px 16px', background: 'var(--neutral-950)', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
              >
                {saving ? 'Creating...' : 'Create Budget'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
