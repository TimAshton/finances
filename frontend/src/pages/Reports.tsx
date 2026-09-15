import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api } from '../api/client'
import type { Account, Payment, Snapshot } from '../types'
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  FREQUENCY_MONTHS,
  formatDate,
  formatMoney,
  monthlyEquivalent,
} from '../utils/format'

// Average of the most recent logged payments, so a bill that varies each
// cycle (electric, water, ...) reports real recent spend instead of the
// static minimum_payment estimate. Falls back to null until payments exist.
function recentAverageAmount(accountPayments: Payment[]): number | null {
  if (accountPayments.length === 0) return null
  const recent = [...accountPayments].sort((a, b) => b.paid_on.localeCompare(a.paid_on)).slice(0, 3)
  return recent.reduce((sum, p) => sum + p.amount, 0) / recent.length
}

export default function Reports() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [payments, setPayments] = useState<(Payment & { rate: number })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getAccounts().then(async (accs) => {
      setAccounts(accs)
      const perAccountPayments = await Promise.all(
        accs.map(async (a) => {
          const list = await api.getPayments(a.id)
          return list.map((p) => ({ ...p, rate: a.interest_rate }))
        })
      )
      setPayments(perAccountPayments.flat())
      setLoading(false)
    })
    api.getSnapshots().then(setSnapshots)
  }, [])

  if (loading) return <p className="text-muted">Loading…</p>

  const paymentsByAccount = new Map<string, Payment[]>()
  for (const p of payments) {
    const list = paymentsByAccount.get(p.account_id) ?? []
    list.push(p)
    paymentsByAccount.set(p.account_id, list)
  }

  const byCategory = new Map<string, number>()
  for (const a of accounts) {
    const recentAvg = recentAverageAmount(paymentsByAccount.get(a.id) ?? [])
    const monthly = recentAvg != null ? recentAvg / FREQUENCY_MONTHS[a.billing_frequency] : monthlyEquivalent(a)
    byCategory.set(a.category, (byCategory.get(a.category) ?? 0) + monthly)
  }
  const categoryData = [...byCategory.entries()].map(([category, amount]) => ({
    category: CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS],
    amount,
    fill: CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS],
  }))

  const debtData = snapshots.map((s) => ({ date: formatDate(s.snapshot_date), total_debt: s.total_debt }))

  // Approximate interest paid per payment: prior balance implied by the
  // payment amount and resulting balance, times the account's current
  // monthly rate. The Payment Log doesn't store an interest/principal
  // split, so this is an estimate, not an exact ledger figure.
  const interestByMonth = new Map<string, number>()
  for (const p of payments) {
    const priorBalance = p.new_balance + p.amount
    const interest = priorBalance * (p.rate / 12)
    const month = p.paid_on.slice(0, 7)
    interestByMonth.set(month, (interestByMonth.get(month) ?? 0) + interest)
  }
  const interestData = [...interestByMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, interest]) => ({ month, interest }))

  const netDebtDelta =
    snapshots.length >= 2 ? snapshots[0].total_debt - snapshots[snapshots.length - 1].total_debt : null

  return (
    <div>
      <h2>Reports</h2>

      <div className="section">
        <h3>Monthly spending by category</h3>
        <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '-0.5rem' }}>
          Uses the average of each account's last 3 logged payments where available, otherwise its minimum payment estimate.
        </p>
        {categoryData.length === 0 ? (
          <p className="text-muted">No accounts yet.</p>
        ) : (
          <div className="card" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatMoney(v)} width={90} />
                <Tooltip formatter={(v) => formatMoney(Number(v))} />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="section">
        <h3>Debt reduction over time</h3>
        {debtData.length === 0 ? (
          <p className="text-muted">Save snapshots from the Dashboard to build this chart.</p>
        ) : (
          <div className="card" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={debtData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
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
        <h3>Interest paid over time (estimated)</h3>
        {interestData.length === 0 ? (
          <p className="text-muted">Log payments to see this chart.</p>
        ) : (
          <div className="card" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={interestData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatMoney(v)} width={90} />
                <Tooltip formatter={(v) => formatMoney(Number(v))} />
                <Bar dataKey="interest" fill="#d4483e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="section">
        <h3>Net debt trend</h3>
        {netDebtDelta === null ? (
          <p className="text-muted">Need at least two snapshots to show a trend.</p>
        ) : (
          <div className="card">
            <div className="stat-label">Change since first snapshot</div>
            <div className={`stat-value ${netDebtDelta >= 0 ? 'text-success' : 'text-danger'}`}>
              {netDebtDelta >= 0 ? '-' : '+'}
              {formatMoney(Math.abs(netDebtDelta))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
