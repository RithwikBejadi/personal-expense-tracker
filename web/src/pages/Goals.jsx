import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import client from '../api/client.js'
import Modal from '../components/Modal.jsx'

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

const labelStyle = { display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }

export default function Goals() {
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [goalDeposits, setGoalDeposits] = useState({})

  const [showAddModal, setShowAddModal] = useState(false)
  const [form, setForm] = useState({ name: '', targetAmount: '', targetDate: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [depositModal, setDepositModal] = useState(null)
  const [depositAmount, setDepositAmount] = useState('')
  const [depositNote, setDepositNote] = useState('')
  const [depositSaving, setDepositSaving] = useState(false)
  const [depositError, setDepositError] = useState('')

  function fetchGoals() {
    setLoading(true)
    client.get('/goals')
      .then((res) => setGoals(res.data.goals || res.data || []))
      .catch(() => setError('Failed to load goals'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchGoals() }, [])

  function toggleExpand(goal) {
    const id = goal.id || goal._id
    if (expandedId === id) {
      setExpandedId(null)
    } else {
      setExpandedId(id)
      if (!goalDeposits[id]) {
        client.get(`/goals/${id}/deposits`)
          .then((res) => {
            setGoalDeposits((prev) => ({ ...prev, [id]: res.data.deposits || res.data || [] }))
          })
          .catch(() => {
            setGoalDeposits((prev) => ({ ...prev, [id]: [] }))
          })
      }
    }
  }

  async function handleAddGoal(e) {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      await client.post('/goals', {
        name: form.name,
        targetAmount: parseFloat(form.targetAmount),
        targetDate: form.targetDate || undefined,
      })
      setShowAddModal(false)
      setForm({ name: '', targetAmount: '', targetDate: '' })
      fetchGoals()
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create goal')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeposit(e) {
    e.preventDefault()
    setDepositSaving(true)
    setDepositError('')
    const id = depositModal.id || depositModal._id
    try {
      await client.post(`/goals/${id}/deposits`, {
        amount: parseFloat(depositAmount),
        note: depositNote || undefined,
      })
      setDepositModal(null)
      setDepositAmount('')
      setDepositNote('')
      setGoalDeposits((prev) => ({ ...prev, [id]: undefined }))
      fetchGoals()
    } catch (err) {
      setDepositError(err.response?.data?.message || 'Failed to add deposit')
    } finally {
      setDepositSaving(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px' }}>Goals</h1>
        <button
          onClick={() => setShowAddModal(true)}
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
          + Add Goal
        </button>
      </div>

      {loading && <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading...</div>}
      {error && <div style={{ color: 'var(--expense)', fontSize: '14px' }}>{error}</div>}

      {!loading && goals.length === 0 && !error && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '48px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '15px', fontWeight: 500, marginBottom: '8px' }}>No savings goals yet</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Create a goal to start saving towards a target.</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {goals.map((goal) => {
          const id = goal.id || goal._id
          const saved = goal.savedAmount || goal.currentAmount || 0
          const target = goal.targetAmount || 0
          const pct = target > 0 ? Math.min(100, (saved / target) * 100) : 0
          const isExpanded = expandedId === id
          const deposits = goalDeposits[id]

          return (
            <div
              key={id}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '20px', cursor: 'pointer' }} onClick={() => toggleExpand(goal)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 600 }}>{goal.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {Math.round(pct)}%
                  </div>
                </div>

                <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px', marginBottom: '10px' }}>
                  <div style={{
                    height: '100%',
                    background: pct >= 100 ? 'var(--income)' : 'var(--neutral-950)',
                    borderRadius: '3px',
                    width: `${pct}%`,
                  }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {formatCurrency(saved)} / {formatCurrency(target)}
                  </span>
                  {goal.targetDate && (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Target: {formatDate(goal.targetDate)}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ padding: '0 20px 16px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setDepositModal(goal) }}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    background: 'none',
                    fontSize: '13px',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  + Add Deposit
                </button>
              </div>

              {isExpanded && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '16px 20px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-secondary)' }}>
                    Deposit History
                  </div>
                  {!deposits ? (
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Loading...</div>
                  ) : deposits.length === 0 ? (
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No deposits yet</div>
                  ) : (
                    deposits.map((d, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          {formatDate(d.date || d.createdAt)} {d.note ? `— ${d.note}` : ''}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--income)' }}>
                          +{formatCurrency(d.amount)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showAddModal && (
        <Modal title="Add Goal" onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleAddGoal}>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Goal Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Emergency Fund"
                required
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Target Amount</label>
              <input
                type="number"
                min="0"
                value={form.targetAmount}
                onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
                placeholder="0"
                required
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Target Date (optional)</label>
              <input
                type="date"
                value={form.targetDate}
                onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
                style={inputStyle}
              />
            </div>

            {formError && <div style={{ color: 'var(--expense)', fontSize: '13px', marginBottom: '16px' }}>{formError}</div>}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowAddModal(false)}
                style={{ padding: '8px 16px', border: '1px solid var(--border)', borderRadius: '6px', background: 'none', fontSize: '14px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="submit" disabled={saving}
                style={{ padding: '8px 16px', background: 'var(--neutral-950)', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Creating...' : 'Create Goal'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {depositModal && (
        <Modal title={`Add Deposit — ${depositModal.name}`} onClose={() => setDepositModal(null)}>
          <form onSubmit={handleDeposit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Amount</label>
              <input
                type="number"
                min="0"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="0"
                required
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Note (optional)</label>
              <input
                type="text"
                value={depositNote}
                onChange={(e) => setDepositNote(e.target.value)}
                placeholder="e.g. Monthly savings"
                style={inputStyle}
              />
            </div>

            {depositError && <div style={{ color: 'var(--expense)', fontSize: '13px', marginBottom: '16px' }}>{depositError}</div>}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setDepositModal(null)}
                style={{ padding: '8px 16px', border: '1px solid var(--border)', borderRadius: '6px', background: 'none', fontSize: '14px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="submit" disabled={depositSaving}
                style={{ padding: '8px 16px', background: 'var(--neutral-950)', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 500, cursor: depositSaving ? 'not-allowed' : 'pointer', opacity: depositSaving ? 0.7 : 1 }}>
                {depositSaving ? 'Adding...' : 'Add Deposit'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
