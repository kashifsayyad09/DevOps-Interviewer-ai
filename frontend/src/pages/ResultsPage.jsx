import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSessionHistory } from '../utils/api'
import { Trophy, CheckCircle, XCircle, RotateCcw, BarChart2, ChevronDown, ChevronUp } from 'lucide-react'

const GRADE = (pct) => {
  if (pct >= 85) return { label: 'Excellent!', emoji: '🏆', color: '#22c55e', msg: 'Outstanding performance! You clearly know your DevOps.' }
  if (pct >= 70) return { label: 'Great Job!', emoji: '🎯', color: '#3b82f6', msg: 'Strong answers. A bit more depth and you\'ll be unstoppable.' }
  if (pct >= 50) return { label: 'Good Effort', emoji: '👍', color: '#f59e0b', msg: 'Decent performance. Review the missed topics and retry.' }
  return { label: 'Keep Going!', emoji: '💪', color: '#ef4444', msg: 'DevOps is deep — keep learning and you\'ll get there.' }
}

export default function ResultsPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getSessionHistory(token)
        setData(res.data)
      } catch {
        navigate('/')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex gap-1.5">
        {[0,1,2].map(i => <div key={i} className="bounce-dot w-3 h-3 rounded-full" style={{ background: 'var(--accent)' }} />)}
      </div>
    </div>
  )

  if (!data) return null

  const { session, questions } = data
  const pct = parseFloat(session.score_percentage || 0)
  const grade = GRADE(pct)
  const levelColors = { fresher: '#22c55e', mid: '#f59e0b', senior: '#a855f7' }
  const lc = levelColors[session.experience_level] || 'var(--accent)'

  return (
    <div className="min-h-screen relative" style={{ background: 'var(--bg-primary)' }}>
      <div className="grid-bg absolute inset-0 opacity-20 pointer-events-none" />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-10">
        {/* Score card */}
        <div className="rounded-2xl p-8 mb-6 text-center animate-fade-in"
          style={{ background: 'var(--bg-card)', border: `1px solid ${grade.color}44` }}>
          <div className="text-5xl mb-3">{grade.emoji}</div>
          <div className="text-3xl font-extrabold mb-1" style={{ color: grade.color }}>{pct.toFixed(0)}%</div>
          <div className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{grade.label}</div>
          <div className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>{grade.msg}</div>
          <div className="text-xs px-3 py-1 rounded-full inline-block mt-1 capitalize"
            style={{ background: `${lc}22`, color: lc, border: `1px solid ${lc}44` }}>
            {session.experience_level} level · {session.candidate_name || 'Anonymous'}
          </div>
        </div>

        {/* Score breakdown */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Correct', value: session.correct_count, color: '#22c55e', icon: CheckCircle },
            { label: 'Wrong', value: session.total_questions - session.correct_count, color: '#ef4444', icon: XCircle },
            { label: 'Total', value: session.total_questions, color: 'var(--accent)', icon: BarChart2 }
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="rounded-xl p-4 text-center"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
              <Icon size={16} className="mx-auto mb-2" style={{ color }} />
              <div className="text-2xl font-extrabold" style={{ color }}>{value}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Question review */}
        <div className="mb-6">
          <h3 className="text-sm font-bold mb-3 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Question Review
          </h3>
          <div className="space-y-2">
            {questions.map((q, i) => {
              const isCorrect = q.is_correct
              const open = expanded === i
              return (
                <div key={q.id} className="rounded-xl overflow-hidden transition-all"
                  style={{ background: 'var(--bg-card)', border: `1px solid ${isCorrect ? '#166534' : '#7f1d1d'}` }}>
                  <button className="w-full flex items-center gap-3 p-4 text-left"
                    onClick={() => setExpanded(open ? null : i)}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: isCorrect ? '#22c55e' : '#ef4444' }}>
                      {isCorrect
                        ? <CheckCircle size={13} color="#fff" />
                        : <XCircle size={13} color="#fff" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-semibold mr-2"
                        style={{ color: lc }}>Q{i + 1} · {q.topic}</span>
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {q.question_text?.slice(0, 70)}…
                      </span>
                    </div>
                    {open ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} />
                          : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />}
                  </button>

                  {open && (
                    <div className="px-4 pb-4 animate-fade-in">
                      <p className="text-sm mb-3 font-medium" style={{ color: 'var(--text-primary)' }}>{q.question_text}</p>
                      {['A','B','C'].map(letter => {
                        const optText = q[`option_${letter.toLowerCase()}`]
                        const isChosen = q.chosen_answer === letter
                        const isRight = q.correct_answer === letter
                        const color = isRight ? '#22c55e' : (isChosen && !isRight ? '#ef4444' : 'var(--text-muted)')
                        return (
                          <div key={letter} className="flex items-start gap-2 mb-1.5">
                            <span className="w-5 h-5 rounded text-xs flex items-center justify-center font-bold flex-shrink-0"
                              style={{ background: isRight ? '#22c55e' : isChosen ? '#ef4444' : 'var(--border)', color: (isRight || isChosen) ? '#fff' : 'var(--text-muted)' }}>
                              {letter}
                            </span>
                            <span className="text-xs" style={{ color }}>{optText}</span>
                          </div>
                        )
                      })}
                      {q.explanation && (
                        <p className="text-xs mt-3 p-2.5 rounded-lg" style={{ background: 'rgba(59,130,246,0.08)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                          🎯 {q.explanation}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={() => navigate('/')}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all"
            style={{ background: 'var(--accent)', color: '#fff' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}>
            <RotateCcw size={14} /> Try Again
          </button>
          <button onClick={() => navigate('/leaderboard')}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', color: 'var(--text-primary)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-light)'}>
            <Trophy size={14} /> Leaderboard
          </button>
        </div>
      </div>
    </div>
  )
}
