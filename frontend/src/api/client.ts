import type {
  Account,
  AccountInput,
  Payment,
  PayoffPlanResult,
  PayoffScenario,
  Snapshot,
  Strategy,
} from '../types'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`${response.status} ${response.statusText}: ${body}`)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const api = {
  getAccounts: (includeInactive = false) =>
    request<Account[]>(`/accounts?include_inactive=${includeInactive}`),
  getAccount: (id: string) => request<Account>(`/accounts/${id}`),
  createAccount: (data: AccountInput) =>
    request<Account>('/accounts', { method: 'POST', body: JSON.stringify(data) }),
  updateAccount: (id: string, data: Partial<AccountInput>) =>
    request<Account>(`/accounts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deactivateAccount: (id: string) =>
    request<void>(`/accounts/${id}`, { method: 'DELETE' }),

  getPayments: (accountId: string) => request<Payment[]>(`/accounts/${accountId}/payments`),
  createPayment: (accountId: string, data: { amount: number; paid_on: string; notes: string }) =>
    request<Payment>(`/accounts/${accountId}/payments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getPayoffScenario: (accountId: string, payment: number) =>
    request<PayoffScenario>(
      `/accounts/${accountId}/payoff-calculator?payment=${encodeURIComponent(payment)}`
    ),

  getPayoffPlan: (extraMonthlyBudget: number, strategy: Strategy) =>
    request<PayoffPlanResult>('/payoff/plan', {
      method: 'POST',
      body: JSON.stringify({ extra_monthly_budget: extraMonthlyBudget, strategy }),
    }),

  getSnapshots: () => request<Snapshot[]>('/snapshots'),
  createSnapshot: () => request<Snapshot>('/snapshots', { method: 'POST' }),

  importEnv: () => request<Account[]>('/settings/import-env', { method: 'POST' }),
  resetData: () => request<void>('/settings/reset', { method: 'POST' }),
  backupUrl: '/api/settings/backup',
}
