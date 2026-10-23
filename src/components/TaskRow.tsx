import { AlertTriangle, CalendarDays, Check, Circle, Clock3, Copy, Pencil, Repeat2, Trash2 } from 'lucide-react'
import type { Task } from '../types'

interface TaskRowProps {
  task: Task
  blocked?: boolean
  selected?: boolean
  selectable?: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onDuplicate?: () => void
  onSelect?: () => void
  onToggleSubtask?: (subtaskId: string) => void
  onDragStart?: () => void
  onDrop?: () => void
}

function formatDueDate(value: string) {
  if (!value) return 'No due date'
  const date = new Date(`${value}T00:00:00`)
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date)
}

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function TaskRow({ task, blocked = false, selected = false, selectable = false, onToggle, onEdit, onDelete, onDuplicate, onSelect, onToggleSubtask, onDragStart, onDrop }: TaskRowProps) {
  const overdue = task.dueDate && task.dueDate < localDateKey(new Date()) && task.status !== 'Done'
  const completeSubtasks = task.subtasks?.filter((subtask) => subtask.done).length ?? 0

  return (
    <article className={`task-row ${task.status === 'Done' ? 'task-done' : ''} ${blocked ? 'task-blocked' : ''}`} draggable={Boolean(onDragStart)} onDragStart={(event) => { event.dataTransfer.setData('text/plain', task.id); onDragStart?.() }} onDragOver={(event) => onDrop && event.preventDefault()} onDrop={(event) => { event.preventDefault(); onDrop?.() }} style={task.color ? { '--task-accent': task.color } as React.CSSProperties : undefined}>
      {selectable && <label className="task-select"><input aria-label={`Select ${task.title}`} checked={selected} onChange={onSelect} type="checkbox" /></label>}
      <button aria-label={task.status === 'Done' ? `Mark ${task.title} as not done` : `Complete ${task.title}`} className={`complete-button ${task.status === 'Done' ? 'is-complete' : ''}`} onClick={onToggle} type="button">
        {task.status === 'Done' ? <Check size={14} /> : <Circle size={19} />}
      </button>
      <div className="task-main">
        <button className="task-title" onClick={onEdit} type="button">{task.title}</button>
        <div className="task-meta">
          <span className="course-name">{task.course || 'Personal'}</span>
          <span className={`due-date ${overdue ? 'overdue' : ''}`}><CalendarDays size={13} />{overdue ? 'Overdue · ' : ''}{formatDueDate(task.dueDate)}</span>
          {task.estimatedMinutes && <span className="due-date"><Clock3 size={12} />{task.estimatedMinutes}m</span>}
          {task.recurrence && task.recurrence !== 'None' && <span className="due-date" title={`${task.recurrence} recurring task`}><Repeat2 size={12} />{task.recurrence}</span>}
        </div>
        {task.tags && task.tags.length > 0 && <div className="task-tags">{task.tags.slice(0, 3).map((tag) => <span className="task-tag" key={tag}>{tag}</span>)}</div>}
        {blocked && <span className="blocked-hint"><AlertTriangle size={11} />Blocked by an unfinished task</span>}
        {task.subtasks && task.subtasks.length > 0 && <details className="row-subtasks"><summary>{completeSubtasks}/{task.subtasks.length} subtasks</summary><div>{task.subtasks.map((subtask) => <label key={subtask.id}><input checked={subtask.done} onChange={() => onToggleSubtask?.(subtask.id)} type="checkbox" /><span className={subtask.done ? 'subtask-complete' : ''}>{subtask.title}</span></label>)}</div></details>}
      </div>
      <span className={`priority priority-${task.priority.toLowerCase()}`}><span />{task.priority}</span>
      <span className={`status-label status-${task.status.toLowerCase().replace(' ', '-')}`}>{task.status}</span>
      <div className="row-actions">
        <button aria-label={`Edit ${task.title}`} className="icon-button" onClick={onEdit} type="button"><Pencil size={15} /></button>
        {onDuplicate && <button aria-label={`Duplicate ${task.title}`} className="icon-button" onClick={onDuplicate} type="button"><Copy size={14} /></button>}
        <button aria-label={`Delete ${task.title}`} className="icon-button delete-button" onClick={onDelete} type="button"><Trash2 size={15} /></button>
      </div>
    </article>
  )
}
