import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { Zap, Settings, Rocket, ChevronRight, Shield, Database, Cpu } from 'lucide-react'
import { createSession } from '../utils/api'

const LEVELS = [
  {
    id: 'fresher',
    icon: Zap,
    label: 'Fresher',
    years: '0–1 year',
    color: '#22c55e',
    glow: 'rgba(34,197,94,0.15)',
    tag: 'Beginner',
    topics: ['CI/CD basics', 'Git & version control', 'Docker intro', 'Linux fundamentals', 'What is DevOps']
  },
  {
    id: 'mid',
    icon: Settings,
    label: 'Mid-Level',
    years: '2–4 years',
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.15)',
    tag: 'Intermediate',
    topics: ['Kubernetes', 'Terraform', 'Jenkins pipelines', 'Ansible', 'Monitoring & Grafana']
  },
  {
    id: 'senior',
    icon: Rocket,
    label: 'Senior / SRE',
    years: '5+ years',
    color: '#a855f7',
    glow: 'rgba(168,85,247,0.15)',
    tag: 'Advanced',
    topics: ['GitOps / ArgoCD', 'SLOs & error budgets', 'Chaos engineering', 'Service mesh', 'Platform engineering']
  }
]

const FEATURES = [
  { icon: Cpu, label: 'AI-Generated Questions', desc: 'Fresh questions every session via Gemini' },
  { icon: Shield, label: 'Server-side Grading', desc: 'Answers verified on backend — no cheating' },
  { icon: Database, label: 'Stored in AWS RDS', desc: 'All sessions & scores saved to PostgreSQL' }
]

export default function HomePage() {
  const [selectedLevel, setSelectedLevel] = useState(null)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleStart = async () => {
    if (!selectedLevel) return toast.error('Please select your experience level')
    setLoading(true)
    try {
      const res = await createSession({
        experience_level: selectedLevel,
        candidate_name: name.trim() || undefined
      })
      const token = res.data.session.session_token
      navigate(`/interview?token=${token}&level=${selectedLevel}`)
    } catch (err) {
      toast.error(err.message || 'Failed to start session. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Grid bg */}
      <div className="grid-bg absolute inset-0 opacity-30 pointer-events-none" />

      {/* Glow orbs */}
      <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)' }} />
      <div className="absolute bottom-20 right-1/4 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.06) 0%, transparent 70%)' }} />

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6 uppercase tracking-widest"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>
            <div className="pulse-dot" />
            Gemini AI · AWS RDS · Real-time
          </div>
          <h1 className="text-5xl font-extrabold mb-4 leading-tight tracking-tight"
            style={{ color: 'var(--text-primary)' }}>
            DevOps<br />
            <span style={{ color: 'var(--accent)' }}>AI Interviewer</span>
          </h1>
          <p className="text-base max-w-md mx-auto leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            A full-stack interview simulator. Questions generated live by Gemini, graded server-side, and stored in AWS RDS PostgreSQL.
          </p>
        </div>

        {/* Name input */}
        <div className="mb-6 max-w-sm mx-auto">
          <label className="block text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Your Name (optional)
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Ravi Kumar"
            maxLength={60}
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-light)',
              color: 'var(--text-primary)',
              fontFamily: 'inherit'
            }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border-light)'}
          />
        </div>

        {/* Level cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {LEVELS.map(lvl => {
            const Icon = lvl.icon
            const selected = selectedLevel === lvl.id
            return (
              <button key={lvl.id} onClick={() => setSelectedLevel(lvl.id)}
                className="text-left rounded-2xl p-5 transition-all duration-200 cursor-pointer"
                style={{
                  background: selected ? lvl.glow : 'var(--bg-card)',
                  border: `1.5px solid ${selected ? lvl.color : 'var(--border-light)'}`,
                  boxShadow: selected ? `0 0 20px ${lvl.glow}` : 'none',
                  transform: selected ? 'translateY(-3px)' : 'none'
                }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: selected ? lvl.color : 'var(--bg-secondary)' }}>
                    <Icon size={18} color={selected ? '#fff' : lvl.color} />
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${lvl.color}22`, color: lvl.color }}>
                    {lvl.tag}
                  </span>
                </div>
                <div className="font-bold text-base mb-0.5" style={{ color: 'var(--text-primary)' }}>{lvl.label}</div>
                <div className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>{lvl.years} experience</div>
                <ul className="space-y-1">
                  {lvl.topics.map(t => (
                    <li key={t} className="text-xs flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                      <span style={{ color: lvl.color }}>›</span> {t}
                    </li>
                  ))}
                </ul>
              </button>
            )
          })}
        </div>

        {/* Start button */}
        <div className="flex justify-center mb-12">
          <button onClick={handleStart} disabled={!selectedLevel || loading}
            className="flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm transition-all"
            style={{
              background: selectedLevel ? 'var(--accent)' : 'var(--bg-card)',
              color: selectedLevel ? '#fff' : 'var(--text-muted)',
              border: `1px solid ${selectedLevel ? 'var(--accent)' : 'var(--border-light)'}`,
              cursor: selectedLevel ? 'pointer' : 'not-allowed',
              opacity: loading ? 0.7 : 1
            }}>
            {loading ? (
              <><span className="flex gap-1">
                {[0,1,2].map(i => <span key={i} className="bounce-dot w-1.5 h-1.5 rounded-full bg-white" />)}
              </span> Starting session...</>
            ) : (
              <><ChevronRight size={16} /> Start Interview (7 Questions)</>
            )}
          </button>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {FEATURES.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-3 p-4 rounded-xl"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--accent-glow)' }}>
                <Icon size={15} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <div className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>{label}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
