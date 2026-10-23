import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import type { Exam } from '../types'

interface ExamDialogProps {
  subjects: string[]
  exam?: Exam
  initialDate?: string
  onClose: () => void
  onSave: (exam: Omit<Exam, 'id' | 'createdAt'>) => void
}

export default function ExamDialog({ subjects, exam, initialDate = '', onClose, onSave }: ExamDialogProps) {
  const [title, setTitle] = useState(exam?.title ?? '')
  const [subject, setSubject] = useState(exam?.subject ?? subjects[0] ?? '')
  const [date, setDate] = useState(exam?.date ?? initialDate)
  const [syllabus, setSyllabus] = useState(exam?.syllabus ?? '')
  const [targetMarks, setTargetMarks] = useState(exam?.targetMarks == null ? '' : String(exam.targetMarks))
  const [preparation, setPreparation] = useState<NonNullable<Exam['preparation']>>(exam?.preparation ?? 'Not started')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSave({ title: title.trim(), subject: subject.trim(), date, syllabus: syllabus.trim(), targetMarks: targetMarks ? Number(targetMarks) : null, preparation })
    onClose()
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section aria-labelledby="exam-dialog-title" aria-modal="true" className="dialog-card" role="dialog">
        <div className="dialog-heading">
          <div><p className="eyebrow">PLAN AHEAD</p><h2 id="exam-dialog-title">{exam ? 'Edit exam' : 'Add an exam'}</h2></div>
          <button aria-label="Close exam dialog" className="icon-button" onClick={onClose} type="button"><X size={19} /></button>
        </div>
        <form className="task-form" onSubmit={handleSubmit}>
          <label className="field full-field"><span>Exam name</span><input autoFocus maxLength={80} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Biology midterm" required value={title} /></label>
          <label className="field"><span>Subject</span><input list="exam-subject-options" maxLength={50} onChange={(event) => setSubject(event.target.value)} placeholder="e.g. Biology" required value={subject} /><datalist id="exam-subject-options">{subjects.map((item) => <option key={item} value={item} />)}</datalist></label>
          <label className="field"><span>Exam date</span><input min={exam || initialDate && initialDate < new Date().toISOString().slice(0, 10) ? undefined : new Date().toISOString().slice(0, 10)} onChange={(event) => setDate(event.target.value)} required type="date" value={date} /></label>
          <label className="field"><span>Target mark <small>Optional</small></span><input max="100" min="0" onChange={(event) => setTargetMarks(event.target.value)} placeholder="e.g. 90" type="number" value={targetMarks} /></label>
          <label className="field"><span>Preparation status</span><select onChange={(event) => setPreparation(event.target.value as NonNullable<Exam['preparation']>)} value={preparation}><option>Not started</option><option>In progress</option><option>Ready</option></select></label>
          <label className="field full-field"><span>Syllabus <small>Optional</small></span><textarea maxLength={1000} onChange={(event) => setSyllabus(event.target.value)} placeholder="Topics you want to cover before exam day…" rows={3} value={syllabus} /></label>
          <div className="form-actions"><button className="button button-secondary" onClick={onClose} type="button">Cancel</button><button className="button button-primary" type="submit">{exam ? 'Save changes' : 'Save exam'}</button></div>
        </form>
      </section>
    </div>
  )
}
