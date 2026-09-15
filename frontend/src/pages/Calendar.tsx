import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import CategoryPill from '../components/CategoryPill'
import type { Account } from '../types'
import { formatMoney, FREQUENCY_LABELS } from '../utils/format'

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export default function Calendar() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [cursor, setCursor] = useState(startOfMonth(new Date()))

  useEffect(() => {
    api.getAccounts().then((accs) => setAccounts(accs.filter((a) => a.category !== 'subscription')))
  }, [])

  const today = new Date()
  const isCurrentMonth = cursor.getFullYear() === today.getFullYear() && cursor.getMonth() === today.getMonth()

  const weeks = useMemo(() => {
    const year = cursor.getFullYear()
    const month = cursor.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstWeekday = new Date(year, month, 1).getDay()

    const billsByDay = new Map<number, Account[]>()
    for (const a of accounts) {
      const day = Math.min(a.due_day, daysInMonth)
      billsByDay.set(day, [...(billsByDay.get(day) ?? []), a])
    }

    const cells: { day: number | null; bills: Account[] }[] = []
    for (let i = 0; i < firstWeekday; i++) cells.push({ day: null, bills: [] })
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({ day, bills: billsByDay.get(day) ?? [] })
    }
    while (cells.length % 7 !== 0) cells.push({ day: null, bills: [] })

    const result: (typeof cells)[] = []
    for (let i = 0; i < cells.length; i += 7) result.push(cells.slice(i, i + 7))
    return result
  }, [cursor, accounts])

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>Bill Calendar</h2>
        <div className="row">
          <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
            &larr; Prev
          </button>
          <strong>{cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong>
          <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
            Next &rarr;
          </button>
        </div>
      </div>

      <div className="card section" style={{ padding: '0.75rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.4rem' }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="text-muted" style={{ fontSize: '0.75rem', textAlign: 'center' }}>
              {d}
            </div>
          ))}
          {weeks.flat().map((cell, i) => {
            const isToday = isCurrentMonth && cell.day === today.getDate()
            const isOverdue = isCurrentMonth && cell.day !== null && cell.day < today.getDate()
            return (
              <div
                key={i}
                className="card"
                style={{
                  minHeight: 84,
                  padding: '0.4rem',
                  background: cell.day === null ? 'transparent' : undefined,
                  border: cell.day === null ? 'none' : undefined,
                  outline: isToday ? '2px solid var(--primary)' : undefined,
                }}
              >
                {cell.day && (
                  <>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                      {cell.day}
                    </div>
                    {cell.bills.map((b) => (
                      <Link
                        key={b.id}
                        to={`/accounts/${b.id}`}
                        title={`${b.name} — ${formatMoney(b.minimum_payment)}${
                          b.billing_frequency !== 'monthly' ? ` (${FREQUENCY_LABELS[b.billing_frequency].toLowerCase()}, not every month)` : ''
                        }`}
                        style={{
                          display: 'block',
                          fontSize: '0.72rem',
                          marginTop: '0.2rem',
                          textDecoration: 'none',
                          color: isOverdue ? 'var(--danger)' : 'var(--text)',
                          fontWeight: isOverdue ? 600 : 400,
                        }}
                      >
                        {b.name}
                      </Link>
                    ))}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="section">
        <h3>This month's bills</h3>
        <div className="card-grid">
          {accounts.map((a) => (
            <div key={a.id} className="card">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <Link to={`/accounts/${a.id}`}>{a.name}</Link>
                <CategoryPill category={a.category} />
              </div>
              <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                Due day {a.due_day} · {formatMoney(a.minimum_payment)}
                {a.billing_frequency !== 'monthly' && ` · ${FREQUENCY_LABELS[a.billing_frequency]}`}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
