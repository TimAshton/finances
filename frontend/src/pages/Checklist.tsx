import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import CategoryPill from '../components/CategoryPill'
import type { Account, ChecklistEntry } from '../types'
import { formatDate, formatMoney, FREQUENCY_LABELS } from '../utils/format'

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function Checklist() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [entries, setEntries] = useState<Map<string, ChecklistEntry>>(new Map())
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  // Month whose entries are currently in `entries`; differs from `month` while a fetch is in flight.
  const [loadedMonth, setLoadedMonth] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)

  const month = monthKey(cursor)

  useEffect(() => {
    api.getAccounts().then((accs) => setAccounts([...accs].sort((a, b) => a.due_day - b.due_day)))
  }, [])

  useEffect(() => {
    api.getChecklist(month).then((list) => {
      setEntries(new Map(list.map((e) => [e.account_id, e])))
      setLoadedMonth(month)
    })
  }, [month])

  const loading = loadedMonth !== month

  async function toggle(account: Account) {
    setSaving(account.id)
    try {
      const next = new Map(entries)
      if (entries.has(account.id)) {
        await api.unmarkChecklistPaid(month, account.id)
        next.delete(account.id)
      } else {
        next.set(account.id, await api.markChecklistPaid(month, account.id))
      }
      setEntries(next)
    } finally {
      setSaving(null)
    }
  }

  const today = new Date()
  const isCurrentMonth = month === monthKey(today)
  const isPastMonth = month < monthKey(today)
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()

  const paid = accounts.filter((a) => entries.has(a.id))
  const unpaid = accounts.filter((a) => !entries.has(a.id))
  const paidTotal = paid.reduce((sum, a) => sum + a.minimum_payment, 0)
  const unpaidTotal = unpaid.reduce((sum, a) => sum + a.minimum_payment, 0)

  function isOverdue(a: Account): boolean {
    if (entries.has(a.id)) return false
    if (isPastMonth) return true
    return isCurrentMonth && Math.min(a.due_day, daysInMonth) < today.getDate()
  }

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h2>Monthly Checklist</h2>
        <div className="row">
          <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
            &larr; Prev
          </button>
          <strong>{cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong>
          <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
            Next &rarr;
          </button>
          {!isCurrentMonth && (
            <button onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}>
              This month
            </button>
          )}
        </div>
      </div>

      <div className="card-grid section">
        <div className="card">
          <div className="stat-label">Paid</div>
          <div className="stat-value text-success">
            {paid.length} / {accounts.length}
          </div>
          <div className="text-muted">{formatMoney(paidTotal)}</div>
        </div>
        <div className="card">
          <div className="stat-label">Still to pay</div>
          <div className={`stat-value${unpaid.length ? ' text-danger' : ''}`}>{unpaid.length}</div>
          <div className="text-muted">{formatMoney(unpaidTotal)}</div>
        </div>
      </div>

      {accounts.length === 0 ? (
        <p className="text-muted">No accounts yet. Add some on the Accounts page, or import from .env in Settings.</p>
      ) : loading ? (
        <p className="text-muted">Loading checklist…</p>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: '3rem' }}>Paid</th>
                <th>Bill</th>
                <th>Category</th>
                <th>Due Day</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => {
                const entry = entries.get(a.id)
                const overdue = isOverdue(a)
                return (
                  <tr key={a.id} style={{ opacity: entry ? 0.6 : 1 }}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Mark ${a.name} paid`}
                        checked={!!entry}
                        disabled={saving === a.id}
                        onChange={() => toggle(a)}
                        style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ textDecoration: entry ? 'line-through' : undefined }}>
                      <Link to={`/accounts/${a.id}`}>{a.name}</Link>
                      {a.url && (
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Pay bill"
                          style={{ marginLeft: '0.4rem' }}
                        >
                          &#8599;
                        </a>
                      )}
                    </td>
                    <td>
                      <CategoryPill category={a.category} />
                    </td>
                    <td>{a.due_day}</td>
                    <td>
                      {formatMoney(a.minimum_payment)}
                      {a.billing_frequency !== 'monthly' && (
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                          {FREQUENCY_LABELS[a.billing_frequency]}
                        </div>
                      )}
                    </td>
                    <td>
                      {entry ? (
                        <span className="text-success">Paid {formatDate(entry.paid_on)}</span>
                      ) : overdue ? (
                        <span className="text-danger" style={{ fontWeight: 600 }}>
                          Overdue
                        </span>
                      ) : (
                        <span className="text-muted">Not paid</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.75rem' }}>
        Checking a bill off only records that it's paid for this month — it doesn't change the account balance.
        Use the Payment Log on an account's page for that.
      </p>
    </div>
  )
}
