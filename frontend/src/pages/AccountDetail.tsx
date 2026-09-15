import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import CategoryPill from '../components/CategoryPill'
import type { Account, Payment, PayoffScenario } from '../types'
import { formatDate, formatMoney, formatPercent, FREQUENCY_LABELS, monthsFromNowLabel } from '../utils/format'

function ScenarioCard({ title, scenario }: { title: string; scenario: PayoffScenario | null }) {
  return (
    <div className="card">
      <div className="stat-label">{title}</div>
      {!scenario ? (
        <p className="text-muted">—</p>
      ) : scenario.payoff_impossible ? (
        <p className="text-danger">Payment doesn't cover interest — balance won't shrink.</p>
      ) : (
        <>
          <div className="stat-value">{monthsFromNowLabel(scenario.months_to_payoff)}</div>
          <div className="text-muted" style={{ fontSize: '0.85rem' }}>
            {scenario.months_to_payoff?.toFixed(1)} months · {formatMoney(scenario.total_interest ?? 0)} interest
          </div>
        </>
      )}
    </div>
  )
}

export default function AccountDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [account, setAccount] = useState<Account | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [minScenario, setMinScenario] = useState<PayoffScenario | null>(null)
  const [customPayment, setCustomPayment] = useState<number>(0)
  const [customScenario, setCustomScenario] = useState<PayoffScenario | null>(null)
  const [extraAmount, setExtraAmount] = useState<number>(0)
  const [extraScenario, setExtraScenario] = useState<PayoffScenario | null>(null)

  const [paymentAmount, setPaymentAmount] = useState<number>(0)
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10))
  const [paymentNotes, setPaymentNotes] = useState('')
  const [saving, setSaving] = useState(false)

  function load() {
    if (!id) return
    api.getAccount(id).then((a) => {
      setAccount(a)
      setCustomPayment(a.minimum_payment)
      if (a.category !== 'rental_property') {
        api.getPayoffScenario(id, a.minimum_payment).then(setMinScenario)
      }
    })
    api.getPayments(id).then(setPayments)
  }

  useEffect(load, [id])

  async function calculateCustom() {
    if (!id || customPayment <= 0) return
    setCustomScenario(await api.getPayoffScenario(id, customPayment))
  }

  async function calculateExtra() {
    if (!id || !account) return
    setExtraScenario(await api.getPayoffScenario(id, account.minimum_payment + extraAmount))
  }

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!id || paymentAmount <= 0) return
    setSaving(true)
    try {
      await api.createPayment(id, { amount: paymentAmount, paid_on: paymentDate, notes: paymentNotes })
      setPaymentAmount(0)
      setPaymentNotes('')
      load()
    } finally {
      setSaving(false)
    }
  }

  if (!account) return <p className="text-muted">Loading…</p>

  return (
    <div>
      <Link to="/accounts">&larr; All Accounts</Link>
      <div className="row" style={{ justifyContent: 'space-between', marginTop: '0.5rem' }}>
        <h2>{account.name}</h2>
        <div className="row">
          {account.url && (
            <a href={account.url} target="_blank" rel="noopener noreferrer">
              <button type="button">Pay / Visit Site &#8599;</button>
            </a>
          )}
          <CategoryPill category={account.category} />
        </div>
      </div>

      <div className="card-grid section">
        <div className="card">
          <div className="stat-label">Balance</div>
          <div className="stat-value">{formatMoney(account.balance)}</div>
        </div>
        <div className="card">
          <div className="stat-label">Interest Rate</div>
          <div className="stat-value">{formatPercent(account.interest_rate)}</div>
        </div>
        <div className="card">
          <div className="stat-label">Minimum Payment</div>
          <div className="stat-value">{formatMoney(account.minimum_payment)}</div>
          {account.billing_frequency !== 'monthly' && (
            <div className="text-muted" style={{ fontSize: '0.85rem' }}>
              {FREQUENCY_LABELS[account.billing_frequency]}
            </div>
          )}
        </div>
        {account.credit_limit != null && (
          <div className="card">
            <div className="stat-label">Credit Limit</div>
            <div className="stat-value">{formatMoney(account.credit_limit)}</div>
          </div>
        )}
        {account.purchase_price != null && (
          <div className="card">
            <div className="stat-label">Purchase Price</div>
            <div className="stat-value">{formatMoney(account.purchase_price)}</div>
          </div>
        )}
        {account.market_value != null && (
          <div className="card">
            <div className="stat-label">Market Value</div>
            <div className="stat-value">{formatMoney(account.market_value)}</div>
          </div>
        )}
        {account.market_value != null && (
          <div className="card">
            <div className="stat-label">Equity</div>
            <div className="stat-value">{formatMoney(account.market_value - account.balance)}</div>
          </div>
        )}
      </div>
      {account.lender && <p className="text-muted">Lender: {account.lender}</p>}
      {account.notes && <p className="text-muted">Notes: {account.notes}</p>}

      {account.category !== 'rental_property' && (
      <div className="section">
        <h3>Payoff Calculator</h3>
        <div className="card-grid">
          <ScenarioCard title="At minimum payment" scenario={minScenario} />

          <div className="card">
            <div className="stat-label">At custom payment</div>
            <div className="row" style={{ margin: '0.4rem 0' }}>
              <input
                type="number"
                step="0.01"
                value={customPayment}
                onChange={(e) => setCustomPayment(parseFloat(e.target.value) || 0)}
                style={{ width: '100px' }}
              />
              <button onClick={calculateCustom}>Calculate</button>
            </div>
            {customScenario &&
              (customScenario.payoff_impossible ? (
                <p className="text-danger">Too low to cover interest.</p>
              ) : (
                <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                  {monthsFromNowLabel(customScenario.months_to_payoff)} ·{' '}
                  {formatMoney(customScenario.total_interest ?? 0)} interest
                </div>
              ))}
          </div>

          <div className="card">
            <div className="stat-label">Extra $ per month</div>
            <div className="row" style={{ margin: '0.4rem 0' }}>
              <input
                type="number"
                step="0.01"
                value={extraAmount}
                onChange={(e) => setExtraAmount(parseFloat(e.target.value) || 0)}
                style={{ width: '100px' }}
              />
              <button onClick={calculateExtra}>Calculate</button>
            </div>
            {extraScenario &&
              (extraScenario.payoff_impossible ? (
                <p className="text-danger">Too low to cover interest.</p>
              ) : (
                <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                  {monthsFromNowLabel(extraScenario.months_to_payoff)} ·{' '}
                  {formatMoney(extraScenario.total_interest ?? 0)} interest
                  {minScenario && !minScenario.payoff_impossible && (
                    <div className="text-success">
                      Saves {formatMoney((minScenario.total_interest ?? 0) - (extraScenario.total_interest ?? 0))}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>
      )}

      <div className="section">
        <h3>Log a Payment</h3>
        <form className="card row" onSubmit={handleAddPayment}>
          <div className="form-field">
            <label>Amount</label>
            <input
              type="number"
              step="0.01"
              required
              value={paymentAmount || ''}
              onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="form-field">
            <label>Date</label>
            <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
          </div>
          <div className="form-field" style={{ flex: 1 }}>
            <label>Notes</label>
            <input value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} />
          </div>
          <button type="submit" className="primary" disabled={saving} style={{ alignSelf: 'flex-end' }}>
            {saving ? 'Saving…' : 'Add Payment'}
          </button>
        </form>
      </div>

      <div className="section">
        <h3>Payment History</h3>
        {payments.length === 0 ? (
          <p className="text-muted">No payments logged yet.</p>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>New Balance</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>{formatDate(p.paid_on)}</td>
                    <td>{formatMoney(p.amount)}</td>
                    <td>{formatMoney(p.new_balance)}</td>
                    <td>{p.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <button className="danger" onClick={() => navigate('/accounts')}>
        Done
      </button>
    </div>
  )
}
