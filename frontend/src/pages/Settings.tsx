import { useState } from 'react'
import { api } from '../api/client'
import type { Account } from '../types'

export default function Settings() {
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState<Account[] | null>(null)
  const [resetting, setResetting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleImport() {
    setImporting(true)
    setError(null)
    try {
      setImported(await api.importEnv())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  async function handleReset() {
    if (!confirm('This permanently deletes all accounts, payments, and snapshots. Continue?')) return
    setResetting(true)
    try {
      await api.resetData()
      setImported(null)
      alert('All data cleared.')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div>
      <h2>Settings</h2>

      <div className="card section">
        <h3>Re-import from .env</h3>
        <p className="text-muted">
          Refreshes balances, rates, and minimums from the account blocks defined in your{' '}
          <code>.env</code> file. Existing accounts imported from .env are updated in place;
          nothing is duplicated.
        </p>
        <button className="primary" onClick={handleImport} disabled={importing}>
          {importing ? 'Importing…' : 'Re-import from .env'}
        </button>
        {error && <p className="text-danger">{error}</p>}
        {imported && (
          <p className="text-success">
            Imported/updated {imported.length} account{imported.length === 1 ? '' : 's'}.
          </p>
        )}
      </div>

      <div className="card section">
        <h3>Backup Database</h3>
        <p className="text-muted">Download the raw SQLite database file.</p>
        <a href={api.backupUrl} download="finance.db">
          <button>Download Backup</button>
        </a>
      </div>

      <div className="card section">
        <h3>Reset / Clear Data</h3>
        <p className="text-muted">Permanently deletes every account, payment, and snapshot.</p>
        <button className="danger" onClick={handleReset} disabled={resetting}>
          {resetting ? 'Clearing…' : 'Reset All Data'}
        </button>
      </div>
    </div>
  )
}
