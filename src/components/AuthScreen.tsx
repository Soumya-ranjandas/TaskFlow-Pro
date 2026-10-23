import { useState, type FormEvent } from 'react'
import {
  ArrowRight, BookOpen, Check, CheckCheck, Eye, EyeOff, LockKeyhole,
  Mail, ShieldCheck, Sparkles,
} from 'lucide-react'
import { authenticateAccount, registerAccount, startSession } from '../auth'
import type { AuthUser } from '../types'

interface AuthScreenProps {
  onAuthenticated: (user: AuthUser) => void
}

type AuthMode = 'login' | 'signup'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode)
    setError('')
    setNotice('')
    setPassword('')
    setConfirmPassword('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')

    if (mode === 'signup' && !name.trim()) {
      setError('Enter your full name to create an account.')
      return
    }
    if (!emailPattern.test(email.trim())) {
      setError('Enter a valid email address, like student@example.com.')
      return
    }
    if (!password) {
      setError('Enter your password to continue.')
      return
    }
    if (mode === 'signup' && password.length < 8) {
      setError('Choose a password with at least 8 characters.')
      return
    }
    if (mode === 'signup' && !confirmPassword) {
      setError('Confirm your password to finish creating your account.')
      return
    }
    if (mode === 'signup' && password !== confirmPassword) {
      setError('Those passwords don’t match. Please check and try again.')
      return
    }

    setIsSubmitting(true)
    try {
      if (mode === 'signup') {
        await registerAccount(name, email, password)
        setMode('login')
        setNotice('Your demo account is ready. Log in with your new email and password.')
        setPassword('')
        setConfirmPassword('')
      } else {
        const user = await authenticateAccount(email, password)
        startSession(user, remember)
        onAuthenticated(user)
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'We couldn’t complete that request. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function showPasswordResetMessage() {
    setError('')
    setNotice('Password reset is a demo only. Create a new demo account or contact your workspace administrator.')
  }

  return (
    <main className="auth-page">
      <div className="auth-orb auth-orb-one" />
      <div className="auth-orb auth-orb-two" />
      <div className="auth-layout">
        <section className="auth-story" aria-label="TaskFlow Pro introduction">
          <a className="auth-brand" href="#login" onClick={(event) => { event.preventDefault(); changeMode('login') }}>
            <span className="auth-brand-mark"><CheckCheck size={20} /></span>
            <span>taskflow<span>.pro</span></span>
          </a>
          <div className="auth-story-copy">
            <span className="auth-kicker"><Sparkles size={14} /> A little more in control</span>
            <h1>Make room for<br /><span>your best work.</span></h1>
            <p>One calm place for classes, deadlines, and all the little wins along the way.</p>
          </div>
          <div className="auth-preview" aria-hidden="true">
            <div className="preview-top"><span className="preview-dots"><i /><i /><i /></span><span>YOUR WEEK, AT A GLANCE</span><BookOpen size={15} /></div>
            <div className="preview-title">A good week starts here <span>✦</span></div>
            <div className="preview-subtitle">You’re finding your rhythm. Keep it going.</div>
            <div className="preview-progress"><div><span>Weekly progress</span><strong>72%</strong></div><span className="preview-track"><i /></span></div>
            <div className="preview-tasks">
              <div><span className="preview-check"><Check size={11} /></span><span>Review biology notes</span><small>DONE</small></div>
              <div><span className="preview-empty-check" /><span>Prepare for statistics</span><small>TODAY</small></div>
              <div><span className="preview-empty-check" /><span>Draft literature essay</span><small>FRI</small></div>
            </div>
            <div className="preview-foot"><span><Sparkles size={13} />Keep your momentum</span><i>↗</i></div>
          </div>
          <div className="auth-trust"><ShieldCheck size={15} /><span>A friendly space for your next big idea.</span></div>
        </section>

        <section className="auth-form-side">
          <div className="auth-form-card">
            <div className="auth-card-mark"><span className="auth-brand-mark"><CheckCheck size={19} /></span></div>
            <div className="auth-heading">
              <p className="auth-eyebrow">{mode === 'login' ? 'WELCOME BACK' : 'YOUR NEXT CHAPTER STARTS HERE'}</p>
              <h2>{mode === 'login' ? 'Good to see you.' : 'Create your account.'}</h2>
              <p>{mode === 'login' ? 'Pick up where you left off.' : 'Get your studies organized, one step at a time.'}</p>
            </div>

            <div className="auth-prototype-note"><LockKeyhole size={13} /><span>Local demo sign-in · your data stays in this browser</span></div>

            <form className="auth-form" noValidate onSubmit={handleSubmit}>
              {mode === 'signup' && (
                <label className="auth-field">
                  <span>Full name</span>
                  <div className="auth-input-wrap"><input autoComplete="name" maxLength={80} onChange={(event) => setName(event.target.value)} placeholder="Jamie Davis" value={name} /><span className="auth-field-icon"><BookOpen size={16} /></span></div>
                </label>
              )}
              <label className="auth-field">
                <span>Email address</span>
                <div className="auth-input-wrap"><input autoComplete="email" inputMode="email" onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" type="email" value={email} /><span className="auth-field-icon"><Mail size={16} /></span></div>
              </label>
              <label className="auth-field">
                <span>Password</span>
                <div className="auth-input-wrap"><input autoComplete={mode === 'login' ? 'current-password' : 'new-password'} onChange={(event) => setPassword(event.target.value)} placeholder={mode === 'signup' ? 'At least 8 characters' : 'Enter your password'} type={showPassword ? 'text' : 'password'} value={password} /><button aria-label={showPassword ? 'Hide password' : 'Show password'} className="auth-field-icon auth-eye" onClick={() => setShowPassword((visible) => !visible)} type="button">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>
              </label>
              {mode === 'signup' && (
                <label className="auth-field">
                  <span>Confirm password</span>
                  <div className="auth-input-wrap"><input autoComplete="new-password" onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Enter your password again" type={showPassword ? 'text' : 'password'} value={confirmPassword} /><span className="auth-field-icon"><LockKeyhole size={16} /></span></div>
                </label>
              )}

              {mode === 'login' && <div className="auth-options"><label className="remember-option"><input checked={remember} onChange={(event) => setRemember(event.target.checked)} type="checkbox" /><span className="custom-checkbox"><Check size={11} /></span><span>Remember me</span></label><button className="auth-text-button" onClick={showPasswordResetMessage} type="button">Forgot password?</button></div>}
              {error && <p className="auth-feedback auth-error" role="alert">{error}</p>}
              {notice && <p className="auth-feedback auth-notice" role="status">{notice}</p>}
              <button className="auth-submit" disabled={isSubmitting} type="submit"><span>{isSubmitting ? 'One moment…' : mode === 'login' ? 'Log in to your workspace' : 'Create my account'}</span><ArrowRight size={17} /></button>
            </form>

            <p className="auth-switch">{mode === 'login' ? 'New to TaskFlow?' : 'Already have an account?'} <button onClick={() => changeMode(mode === 'login' ? 'signup' : 'login')} type="button">{mode === 'login' ? 'Create an account' : 'Log in'} <ArrowRight size={13} /></button></p>
            <p className="auth-security-copy"><LockKeyhole size={12} /> Demo only: passwords are hashed locally, but this is not production authentication.</p>
          </div>
          <p className="auth-footer">Made for the little wins and the big plans <span>✦</span></p>
        </section>
      </div>
    </main>
  )
}
