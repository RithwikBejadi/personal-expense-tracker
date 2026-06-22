import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import client from '../api/client.js'
import MonthPicker from '../components/MonthPicker.jsx'
import Modal from '../components/Modal.jsx'

function formatCurrency(amount) {
  if (amount == null) return '$0'
  return '$' + Math.round(amount).toLocaleString('en-US')
}

const card = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: '20px',
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

export default function Dashboard() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [budgetData, setBudgetData] = useState(null)
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
    client.get(`/budgets/${month}/${year}`)
      .then((res) => {
        const data = res.data
        if (Array.isArray(data)) {
          setBudgetData(data.length > 0 ? { budget: data[0], summary: data[0].summary } : null)
        } else if (data.budget) {
          setBudgetData(data)
        } else {
          setBudgetData(null)
        }
      })
      .catch((err) => {
        if (err.response?.status === 404) {
          setBudgetData(null)
        } else {
          setError('Failed to load budget plan')
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
        name: budgetName || `Budget Plan ${month}/${year}`,
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
      setFormError(err.response?.data?.message || 'Failed to create budget plan')
    } finally {
      setSaving(false)
    }
  }

  const { budget, summary } = budgetData || {}
  const incomeItems = budget?.items?.filter(i => i.category?.type === 'INCOME') || []
  const expenseItems = budget?.items?.filter(i => i.category?.type === 'EXPENSE') || []

  // Ensure these are parsed numbers, falling back to 0
  const pIncome = Number(summary?.plannedIncome) || 0
  const pExpenses = Number(summary?.plannedExpenses) || 0
  const pNet = Number(summary?.plannedNet) || (pIncome - pExpenses)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px' }}>Budget Planner</h1>
        <MonthPicker month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y) }} />
      </div>

      {loading && <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading planner...</div>}
      {error && <div style={{ color: 'var(--expense)', fontSize: '14px' }}>{error}</div>}

      {!loading && !budgetData && !error && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '48px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '15px', fontWeight: 500, marginBottom: '8px' }}>No plan for this month</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
            Plan your income and expenses for this month to stay on top of your finances.
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
            Create Plan
          </button>
        </div>
      )}

      {!loading && budgetData && (
        <>
          {/* Hero card showing Projected Net */}
          <div style={{
            background: pNet < 0 ? 'var(--expense)' : 'var(--neutral-950)',
            borderRadius: 'var(--radius)',
            padding: '28px',
            marginBottom: '16px',
            color: '#FFFFFF',
            transition: 'background 0.3s',
          }}>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', marginBottom: '8px' }}>Projected Net Profit/Loss</div>
            <div style={{ fontSize: '36px', fontWeight: 600 }}>{formatCurrency(pNet)}</div>
            {pNet < 0 && (
              <div style={{ fontSize: '13px', color: '#ffb3b3', marginTop: '8px' }}>
                You are planning to spend more than you earn. Consider cutting expenses.
              </div>
            )}
          </div>

          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div style={{ ...card }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Planned Income</div>
              <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--income)' }}>{formatCurrency(pIncome)}</div>
            </div>
            <div style={{ ...card }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Planned Expenses</div>
              <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--expense)' }}>{formatCurrency(pExpenses)}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            {/* Income Planner */}
            <div style={{ ...card }}>
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>Income Categories</div>
              {incomeItems.length > 0 ? (
                incomeItems.map((item, i) => (
                  <div key={i} style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: i < incomeItems.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.category?.name || 'Income'}</span>
                      <span style={{ fontSize: '13px', fontWeight: 500 }}>{formatCurrency(item.plannedAmount)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No income planned</div>
              )}
            </div>

            {/* Expense Planner */}
            <div style={{ ...card }}>
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>Expense Categories</div>
              {expenseItems.length > 0 ? (
                expenseItems.map((item, i) => (
                  <div key={i} style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: i < expenseItems.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.category?.name || 'Expense'}</span>
                      <span style={{ fontSize: '13px', fontWeight: 500 }}>{formatCurrency(item.plannedAmount)}</span>
                    </div>
                    {/* Visual bar for how much this expense takes out of income */}
                    {pIncome > 0 && (
                      <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', marginTop: '6px' }}>
                        <div style={{
                          height: '100%',
                          background: 'var(--expense)',
                          borderRadius: '2px',
                          width: `${Math.min(100, (item.plannedAmount / pIncome) * 100)}%`,
                        }} />
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No expenses planned</div>
              )}
            </div>
          </div>
        </>
      )}

      {showCreateModal && (
        <Modal title="Create Budget Plan" onClose={() => setShowCreateModal(false)}>
          <form onSubmit={handleCreate}>
            <div style={{ marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>Planned Items</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '16px' }}>
              Add expected income and expenses for this month to calculate your projected net.
            </div>

            {items.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                <select
                  value={item.categoryId}
                  onChange={(e) => updateItem(i, 'categoryId', e.target.value)}
                  style={{ ...inputStyle, flex: 2 }}
                >
                  <option value="">Category</option>
                  {categories.map((c) => (
                    <option key={c.id || c._id} value={c.id || c._id}>
                      {c.name} ({c.type})
                    </option>
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
              + Add Income/Expense
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
                {saving ? 'Saving...' : 'Save Plan'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

