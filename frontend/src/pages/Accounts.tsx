import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import AccountForm from '../components/AccountForm'
import CategoryPill from '../components/CategoryPill'
import type { Account, AccountInput } from '../types'
import { FREQUENCY_LABELS, formatMoney, formatPercent, nextDueDate } from '../utils/format'

type SortKey = 'balance' | 'interest_rate' | 'due_day' | 'minimum_payment'

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('balance')
  const [sortDir, setSortDir] = useState<1 | -1>(-1)

  function load() {
    setLoading(true)
    api
      .getAccounts()
      .then((accs) => setAccounts(accs.filter((a) => a.category !== 'subscription')))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const sorted = useMemo(() => {
    const copy = [...accounts]
    copy.sort((a, b) => (a[sortKey] - b[sortKey]) * sortDir)
    return copy
  }, [accounts, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 1 ? -1 : 1))
    } else {
      setSortKey(key)
      setSortDir(-1)
    }
  }

  async function handleCreate(data: AccountInput) {
    await api.createAccount(data)
    setShowForm(false)
    load()
  }

  async function handleUpdate(data: AccountInput) {
    if (!editing) return
    await api.updateAccount(editing.id, data)
    setEditing(null)
    load()
  }

  async function handleDeactivate(account: Account) {
    if (!confirm(`Deactivate "${account.name}"? It will be hidden from active lists.`)) return
    await api.deactivateAccount(account.id)
    load()
  }

  if (loading) return <p className="text-muted">Loading accounts…</p>

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h2>Accounts</h2>
        {!showForm && (
          <button className="primary" onClick={() => setShowForm(true)}>
            + Add Account
          </button>
        )}
      </div>

      {showForm && (
        <AccountForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} submitLabel="Add Account" />
      )}

      {editing && (
        <AccountForm
          initial={editing}
          onSubmit={handleUpdate}
          onCancel={() => setEditing(null)}
          submitLabel="Save Changes"
        />
      )}

      {sorted.length === 0 ? (
        <p className="text-muted">No accounts yet. Add one, or import from .env in Settings.</p>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th onClick={() => toggleSort('balance')}>Balance {sortKey === 'balance' ? (sortDir === 1 ? '↑' : '↓') : ''}</th>
                <th onClick={() => toggleSort('interest_rate')}>
                  Rate {sortKey === 'interest_rate' ? (sortDir === 1 ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => toggleSort('minimum_payment')}>
                  Min. Payment {sortKey === 'minimum_payment' ? (sortDir === 1 ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => toggleSort('due_day')}>
                  Next Due {sortKey === 'due_day' ? (sortDir === 1 ? '↑' : '↓') : ''}
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((a) => (
                <tr key={a.id}>
                  <td>
                    <Link to={`/accounts/${a.id}`}>{a.name}</Link>
                    {a.url && (
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Pay / visit site"
                        style={{ marginLeft: '0.4rem' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        &#8599;
                      </a>
                    )}
                  </td>
                  <td>
                    <CategoryPill category={a.category} />
                  </td>
                  <td>{formatMoney(a.balance)}</td>
                  <td>{formatPercent(a.interest_rate)}</td>
                  <td>
                    {formatMoney(a.minimum_payment)}
                    {a.billing_frequency !== 'monthly' && (
                      <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                        {' '}
                        / {FREQUENCY_LABELS[a.billing_frequency].toLowerCase()}
                      </span>
                    )}
                  </td>
                  <td>{nextDueDate(a.due_day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                  <td className="row">
                    <button onClick={() => setEditing(a)}>Edit</button>
                    <button className="danger" onClick={() => handleDeactivate(a)}>
                      Deactivate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
