import type { Account, BillingFrequency, Category } from '../types'

export function formatMoney(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatMonthYear(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  })
}

export const CATEGORY_LABELS: Record<Category, string> = {
  credit_card: 'Credit Card',
  mortgage: 'Mortgage',
  rental_property: 'Rental Property',
  auto: 'Auto Loan',
  student_loan: 'Student Loan',
  consolidation_loan: 'Consolidation Loan',
  insurance: 'Insurance',
  utility: 'Utility',
  subscription: 'Subscription',
  other: 'Other',
}

export const CATEGORY_COLORS: Record<Category, string> = {
  credit_card: '#e0663e',
  mortgage: '#3e6fe0',
  rental_property: '#2f8fb0',
  auto: '#8a5fd4',
  student_loan: '#1f9ec9',
  consolidation_loan: '#c2489a',
  insurance: '#9c6b30',
  utility: '#2fa36b',
  subscription: '#d4a72f',
  other: '#6b7280',
}

// Mirrors backend app.schemas.FREQUENCY_MONTHS.
export const FREQUENCY_MONTHS: Record<BillingFrequency, number> = {
  monthly: 1,
  bimonthly: 2,
}

export const FREQUENCY_LABELS: Record<BillingFrequency, string> = {
  monthly: 'Monthly',
  bimonthly: 'Every 2 months',
}

/** minimum_payment converted to a monthly-equivalent, for aggregates that sum across accounts. */
export function monthlyEquivalent(account: Pick<Account, 'minimum_payment' | 'billing_frequency'>): number {
  return account.minimum_payment / FREQUENCY_MONTHS[account.billing_frequency]
}

/** Next occurrence of a given day-of-month, on or after `from`. */
export function nextDueDate(dueDay: number, from: Date = new Date()): Date {
  const year = from.getFullYear()
  const month = from.getMonth()
  const daysInThisMonth = new Date(year, month + 1, 0).getDate()
  const clampedDay = Math.min(dueDay, daysInThisMonth)
  const candidate = new Date(year, month, clampedDay)
  candidate.setHours(0, 0, 0, 0)

  const today = new Date(year, month, from.getDate())
  today.setHours(0, 0, 0, 0)

  if (candidate >= today) return candidate

  const daysInNextMonth = new Date(year, month + 2, 0).getDate()
  return new Date(year, month + 1, Math.min(dueDay, daysInNextMonth))
}

export function daysUntil(date: Date, from: Date = new Date()): number {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

export function monthsFromNowLabel(months: number | null): string {
  if (months === null) return 'Never (payment too low)'
  const date = new Date()
  date.setMonth(date.getMonth() + Math.round(months))
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}
