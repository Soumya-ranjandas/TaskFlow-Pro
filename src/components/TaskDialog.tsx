import { useState, type FormEvent } from 'react'
import { ChevronDown, X } from 'lucide-react'
import type { Task, TaskPriority, TaskStatus } from '../types'

interface TaskDialogProps {
  task: Task | null
  subjects: string[]
  tasks: Task[]
  initialDueDate?: string
  onClose: () => void
  onSave: (task: Omit<Task, 'id'>) => void
  onUpdate: (task: Task) => void
}

function wouldCreateDependencyCycle(tasks: Task[], taskId: string | undefined, dependencyId: string) {
  if (!taskId) return false
  const visited = new Set<string>()
  const pending = [dependencyId]
  while (pending.length) {
    const currentId = pending.pop()
    if (!currentId || visited.has(currentId)) continue
    if (currentId === taskId) return true
    visited.add(currentId)
    const current = tasks.find((item) => item.id === currentId)
    if (current) pending.push(...(current.dependsOn ?? []))
  }
  return false
}

const emptyTask: Omit<Task, 'id' | 'estimatedMinutes' | 'tags' | 'subtasks' | 'dependsOn'> & {
  estimatedMinutes: string
  tags: string
  subtasks: string
  dependsOn: string[]
} = {
  title: '',
  course: '',
  dueDate: '',
  startDate: '',
  priority: 'Medium' as TaskPriority,
  status: 'To do' as TaskStatus,
  notes: '',
  description: '',
  estimatedMinutes: '',
  tags: '',
  subtasks: '',
  recurrence: 'None',
  dependsOn: [],
  color: '#716de0',
}

type TaskForm = typeof emptyTask

function formFromTask(task: Task | null, initialDueDate: string): TaskForm {
  if (!task) return { ...emptyTask, dueDate: initialDueDate }
  return {
    title: task.title,
    course: task.course,
    dueDate: task.dueDate,
    startDate: task.startDate ?? '',
    priority: task.priority,
    status: task.status,
    notes: task.notes,
    description: task.description ?? '',
    estimatedMinutes: task.estimatedMinutes?.toString() ?? '',
    tags: task.tags?.join(', ') ?? '',
    subtasks: task.subtasks?.map((subtask) => subtask.title).join('\n') ?? '',
    recurrence: task.recurrence ?? 'None',
    dependsOn: task.dependsOn ?? [],
    color: task.color ?? '#716de0',
  }
}

export default function TaskDialog({ task, subjects, tasks, initialDueDate = '', onClose, onSave, onUpdate }: TaskDialogProps) {
  const [form, setForm] = useState<TaskForm>(() => formFromTask(task, initialDueDate))

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const taskData: Omit<Task, 'id'> = {
      ...form,
      description: form.notes,
      estimatedMinutes: form.estimatedMinutes ? Number(form.estimatedMinutes) : undefined,
      tags: [...new Set(form.tags.split(',').map((tag) => tag.trim()).filter(Boolean))].slice(0, 8),
      subtasks: form.subtasks.split('\n').map((title) => title.trim()).filter(Boolean).map((title) => ({ id: crypto.randomUUID(), title, done: false })),
      dependsOn: form.dependsOn,
      recurrence: form.recurrence as Task['recurrence'],
    }
    if (task) {
      const existingSubtasks = new Map(task.subtasks?.map((subtask) => [subtask.title, subtask]) ?? [])
      taskData.subtasks = taskData.subtasks?.map((subtask) => {
        const existing = existingSubtasks.get(subtask.title)
        return existing ? { ...subtask, id: existing.id, done: existing.done } : subtask
      })
      onUpdate({ ...taskData, id: task.id })
    } else onSave(taskData)
    onClose()
  }

  const dependencyOptions = tasks.filter((item) =>
    item.id !== task?.id && item.status !== 'Done' &&
    !wouldCreateDependencyCycle(tasks, task?.id, item.id))

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section aria-labelledby="dialog-title" aria-modal="true" className="dialog-card" role="dialog">
        <div className="dialog-heading">
          <div>
            <p className="eyebrow">YOUR WORKSPACE</p>
            <h2 id="dialog-title">{task ? 'Edit task' : 'Create a task'}</h2>
          </div>
          <button aria-label="Close dialog" className="icon-button" onClick={onClose} type="button"><X size={19} /></button>
        </div>
        <form className="task-form" onSubmit={handleSubmit}>
          <label className="field full-field">
            <span>Task name</span>
            <input autoFocus maxLength={100} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. Read chapter 6" required value={form.title} />
          </label>
          <label className="field">
            <span>Course</span>
            <input list="task-subject-options" maxLength={50} onChange={(event) => setForm({ ...form, course: event.target.value })} placeholder="e.g. Biology" value={form.course} />
            <datalist id="task-subject-options">{subjects.map((subject) => <option key={subject} value={subject} />)}</datalist>
          </label>
          <label className="field">
            <span>Start date</span>
            <input onChange={(event) => setForm({ ...form, startDate: event.target.value })} type="date" value={form.startDate} />
          </label>
          <label className="field">
            <span>Deadline</span>
            <input onChange={(event) => setForm({ ...form, dueDate: event.target.value })} type="date" value={form.dueDate} />
          </label>
          <label className="field">
            <span>Priority</span>
            <select onChange={(event) => setForm({ ...form, priority: event.target.value as TaskPriority })} value={form.priority}>
              <option>Low</option><option>Medium</option><option>High</option>
            </select>
          </label>
          <label className="field">
            <span>Status</span>
            <select onChange={(event) => setForm({ ...form, status: event.target.value as TaskStatus })} value={form.status}>
              <option>To do</option><option>In progress</option><option>Done</option>
            </select>
          </label>
          <label className="field full-field">
            <span>Description <small>Optional</small></span>
            <textarea maxLength={1000} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="What needs to get done?" rows={3} value={form.notes} />
          </label>
          <details className="task-advanced full-field">
            <summary>More task details <ChevronDown size={14} /></summary>
            <div className="task-advanced-grid">
              <label className="field"><span>Estimated minutes</span><input max="1440" min="1" onChange={(event) => setForm({ ...form, estimatedMinutes: event.target.value })} placeholder="e.g. 45" type="number" value={form.estimatedMinutes} /></label>
              <label className="field"><span>Repeat</span><select onChange={(event) => setForm({ ...form, recurrence: event.target.value as Task['recurrence'] })} value={form.recurrence}><option>None</option><option>Daily</option><option>Weekly</option><option>Monthly</option></select></label>
              <label className="field full-field"><span>Tags <small>Comma separated</small></span><input maxLength={200} onChange={(event) => setForm({ ...form, tags: event.target.value })} placeholder="reading, revision, group work" value={form.tags} /></label>
              <label className="field full-field"><span>Subtasks <small>One per line</small></span><textarea maxLength={1000} onChange={(event) => setForm({ ...form, subtasks: event.target.value })} placeholder={'Read the brief\nGather materials\nSubmit final work'} rows={3} value={form.subtasks} /></label>
              <div className="field full-field"><span>Blocked by</span>{dependencyOptions.length ? <div className="dependency-options">{dependencyOptions.map((item) => <label key={item.id}><input checked={form.dependsOn.includes(item.id)} onChange={(event) => setForm({ ...form, dependsOn: event.target.checked ? [...form.dependsOn, item.id] : form.dependsOn.filter((id) => id !== item.id) })} type="checkbox" />{item.title}</label>)}</div> : <small>No open tasks available as dependencies.</small>}</div>
              <label className="field full-field"><span>Label color</span><input aria-label="Task label color" onChange={(event) => setForm({ ...form, color: event.target.value })} type="color" value={form.color} /></label>
            </div>
          </details>
          <div className="form-actions">
            <button className="button button-secondary" onClick={onClose} type="button">Cancel</button>
            <button className="button button-primary" type="submit">{task ? 'Save changes' : 'Add task'}</button>
          </div>
        </form>
      </section>
    </div>
  )
}
