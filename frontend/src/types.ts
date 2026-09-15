export type Category =
  | 'credit_card'
  | 'mortgage'
  | 'rental_property'
  | 'auto'
  | 'student_loan'
  | 'consolidation_loan'
  | 'insurance'
  | 'utility'
  | 'subscription'
  | 'other'

export type BillingFrequency = 'monthly' | 'bimonthly'

export interface Account {
  id: string
  name: string
  category: Category
  lender: string
  balance: number
  interest_rate: number
  credit_limit: number | null
  purchase_price: number | null
  market_value: number | null
  minimum_payment: number
  billing_frequency: BillingFrequency
  due_day: number
  url: string
  is_active: boolean
  notes: string
  created_at: string
  updated_at: string
}

export interface AccountInput {
  name: string
  category: Category
  lender: string
  balance: number
  interest_rate: number
  credit_limit: number | null
  purchase_price: number | null
  market_value: number | null
  minimum_payment: number
  billing_frequency: BillingFrequency
  due_day: number
  url: string
  notes: string
}

export interface Payment {
  id: string
  account_id: string
  amount: number
  paid_on: string
  new_balance: number
  notes: string
}

export interface Snapshot {
  id: string
  snapshot_date: string
  total_debt: number
  total_monthly_minimums: number
  net_worth_delta: number
}

export interface PayoffScenario {
  payment: number
  months_to_payoff: number | null
  total_interest: number | null
  payoff_impossible: boolean
}

export type Strategy = 'avalanche' | 'snowball'

export interface PayoffAccountResult {
  account_id: string
  name: string
  payoff_month: number | null
  total_interest_paid: number
  payoff_impossible: boolean
}

export interface PayoffPlanResult {
  strategy: Strategy
  total_months: number
  total_interest_paid: number
  baseline_total_interest_paid: number
  interest_saved: number
  accounts: PayoffAccountResult[]
}
