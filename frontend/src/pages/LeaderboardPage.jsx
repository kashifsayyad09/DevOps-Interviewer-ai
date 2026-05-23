import { useState, useEffect } from 'react'
import { getLeaderboard, getStats } from '../utils/api'
import { Trophy, Medal, RefreshCw, Users, TrendingUp, Zap, Settings, Rocket } from 'lucide-react'

const TABS = [
  { id: 'all', label: 'All', icon: Users },
  { id: 'fresher', label: 'Fresher', icon: Zap },
  { id: 'mid', label: 'Mid-Level', icon: Settings },
  { id: 'senior', label: 'Senior', icon: Rocket }
]

const RANK_BADGE = (rank) => {
  if (rank === 1) return { bg: '#fbbf24', color: '#78350f', label: '🥇' }
  if (rank === 2) return { bg: '#94a3b8', color: '#1e293b', label: '🥈' }
  if (rank === 3) return { bg: '#b45309', color: '#fef3c7', label: '🥉' }
  return { bg: 'var(--bg-secondary)', color: 'var(--text-muted)', label: `#${rank}` }
}

const levelColors = { fresher: '#22c55e', mid: '#f59e0b', senior: '#a855f7' }

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="rounded-xl p-4 flex items-center gap-3"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}22` }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div>
        <div className="text-lg font-extrabold" style={{ color: 'var(--text-primary)' }}>{value ?? '—'}</div>
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</div>
      </div>
    </div>
  )
}

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState('all')
  const [entries, setEntries] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async (level, showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const [lbRes, stRes] = await Promise.all([
        getLeaderboard(level === 'all' ? null : level),
        getStats()
      ])
      setEntries(lbRes.data.leaderboard)
      setStats(stRes.data.stats)
    } catch {}
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { load(activeTab) }, [activeTab])

  const handleTabChange = (id) => {
    setActiveTab(id)
    setEntries([])
  }

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : ''

  return (
    <div className="min-h-screen relative" style={{ background: 'var(--bg-primary)' }}>
      <div className="grid-bg absolute inset-0 opacity-20 pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Trophy size={22} style={{ color: '#fbbf24' }} /> Leaderboard
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Top scores from AWS RDS · updates in real-time</p>
          </div>
          <button onClick={() => load(activeTab, true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-light)'}>
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <StatCard label="Completed" value={stats.total_completed} icon={Trophy} color="#fbbf24" />
            <StatCard label="Avg Score" value={stats.avg_score ? `${stats.avg_score}%` : '—'} icon={TrendingUp} color="var(--accent)" />
            <StatCard label="Freshers" value={stats.fresher_count} icon={Zap} color="#22c55e" />
            <StatCard label="Seniors" value={stats.senior_count} icon={Rocket} color="#a855f7" />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl mb-6"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => handleTabChange(id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: activeTab === id ? 'var(--accent)' : 'transparent',
                color: activeTab === id ? '#fff' : 'var(--text-muted)'
              }}>
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="flex gap-1.5">
              {[0,1,2].map(i => <div key={i} className="bounce-dot w-2.5 h-2.5 rounded-full" style={{ background: 'var(--accent)' }} />)}
            </div>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
            <div className="text-4xl mb-3">🎯</div>
            <div className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No entries yet</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Complete an interview with your name to appear here</div>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, idx) => {
              const badge = RANK_BADGE(entry.rank)
              const lc = levelColors[entry.experience_level] || 'var(--accent)'
              const pct = parseFloat(entry.score_percentage || 0)
              return (
                <div key={`${entry.candidate_name}-${idx}`}
                  className="flex items-center gap-4 p-4 rounded-xl transition-all animate-fade-in"
                  style={{ background: 'var(--bg-card)', border: `1px solid ${entry.rank <= 3 ? badge.bg + '44' : 'var(--border-light)'}` }}>
                  {/* Rank */}
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: badge.bg, color: badge.color }}>
                    {entry.rank <= 3 ? badge.label : `#${entry.rank}`}
                  </div>

                  {/* Name + level */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                      {entry.candidate_name}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs capitalize px-1.5 py-0.5 rounded"
                        style={{ background: `${lc}22`, color: lc }}>
                        {entry.experience_level}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {entry.correct_count}/{entry.total_questions} correct · {formatDate(entry.completed_at)}
                      </span>
                    </div>
                  </div>

                  {/* Score bar + pct */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="w-20 h-1.5 rounded-full hidden md:block" style={{ background: 'var(--border)' }}>
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: pct >= 85 ? '#22c55e' : pct >= 60 ? 'var(--accent)' : '#f59e0b' }} />
                    </div>
                    <div className="text-sm font-bold w-12 text-right"
                      style={{ color: pct >= 85 ? '#22c55e' : pct >= 60 ? 'var(--accent)' : '#f59e0b' }}>
                      {pct.toFixed(0)}%
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
