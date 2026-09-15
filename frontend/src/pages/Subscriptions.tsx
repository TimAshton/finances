import { useEffect, useState } from 'react'
import { api } from '../api/client'
import AccountForm from '../components/AccountForm'
import type { Account, AccountInput } from '../types'
import { formatMoney, monthlyEquivalent } from '../utils/format'

export default function Subscriptions() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)

  function load() {
    setLoading(true)
    api
      .getAccounts()
      .then((accs) => setAccounts(accs.filter((a) => a.category === 'subscription')))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

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

  if (loading) return <p className="text-muted">Loading subscriptions…</p>

  const totalMonthly = accounts.reduce((sum, a) => sum + monthlyEquivalent(a), 0)

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h2>Subscriptions</h2>
        {!showForm && (
          <button className="primary" onClick={() => setShowForm(true)}>
            + Add Subscription
          </button>
        )}
      </div>

      <div className="card-grid section">
        <div className="card">
          <div className="stat-label">Total Monthly Cost</div>
          <div className="stat-value">{formatMoney(totalMonthly)}</div>
        </div>
        <div className="card">
          <div className="stat-label">Active Subscriptions</div>
          <div className="stat-value">{accounts.length}</div>
        </div>
      </div>

      {showForm && (
        <AccountForm
          initial={{ category: 'subscription' }}
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
          submitLabel="Add Subscription"
        />
      )}

      {editing && (
        <AccountForm
          initial={editing}
          onSubmit={handleUpdate}
          onCancel={() => setEditing(null)}
          submitLabel="Save Changes"
        />
      )}

      {accounts.length === 0 ? (
        <p className="text-muted">No subscriptions yet. Add one, or import from .env in Settings.</p>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Amount</th>
                <th>Due Day</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id}>
                  <td>
                    {a.name}
                    {a.url && (
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Manage subscription"
                        style={{ marginLeft: '0.4rem' }}
                      >
                        &#8599;
                      </a>
                    )}
                  </td>
                  <td>{formatMoney(a.minimum_payment)}</td>
                  <td>{a.due_day}</td>
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
