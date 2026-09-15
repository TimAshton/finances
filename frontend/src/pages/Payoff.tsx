import { useState } from 'react'
import { api } from '../api/client'
import type { PayoffPlanResult, Strategy } from '../types'
import { formatMoney, monthsFromNowLabel } from '../utils/format'

export default function Payoff() {
  const [strategy, setStrategy] = useState<Strategy>('avalanche')
  const [extraBudget, setExtraBudget] = useState(0)
  const [plan, setPlan] = useState<PayoffPlanResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function calculate() {
    setLoading(true)
    setError(null)
    try {
      setPlan(await api.getPayoffPlan(extraBudget, strategy))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to calculate plan')
    } finally {
      setLoading(false)
    }
  }

  const orderedAccounts = plan
    ? [...plan.accounts].sort((a, b) => (a.payoff_month ?? Infinity) - (b.payoff_month ?? Infinity))
    : []

  return (
    <div>
      <h2>Payoff Planner</h2>
      <p className="text-muted">
        Compare payoff strategies across all active accounts with an outstanding balance.
      </p>

      <div className="card section">
        <div className="form-grid">
          <div className="form-field">
            <label>Strategy</label>
            <select value={strategy} onChange={(e) => setStrategy(e.target.value as Strategy)}>
              <option value="avalanche">Avalanche (highest rate first)</option>
              <option value="snowball">Snowball (lowest balance first)</option>
            </select>
          </div>
          <div className="form-field">
            <label>Extra monthly budget</label>
            <input
              type="number"
              step="0.01"
              value={extraBudget}
              onChange={(e) => setExtraBudget(parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>
        <button className="primary" style={{ marginTop: '1rem' }} onClick={calculate} disabled={loading}>
          {loading ? 'Calculating…' : 'Calculate Plan'}
        </button>
        {error && <p className="text-danger">{error}</p>}
      </div>

      {plan && (
        <>
          <div className="card-grid section">
            <div className="card">
              <div className="stat-label">Total Months to Debt-Free</div>
              <div className="stat-value">{plan.total_months}</div>
            </div>
            <div className="card">
              <div className="stat-label">Total Interest Paid</div>
              <div className="stat-value">{formatMoney(plan.total_interest_paid)}</div>
            </div>
            <div className="card">
              <div className="stat-label">Interest Saved vs. Minimums Only</div>
              <div className="stat-value text-success">{formatMoney(plan.interest_saved)}</div>
            </div>
          </div>

          <div className="section">
            <h3>Payoff Order</h3>
            <div className="card" style={{ padding: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Account</th>
                    <th>Projected Payoff</th>
                    <th>Interest Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {orderedAccounts.map((a, i) => (
                    <tr key={a.account_id}>
                      <td>{i + 1}</td>
                      <td>{a.name}</td>
                      <td>
                        {a.payoff_impossible ? (
                          <span className="text-danger">Never at this budget</span>
                        ) : (
                          monthsFromNowLabel(a.payoff_month)
                        )}
                      </td>
                      <td>{formatMoney(a.total_interest_paid)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
