import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { generateQuestion, submitAnswer, completeSession } from '../utils/api'
import { CheckCircle, XCircle, AlertCircle, ChevronRight, Trophy, Clock } from 'lucide-react'

const TOTAL = 7

function OptionButton({ letter, text, state, disabled, onClick }) {
  const colors = {
    correct: { bg: '#052e16', border: '#22c55e', text: '#86efac', badge: '#22c55e', badgeText: '#fff' },
    wrong: { bg: '#1f0a0a', border: '#ef4444', text: '#fca5a5', badge: '#ef4444', badgeText: '#fff' },
    neutral: { bg: 'var(--bg-card)', border: 'var(--border-light)', text: 'var(--text-secondary)', badge: 'var(--bg-secondary)', badgeText: 'var(--text-muted)' }
  }
  const c = colors[state] || colors.neutral
  return (
    <button onClick={onClick} disabled={disabled}
      className="w-full flex items-start gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200"
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled && state === 'neutral' ? 0.5 : 1
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.borderColor = 'var(--accent)' }}
      onMouseLeave={e => { if (!disabled && state === 'neutral') e.currentTarget.style.borderColor = 'var(--border-light)' }}>
      <span className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold mt-0.5"
        style={{ background: c.badge, color: c.badgeText }}>
        {letter}
      </span>
      <span className="text-sm leading-relaxed" style={{ color: c.text }}>{text}</span>
      {state === 'correct' && <CheckCircle size={16} className="flex-shrink-0 mt-0.5 ml-auto" style={{ color: '#22c55e' }} />}
      {state === 'wrong' && <XCircle size={16} className="flex-shrink-0 mt-0.5 ml-auto" style={{ color: '#ef4444' }} />}
    </button>
  )
}

function FeedbackCard({ feedback }) {
  if (!feedback) return null
  const isCorrect = feedback.is_correct
  return (
    <div className="animate-fade-in rounded-xl p-4 mt-3"
      style={{
        background: isCorrect ? 'rgba(5,46,22,0.6)' : 'rgba(31,10,10,0.6)',
        border: `1px solid ${isCorrect ? '#166534' : '#7f1d1d'}`
      }}>
      <div className="flex items-center gap-2 mb-2">
        {isCorrect
          ? <CheckCircle size={15} style={{ color: '#22c55e' }} />
          : <XCircle size={15} style={{ color: '#ef4444' }} />}
        <span className="text-xs font-bold uppercase tracking-widest"
          style={{ color: isCorrect ? '#22c55e' : '#ef4444' }}>
          {isCorrect ? 'Correct!' : 'Wrong Answer'}
        </span>
      </div>
      <p className="text-xs mb-1.5 font-semibold" style={{ color: 'var(--text-primary)' }}>
        Correct: <span style={{ color: isCorrect ? '#86efac' : '#fca5a5' }}>
          {feedback.correct_answer} — {feedback.correct_text}
        </span>
      </p>
      <p className="text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
        🎯 {feedback.explanation}
      </p>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        📖 {feedback.wrong_note}
      </p>
    </div>
  )
}

export default function InterviewPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')
  const level = searchParams.get('level')

  const [question, setQuestion] = useState(null)
  const [questionId, setQuestionId] = useState(null)
  const [currentQ, setCurrentQ] = useState(1)
  const [correctCount, setCorrectCount] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [answered, setAnswered] = useState(false)
  const [startTime, setStartTime] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!token) { navigate('/'); return }
    fetchQuestion(1)
  }, [])

  useEffect(() => {
    if (startTime && !answered) {
      timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [startTime, answered])

  const fetchQuestion = useCallback(async (num) => {
    setLoading(true)
    setQuestion(null)
    setQuestionId(null)
    setFeedback(null)
    setSelectedAnswer(null)
    setAnswered(false)
    setElapsed(0)
    try {
      const res = await generateQuestion(token, num)
      setQuestion(res.data.question)
      setQuestionId(res.data.question.id)
      setStartTime(Date.now())
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  const handleAnswer = async (letter) => {
    if (answered || submitting || !questionId) return
    setSelectedAnswer(letter)
    setSubmitting(true)
    clearInterval(timerRef.current)
    const timeTaken = startTime ? Date.now() - startTime : 0
    try {
      const res = await submitAnswer({
        session_token: token,
        question_id: questionId,
        chosen_answer: letter,
        time_taken_ms: timeTaken
      })
      const fb = res.data.feedback
      setFeedback(fb)
      setAnswered(true)
      if (fb.is_correct) setCorrectCount(c => c + 1)
    } catch (err) {
      toast.error(err.message)
      setSelectedAnswer(null)
    } finally {
      setSubmitting(false)
    }
  }

  const handleNext = async () => {
    if (currentQ >= TOTAL) {
      try {
        await completeSession(token)
      } catch {}
      navigate(`/results/${token}`)
      return
    }
    const next = currentQ + 1
    setCurrentQ(next)
    fetchQuestion(next)
  }

  const getOptionState = (letter) => {
    if (!answered) return 'neutral'
    if (letter === feedback?.correct_answer) return 'correct'
    if (letter === selectedAnswer && !feedback?.is_correct) return 'wrong'
    return 'neutral'
  }

  const progress = ((currentQ - 1) / TOTAL) * 100
  const levelColors = { fresher: '#22c55e', mid: '#f59e0b', senior: '#a855f7' }
  const lc = levelColors[level] || 'var(--accent)'

  return (
    <div className="min-h-screen relative" style={{ background: 'var(--bg-primary)' }}>
      <div className="grid-bg absolute inset-0 opacity-20 pointer-events-none" />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        {/* Header bar */}
        <div className="rounded-2xl p-4 mb-6 flex items-center justify-between"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs"
              style={{ background: lc, color: '#fff' }}>
              {level?.[0]?.toUpperCase()}
            </div>
            <div>
              <div className="text-xs font-bold capitalize" style={{ color: 'var(--text-primary)' }}>{level} Level</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Question {currentQ} of {TOTAL}</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <Clock size={12} />
              <span className="font-mono">{String(Math.floor(elapsed/60)).padStart(2,'0')}:{String(elapsed%60).padStart(2,'0')}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#22c55e' }}>
              <CheckCircle size={13} /> {correctCount} correct
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full mb-6 overflow-hidden" style={{ background: 'var(--border)' }}>
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${lc}, var(--accent))` }} />
        </div>

        {/* Question card */}
        {loading ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
            <div className="loading-bar rounded-full mb-4 w-32 mx-auto" />
            <div className="flex justify-center gap-1.5 mb-3">
              {[0,1,2].map(i => <div key={i} className="bounce-dot w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />)}
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Gemini is generating your question…</p>
          </div>
        ) : question ? (
          <div className="animate-fade-in">
            <div className="rounded-2xl p-6 mb-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
              {/* Topic badge */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold mb-4"
                style={{ background: `${lc}22`, color: lc }}>
                <AlertCircle size={11} /> {question.topic}
              </div>

              <h2 className="text-base font-semibold leading-relaxed mb-6"
                style={{ color: 'var(--text-primary)' }}>
                {question.question}
              </h2>

              <div className="space-y-2.5">
                {['A','B','C'].map(letter => (
                  <OptionButton
                    key={letter}
                    letter={letter}
                    text={question.options[letter]}
                    state={getOptionState(letter)}
                    disabled={answered || submitting}
                    onClick={() => handleAnswer(letter)}
                  />
                ))}
              </div>

              <FeedbackCard feedback={feedback} />
            </div>

            {answered && (
              <div className="animate-fade-in">
                <button onClick={handleNext}
                  className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                  style={{ background: 'var(--accent)', color: '#fff' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}>
                  {currentQ >= TOTAL
                    ? <><Trophy size={15} /> View Results</>
                    : <><ChevronRight size={15} /> Next Question ({currentQ + 1}/{TOTAL})</>}
                </button>
              </div>
            )}
          </div>
        ) : null}

        {/* Q dots */}
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: TOTAL }).map((_, i) => (
            <div key={i} className="w-2 h-2 rounded-full transition-all"
              style={{
                background: i < currentQ - 1 ? '#22c55e' : i === currentQ - 1 ? lc : 'var(--border-light)',
                transform: i === currentQ - 1 ? 'scale(1.3)' : 'scale(1)'
              }} />
          ))}
        </div>
      </div>
    </div>
  )
}
