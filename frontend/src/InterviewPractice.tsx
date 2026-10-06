import { useEffect, useState } from 'react';
import { MessageSquareText, Sparkles } from 'lucide-react';

export default function InterviewPractice() {
  const [role, setRole] = useState('Software Engineer');
  const [interviewType, setInterviewType] = useState('Behavioral');
  const [jobDescription, setJobDescription] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [coachMode, setCoachMode] = useState('local-demo');
  const [secondsRemaining, setSecondsRemaining] = useState(120);
  const [timerActive, setTimerActive] = useState(false);

  useEffect(() => {
    void fetch('/api/practice/status')
      .then((response) => response.json() as Promise<{ mode: string }>)
      .then((status) => setCoachMode(status.mode))
      .catch(() => setCoachMode('local-demo'));
  }, []);

  useEffect(() => {
    if (!timerActive || secondsRemaining === 0) return;
    const timer = window.setInterval(() => setSecondsRemaining((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [timerActive, secondsRemaining]);

  async function requestQuestion() {
    setBusy(true);
    setError('');
    setFeedback('');
    setAnswer('');
    setSecondsRemaining(120);
    try {
      const response = await fetch('/api/practice/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, interview_type: interviewType, job_description: jobDescription }),
      });
      if (!response.ok) throw new Error('Could not load a question.');
      const result: { question: string } = await response.json();
      setQuestion(result.question);
      setTimerActive(false);
    } catch {
      setError('The practice API is unavailable. Check that the backend is running.');
    } finally {
      setBusy(false);
    }
  }

  async function requestFeedback() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/practice/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, answer, job_description: jobDescription }),
      });
      if (!response.ok) throw new Error('Could not review this answer.');
      const result: { feedback: string } = await response.json();
      setFeedback(result.feedback);
    } catch {
      setError('The practice API is unavailable. Check that the backend is running.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="practice-page">
      <div className="practice-heading">
        <div><span className="eyebrow">PREPARE WITH PURPOSE</span><h1>Interview practice</h1><p>Build a clear answer one prompt at a time.</p></div>
        <span className="practice-demo"><Sparkles size={14} /> {coachMode === 'ai' ? 'AI COACH' : 'LOCAL DEMO COACH'}</span>
      </div>
      <div className="practice-layout">
        <article className="practice-panel">
          <div className="practice-title"><MessageSquareText size={18} /><div><strong>Mock interview</strong><span>Role-specific prompts and answer coaching</span></div></div>
          <div className="practice-setup"><label className="practice-role">PRACTICE ROLE<input value={role} onChange={(event) => setRole(event.target.value)} /></label><label className="practice-role">INTERVIEW TYPE<select value={interviewType} onChange={(event) => setInterviewType(event.target.value)}><option>Behavioral</option><option>Technical</option><option>Role-specific</option><option>Case study</option></select></label></div>
          <label className="practice-role">JOB DESCRIPTION<textarea value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} rows={3} maxLength={6000} placeholder="Paste the job description for more relevant prompts (optional)." /></label>
          {question ? <div className="practice-question"><span>YOUR QUESTION</span><h2>{question}</h2></div> : <div className="practice-empty"><Sparkles size={21} /><h2>Start a focused practice round</h2><p>Get a role-specific question, then draft an answer and receive structure-focused feedback.</p></div>}
          {question && <><div className="answer-timer"><span>{Math.floor(secondsRemaining / 60).toString().padStart(2, '0')}:{(secondsRemaining % 60).toString().padStart(2, '0')}</span><div><button type="button" className="archive-view-button" onClick={() => setTimerActive((active) => !active)}>{timerActive ? 'Pause timer' : secondsRemaining < 120 ? 'Resume timer' : 'Start timer'}</button><button type="button" className="archive-view-button" onClick={() => { setSecondsRemaining(120); setTimerActive(false); }}>Reset</button></div></div><label className="practice-answer">YOUR ANSWER<textarea value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Describe the situation, what you did, and what changed." rows={6} /></label><p className="practice-privacy">Your answer is sent for feedback and is not saved in CareerPilot.</p></>}
          {feedback && <div className="practice-feedback"><strong><Sparkles size={15} /> Coach notes</strong><p>{feedback}</p></div>}
          {error && <p className="practice-error" role="status">{error}</p>}
          <div className="practice-actions"><button className="cancel-button" onClick={() => void requestQuestion()} disabled={busy}>{question ? 'New question' : 'Get a question'}</button>{question && <button className="primary-button" onClick={() => void requestFeedback()} disabled={busy || !answer.trim()}><Sparkles size={15} /> Review my answer</button>}</div>
        </article>
        <aside className="practice-aside"><span className="eyebrow">SESSION NOTES</span><h2>A good answer is specific.</h2><p>Use a real example and make your contribution easy to see.</p><ol><li><span>01</span><div><strong>Set the scene</strong><p>Give just enough context to understand the challenge.</p></div></li><li><span>02</span><div><strong>Show your actions</strong><p>Be clear about what you personally did and why.</p></div></li><li><span>03</span><div><strong>Land the outcome</strong><p>Share a result, lesson, or measurable change.</p></div></li></ol></aside>
      </div>
    </section>
  );
}