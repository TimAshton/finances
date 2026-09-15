import { NavLink, Route, Routes } from 'react-router-dom'
import './App.css'
import AccountDetail from './pages/AccountDetail'
import Accounts from './pages/Accounts'
import Calendar from './pages/Calendar'
import Dashboard from './pages/Dashboard'
import Payoff from './pages/Payoff'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Subscriptions from './pages/Subscriptions'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/accounts', label: 'Accounts' },
  { to: '/subscriptions', label: 'Subscriptions' },
  { to: '/payoff', label: 'Payoff Planner' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/reports', label: 'Reports' },
  { to: '/settings', label: 'Settings' },
]

function App() {
  return (
    <div className="app-shell">
      <nav className="sidebar">
        <h1>Family Finances</h1>
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end}>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/accounts/:id" element={<AccountDetail />} />
          <Route path="/subscriptions" element={<Subscriptions />} />
          <Route path="/payoff" element={<Payoff />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
    </div>
  )
}

export default App
