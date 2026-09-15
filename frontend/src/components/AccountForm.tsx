import { useState } from 'react'
import type { AccountInput, BillingFrequency, Category } from '../types'
import { FREQUENCY_LABELS } from '../utils/format'

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'mortgage', label: 'Mortgage' },
  { value: 'rental_property', label: 'Rental Property' },
  { value: 'auto', label: 'Auto Loan' },
  { value: 'student_loan', label: 'Student Loan' },
  { value: 'consolidation_loan', label: 'Consolidation Loan' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'utility', label: 'Utility' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'other', label: 'Other' },
]

const FREQUENCIES: { value: BillingFrequency; label: string }[] = [
  { value: 'monthly', label: FREQUENCY_LABELS.monthly },
  { value: 'bimonthly', label: FREQUENCY_LABELS.bimonthly },
]

const EMPTY: AccountInput = {
  name: '',
  category: 'credit_card',
  lender: '',
  balance: 0,
  interest_rate: 0,
  credit_limit: null,
  purchase_price: null,
  market_value: null,
  minimum_payment: 0,
  billing_frequency: 'monthly',
  due_day: 1,
  url: '',
  notes: '',
}

export default function AccountForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = 'Save',
}: {
  initial?: Partial<AccountInput>
  onSubmit: (data: AccountInput) => Promise<void> | void
  onCancel: () => void
  submitLabel?: string
}) {
  const [form, setForm] = useState<AccountInput>({ ...EMPTY, ...initial })
  const [saving, setSaving] = useState(false)

  function set<K extends keyof AccountInput>(key: K, value: AccountInput[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await onSubmit(form)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="card section" onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="form-field">
          <label>Name</label>
          <input
            required
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
          />
        </div>
        <div className="form-field">
          <label>Category</label>
          <select
            value={form.category}
            onChange={(e) => set('category', e.target.value as Category)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label>Lender</label>
          <input value={form.lender} onChange={(e) => set('lender', e.target.value)} />
        </div>
        <div className="form-field">
          <label>Balance</label>
          <input
            type="number"
            step="0.01"
            required
            value={form.balance}
            onChange={(e) => set('balance', parseFloat(e.target.value) || 0)}
          />
        </div>
        <div className="form-field">
          <label>Interest Rate (APR, e.g. 0.199)</label>
          <input
            type="number"
            step="0.0001"
            value={form.interest_rate}
            onChange={(e) => set('interest_rate', parseFloat(e.target.value) || 0)}
          />
        </div>
        <div className="form-field">
          <label>Credit Limit (cards only)</label>
          <input
            type="number"
            step="0.01"
            value={form.credit_limit ?? ''}
            onChange={(e) =>
              set('credit_limit', e.target.value === '' ? null : parseFloat(e.target.value))
            }
          />
        </div>
        <div className="form-field">
          <label>Purchase Price (property only)</label>
          <input
            type="number"
            step="0.01"
            value={form.purchase_price ?? ''}
            onChange={(e) =>
              set('purchase_price', e.target.value === '' ? null : parseFloat(e.target.value))
            }
          />
        </div>
        <div className="form-field">
          <label>Current Market Value (property only)</label>
          <input
            type="number"
            step="0.01"
            value={form.market_value ?? ''}
            onChange={(e) =>
              set('market_value', e.target.value === '' ? null : parseFloat(e.target.value))
            }
          />
        </div>
        <div className="form-field">
          <label>Minimum Payment</label>
          <input
            type="number"
            step="0.01"
            required
            value={form.minimum_payment}
            onChange={(e) => set('minimum_payment', parseFloat(e.target.value) || 0)}
          />
        </div>
        <div className="form-field">
          <label>Billed</label>
          <select
            value={form.billing_frequency}
            onChange={(e) => set('billing_frequency', e.target.value as BillingFrequency)}
          >
            {FREQUENCIES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label>Due Day (1-31)</label>
          <input
            type="number"
            min={1}
            max={31}
            required
            value={form.due_day}
            onChange={(e) => set('due_day', parseInt(e.target.value, 10) || 1)}
          />
        </div>
        <div className="form-field" style={{ gridColumn: '1 / -1' }}>
          <label>Bill Pay URL</label>
          <input
            type="url"
            placeholder="https://..."
            value={form.url}
            onChange={(e) => set('url', e.target.value)}
          />
        </div>
        <div className="form-field" style={{ gridColumn: '1 / -1' }}>
          <label>Notes</label>
          <input value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </div>
      </div>
      <div className="row" style={{ marginTop: '1rem' }}>
        <button type="submit" className="primary" disabled={saving}>
          {saving ? 'Saving…' : submitLabel}
        </button>
        <button type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  )
}
