import { Link, useLocation } from 'react-router-dom'
import { Terminal, Trophy, Home } from 'lucide-react'

export default function Navbar() {
  const { pathname } = useLocation()

  const links = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/leaderboard', label: 'Leaderboard', icon: Trophy }
  ]

  return (
    <nav style={{ background: 'rgba(10,15,30,0.9)', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(12px)' }}
      className="sticky top-0 z-50 px-6 py-3 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2 no-underline">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--accent)', boxShadow: '0 0 12px var(--accent-glow)' }}>
          <Terminal size={16} color="#fff" />
        </div>
        <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
          DevOps<span style={{ color: 'var(--accent)' }}>AI</span>
        </span>
      </Link>

      <div className="flex items-center gap-1">
        {links.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all no-underline"
            style={{
              color: pathname === to ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: pathname === to ? 'var(--bg-card)' : 'transparent',
              border: pathname === to ? '1px solid var(--border-light)' : '1px solid transparent'
            }}>
            <Icon size={13} />
            {label}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div className="pulse-dot" />
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Live</span>
      </div>
    </nav>
  )
}
