import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import client from '../api/client.js'
import MonthPicker from '../components/MonthPicker.jsx'

function formatCurrency(amount) {
  if (amount == null) return '$0'
  return '$' + Math.round(amount).toLocaleString('en-US')
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  try {
    return format(new Date(dateStr), 'MMM d, yyyy')
  } catch {
    return dateStr
  }
}

const card = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: '20px',
}

export default function Dashboard() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    client.get(`/transactions/summary?month=${month}&year=${year}`)
      .then((res) => setSummary(res.data))
      .catch(() => setError('Failed to load summary'))
      .finally(() => setLoading(false))
  }, [month, year])

  const chartData = summary ? [
    { name: 'Income', amount: summary.totalIncome || 0 },
    { name: 'Expenses', amount: summary.totalExpense || 0 },
  ] : []

  const net = (summary?.totalIncome || 0) - (summary?.totalExpense || 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px' }}>Dashboard</h1>
        <MonthPicker month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y) }} />
      </div>

      {loading && <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading...</div>}
      {error && <div style={{ color: 'var(--expense)', fontSize: '14px' }}>{error}</div>}

      {!loading && summary && (
        <>
          {/* Hero card */}
          <div style={{
            background: 'var(--neutral-950)',
            borderRadius: 'var(--radius)',
            padding: '28px',
            marginBottom: '16px',
            color: '#FFFFFF',
          }}>
            <div style={{ fontSize: '13px', color: '#A3A3A3', marginBottom: '8px' }}>Net Balance</div>
            <div style={{ fontSize: '36px', fontWeight: 600 }}>{formatCurrency(net)}</div>
          </div>

          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div style={{ ...card }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Income</div>
              <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--income)' }}>{formatCurrency(summary.totalIncome)}</div>
            </div>
            <div style={{ ...card }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Expenses</div>
              <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--expense)' }}>{formatCurrency(summary.totalExpense)}</div>
            </div>
          </div>

          {/* Chart + Category breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            {/* Bar chart */}
            <div style={{ ...card }}>
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>Income vs Expenses</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} barSize={48}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    formatter={(val) => formatCurrency(val)}
                    contentStyle={{ border: '1px solid var(--border)', borderRadius: '6px', fontSize: '13px' }}
                  />
                  <Bar dataKey="amount" fill="var(--neutral-950)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top categories */}
            <div style={{ ...card }}>
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>Spending by Category</div>
              {summary.categoryBreakdown && summary.categoryBreakdown.length > 0 ? (
                summary.categoryBreakdown.slice(0, 5).map((cat, i) => (
                  <div key={i} style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{cat.category}</span>
                      <span style={{ fontSize: '13px', fontWeight: 500 }}>{formatCurrency(cat.amount)}</span>
                    </div>
                    <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px' }}>
                      <div style={{
                        height: '100%',
                        background: 'var(--neutral-950)',
                        borderRadius: '2px',
                        width: `${Math.min(100, (cat.amount / (summary.totalExpense || 1)) * 100)}%`,
                      }} />
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No category data</div>
              )}
            </div>
          </div>

          {/* Recent transactions */}
          <div style={{ ...card }}>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>Recent Transactions</div>
            {summary.recentTransactions && summary.recentTransactions.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Date', 'Description', 'Category', 'Amount'].map((h) => (
                      <th key={h} style={{
                        textAlign: 'left',
                        fontSize: '12px',
                        color: 'var(--text-muted)',
                        fontWeight: 500,
                        padding: '0 0 10px',
                        borderBottom: '1px solid var(--border)',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {summary.recentTransactions.slice(0, 5).map((tx) => (
                    <tr key={tx.id || tx._id}>
                      <td style={{ padding: '10px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {formatDate(tx.date)}
                      </td>
                      <td style={{ padding: '10px 8px 10px 0', fontSize: '13px' }}>{tx.description}</td>
                      <td style={{ padding: '10px 8px 10px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {tx.category?.name || tx.category || '-'}
                      </td>
                      <td style={{
                        padding: '10px 0',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: tx.type === 'INCOME' ? 'var(--income)' : 'var(--expense)',
                      }}>
                        {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No transactions this month</div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
