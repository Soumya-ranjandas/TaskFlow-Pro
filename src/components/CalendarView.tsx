import { useState } from 'react'
import { AlarmClock, CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import type { Exam, Task } from '../types'

type CalendarMode = 'Month' | 'Week' | 'Day'

interface CalendarViewProps {
  tasks: Task[]
  exams: Exam[]
  onTaskClick: (task: Task) => void
  onExamClick: (exam: Exam) => void
  onAddTask: (date: string) => void
  onAddExam: (date: string) => void
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function startOfWeek(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  start.setDate(start.getDate() - start.getDay())
  return start
}

function moveDate(date: Date, mode: CalendarMode, direction: number) {
  const moved = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  if (mode === 'Month') moved.setMonth(moved.getMonth() + direction, 1)
  else moved.setDate(moved.getDate() + direction * (mode === 'Week' ? 7 : 1))
  return moved
}

function makeDays(anchor: Date, mode: CalendarMode) {
  if (mode === 'Day') return [new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate())]
  if (mode === 'Week') {
    const start = startOfWeek(anchor)
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start)
      date.setDate(start.getDate() + index)
      return date
    })
  }
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const start = startOfWeek(first)
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return date
  })
}

function eventLabel(task: Task | undefined, exam: Exam | undefined) {
  return task ? `${task.title} · ${task.course || 'Task'}${task.status === 'Done' ? ' · Completed' : ''}` : `${exam?.title ?? 'Exam'} · ${exam?.subject ?? ''}`
}

export default function CalendarView({ tasks, exams, onTaskClick, onExamClick, onAddTask, onAddExam }: CalendarViewProps) {
  const [mode, setMode] = useState<CalendarMode>('Month')
  const [anchor, setAnchor] = useState(() => new Date())
  const days = makeDays(anchor, mode)
  const selectedKey = dateKey(anchor)
  const selectedTasks = tasks.filter((task) => task.dueDate === selectedKey)
  const selectedExams = exams.filter((exam) => exam.date === selectedKey)
  const openSelectedTasks = selectedTasks.filter((task) => task.status !== 'Done')
  const hasConflict = (selectedExams.length > 0 && openSelectedTasks.length > 0) || openSelectedTasks.length >= 4
  const heading = mode === 'Month'
    ? new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(anchor)
    : mode === 'Day'
      ? new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(anchor)
      : `${new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(days[0])} – ${new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(days[6])}`

  function renderEvents(date: Date, compact: boolean) {
    const key = dateKey(date)
    const dayTasks = tasks.filter((task) => task.dueDate === key)
    const dayExams = exams.filter((exam) => exam.date === key)
    const visibleTasks = compact ? dayTasks.slice(0, 2) : dayTasks
    const visibleExams = compact ? dayExams.slice(0, Math.max(0, 2 - visibleTasks.length)) : dayExams
    return (
      <>
        {visibleTasks.map((task) => <button className={`calendar-event calendar-task-event ${task.status === 'Done' ? 'calendar-event-done' : ''}`} key={`task-${task.id}`} onClick={() => onTaskClick(task)} title={eventLabel(task, undefined)} type="button">{task.title}</button>)}
        {visibleExams.map((exam) => <button className="calendar-event calendar-exam-event" key={`exam-${exam.id}`} onClick={() => onExamClick(exam)} title={eventLabel(undefined, exam)} type="button"><AlarmClock size={11} />{exam.title}</button>)}
        {compact && dayTasks.length + dayExams.length > visibleTasks.length + visibleExams.length && <span className="calendar-more">+{dayTasks.length + dayExams.length - visibleTasks.length - visibleExams.length} more</span>}
      </>
    )
  }

  return (
    <section className="calendar-page">
      <section className="welcome-row page-welcome">
        <div><p className="eyebrow">YOUR STUDY SCHEDULE</p><h1>Calendar</h1><p className="welcome-copy">Keep tasks and exams together, and plan the days ahead.</p></div>
        <div className="calendar-quick-actions"><button className="button button-secondary" onClick={() => onAddExam(selectedKey)} type="button"><AlarmClock size={14} />Add exam</button><button className="button button-primary" onClick={() => onAddTask(selectedKey)} type="button"><Plus size={14} />Add task</button></div>
      </section>

      <section aria-label="Calendar" className="calendar-panel">
        <div className="calendar-toolbar">
          <div className="calendar-navigation"><button aria-label="Previous period" className="icon-button" onClick={() => setAnchor((date) => moveDate(date, mode, -1))} type="button"><ChevronLeft size={17} /></button><button className="button button-secondary calendar-today" onClick={() => setAnchor(new Date())} type="button">Today</button><button aria-label="Next period" className="icon-button" onClick={() => setAnchor((date) => moveDate(date, mode, 1))} type="button"><ChevronRight size={17} /></button><h2>{heading}</h2></div>
          <div aria-label="Calendar view" className="calendar-view-switch" role="group">{(['Month', 'Week', 'Day'] as const).map((item) => <button aria-pressed={mode === item} className={mode === item ? 'selected' : ''} key={item} onClick={() => setMode(item)} type="button">{item}</button>)}</div>
        </div>

        {mode !== 'Day' && <div className="calendar-weekdays">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}</div>}
        <div className={`calendar-grid calendar-${mode.toLowerCase()}`}>
          {days.map((date) => {
            const key = dateKey(date)
            const inMonth = date.getMonth() === anchor.getMonth()
            const isToday = key === dateKey(new Date())
            const isSelected = key === selectedKey
            return (
              <div
                className={`calendar-day ${!inMonth && mode === 'Month' ? 'outside-month' : ''} ${isToday ? 'calendar-is-today' : ''} ${isSelected ? 'calendar-is-selected' : ''}`}
                key={key}
              >
                <button
                aria-label={`${new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(date)}${tasks.some((task) => task.dueDate === key) || exams.some((exam) => exam.date === key) ? ', has scheduled items' : ''}`}
                aria-pressed={isSelected}
                className="calendar-date-select"
                onClick={() => setAnchor(new Date(date.getFullYear(), date.getMonth(), date.getDate()))}
                type="button"
              >
                <span className="calendar-date-number">{date.getDate()}{isToday && <i>Today</i>}</span>
                </button>
                <span className="calendar-day-events">{renderEvents(date, mode === 'Month')}</span>
              </div>
            )
          })}
        </div>
      </section>

      <section className="calendar-agenda">
        <div className="calendar-agenda-heading"><div><p className="eyebrow">SELECTED DATE</p><h2>{new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(anchor)}</h2></div><button className="button button-secondary" onClick={() => onAddTask(selectedKey)} type="button"><Plus size={14} />Add to this day</button></div>
        {hasConflict && <p className="calendar-conflict" role="status"><AlarmClock size={14} />Busy day: {openSelectedTasks.length} open {openSelectedTasks.length === 1 ? 'task' : 'tasks'}{selectedExams.length ? ` and ${selectedExams.length} ${selectedExams.length === 1 ? 'exam' : 'exams'}` : ''} share this date. Consider moving some tasks earlier.</p>}
        {selectedTasks.length || selectedExams.length
          ? <div className="calendar-agenda-list">
            {selectedTasks.map((task) => <button className="calendar-agenda-item" key={task.id} onClick={() => onTaskClick(task)} type="button"><span className={`calendar-agenda-mark ${task.status === 'Done' ? 'agenda-task-done' : ''}`}><CalendarDays size={15} /></span><span><strong>{task.title}</strong><small>{task.course || 'Task'} · {task.priority} priority · {task.status}</small></span><ChevronRight size={15} /></button>)}
            {selectedExams.map((exam) => <button className="calendar-agenda-item" key={exam.id} onClick={() => onExamClick(exam)} type="button"><span className="calendar-agenda-mark agenda-exam-mark"><AlarmClock size={15} /></span><span><strong>{exam.title}</strong><small>{exam.subject} · Exam</small></span><ChevronRight size={15} /></button>)}
          </div>
          : <div className="calendar-empty"><CalendarDays size={19} /><p>Nothing scheduled for this date.</p><span>Add a task or exam to keep your plan up to date.</span></div>}
        <div className="calendar-agenda-actions"><button onClick={() => onAddTask(selectedKey)} type="button"><Plus size={13} />Task</button><button onClick={() => onAddExam(selectedKey)} type="button"><AlarmClock size={13} />Exam</button></div>
      </section>
    </section>
  )
}
