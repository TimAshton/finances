import { useEffect, useState } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import CategoryPill from '../components/CategoryPill'
import type { Account, Snapshot } from '../types'
import {
  daysUntil,
  formatDate,
  formatMoney,
  formatPercent,
  FREQUENCY_LABELS,
  monthlyEquivalent,
  nextDueDate,
} from '../utils/format'

export default function Dashboard() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [snapshotBusy, setSnapshotBusy] = useState(false)

  function load() {
    Promise.all([api.getAccounts(), api.getSnapshots()]).then(([acc, snaps]) => {
      setAccounts(acc)
      setSnapshots(snaps)
      setLoading(false)
    })
  }

  useEffect(load, [])

  async function handleSnapshot() {
    setSnapshotBusy(true)
    try {
      await api.createSnapshot()
      load()
    } finally {
      setSnapshotBusy(false)
    }
  }

  if (loading) return <p className="text-muted">Loading…</p>

  const totalDebt = accounts.reduce((sum, a) => sum + a.balance, 0)
  const totalMinimums = accounts.reduce((sum, a) => sum + monthlyEquivalent(a), 0)
  const nonSubscriptions = accounts.filter((a) => a.category !== 'subscription')
  const subscriptions = accounts.filter((a) => a.category === 'subscription')
  const subscriptionsTotal = subscriptions.reduce((sum, a) => sum + monthlyEquivalent(a), 0)
  const dueSoon = nonSubscriptions
    .map((a) => ({ account: a, due: nextDueDate(a.due_day) }))
    .filter(({ due }) => daysUntil(due) <= 7)
    .sort((a, b) => a.due.getTime() - b.due.getTime())

  const chartData = snapshots.map((s) => ({
    date: formatDate(s.snapshot_date),
    total_debt: s.total_debt,
  }))

  return (
    <div>
      <h2>Dashboard</h2>

      <div className="card-grid section">
        <div className="card">
          <div className="stat-label">Total Debt</div>
          <div className="stat-value">{formatMoney(totalDebt)}</div>
        </div>
        <div className="card">
          <div className="stat-label">Minimum Payments Due This Month</div>
          <div className="stat-value">{formatMoney(totalMinimums)}</div>
        </div>
        <div className="card">
          <div className="stat-label">Active Accounts</div>
          <div className="stat-value">{accounts.length}</div>
        </div>
        <Link to="/subscriptions" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="stat-label">Subscriptions ({subscriptions.length})</div>
          <div className="stat-value">{formatMoney(subscriptionsTotal)}/mo</div>
        </Link>
      </div>

      <div className="section">
        <h3>Due in the next 7 days</h3>
        {dueSoon.length === 0 ? (
          <p className="text-muted">Nothing due soon.</p>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Due</th>
                </tr>
              </thead>
              <tbody>
                {dueSoon.map(({ account, due }) => (
                  <tr key={account.id}>
                    <td>
                      <Link to={`/accounts/${account.id}`}>{account.name}</Link>
                    </td>
                    <td>
                      <CategoryPill category={account.category} />
                    </td>
                    <td>
                      {formatMoney(account.minimum_payment)}
                      {account.billing_frequency !== 'monthly' && (
                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                          {' '}
                          ({FREQUENCY_LABELS[account.billing_frequency].toLowerCase()})
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={daysUntil(due) <= 2 ? 'pill badge-danger' : 'pill badge-warning'}>
                        {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} style={{ fontWeight: 600, borderTop: '2px solid var(--border)' }}>
                    Total
                  </td>
                  <td style={{ fontWeight: 600, borderTop: '2px solid var(--border)' }}>
                    {formatMoney(dueSoon.reduce((sum, { account }) => sum + account.minimum_payment, 0))}
                  </td>
                  <td style={{ borderTop: '2px solid var(--border)' }}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <div className="section">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h3>Month-over-month debt reduction</h3>
          <button onClick={handleSnapshot} disabled={snapshotBusy}>
            {snapshotBusy ? 'Saving…' : 'Save Today’s Snapshot'}
          </button>
        </div>
        {chartData.length === 0 ? (
          <p className="text-muted">No snapshots yet — save one to start tracking trends.</p>
        ) : (
          <div className="card" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatMoney(v)} width={90} />
                <Tooltip formatter={(v) => formatMoney(Number(v))} />
                <Line type="monotone" dataKey="total_debt" stroke="#2f5fd4" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="section">
        <h3>Accounts</h3>
        <div className="card-grid">
          {nonSubscriptions.map((a) => (
            <Link key={a.id} to={`/accounts/${a.id}`} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <strong>{a.name}</strong>
                <CategoryPill category={a.category} />
              </div>
              <div className="stat-value" style={{ marginTop: '0.5rem' }}>
                {formatMoney(a.balance)}
              </div>
              <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                {formatPercent(a.interest_rate)} APR · due {nextDueDate(a.due_day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
