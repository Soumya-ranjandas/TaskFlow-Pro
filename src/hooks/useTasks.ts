import { useEffect, useState } from 'react'
import type { Task, TaskRecurrence, TaskSubtask } from '../types'
import { claimDemoSeed, readUserStorage, scopedStorageKey } from '../userStorage'

const LEGACY_STORAGE_KEYS = ['taskflow-pro.tasks.v2', 'taskflow-pro.tasks.v1']
const DAILY_GOAL = 3

function dateAfter(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function timestampAfter(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  date.setHours(12, 0, 0, 0)
  return date.toISOString()
}

function demoTasks(): Task[] {
  return [
    { id: 'demo-biology', title: 'Finish cell biology lab report', course: 'Biology', dueDate: dateAfter(1), priority: 'High', status: 'In progress', notes: 'Add the microscope observations and final results.', createdAt: timestampAfter(-4) },
    { id: 'demo-stats', title: 'Review probability problem set', course: 'Statistics', dueDate: dateAfter(2), priority: 'Medium', status: 'To do', notes: 'Revisit conditional probability and Bayes’ theorem.', createdAt: timestampAfter(-3) },
    { id: 'demo-lit', title: 'Read The Great Gatsby, chapters 4–6', course: 'Literature', dueDate: dateAfter(3), priority: 'Low', status: 'To do', notes: '', createdAt: timestampAfter(-2) },
    { id: 'demo-cs', title: 'Build a responsive portfolio page', course: 'Computer Science', dueDate: dateAfter(4), priority: 'High', status: 'In progress', notes: 'Remember to test mobile breakpoints.', createdAt: timestampAfter(-2) },
    { id: 'demo-biology-quiz', title: 'Study for genetics quiz', course: 'Biology', dueDate: dateAfter(5), priority: 'Medium', status: 'To do', notes: '', createdAt: timestampAfter(-1) },
    { id: 'demo-stats-done', title: 'Submit data visualization exercise', course: 'Statistics', dueDate: dateAfter(-1), priority: 'Medium', status: 'Done', notes: '', createdAt: timestampAfter(-3), completedAt: timestampAfter(-1) },
    { id: 'demo-lit-done', title: 'Outline comparative essay', course: 'Literature', dueDate: dateAfter(0), priority: 'Low', status: 'Done', notes: 'Compare the main characters and themes.', createdAt: timestampAfter(-2), completedAt: timestampAfter(0) },
  ]
}

function isTask(value: unknown): value is Task {
  return typeof value === 'object' && value !== null &&
    'id' in value && typeof value.id === 'string' &&
    'title' in value && typeof value.title === 'string' &&
    'course' in value && typeof value.course === 'string' &&
    'dueDate' in value && typeof value.dueDate === 'string' &&
    'priority' in value && typeof value.priority === 'string' && ['Low', 'Medium', 'High'].includes(value.priority) &&
    'status' in value && typeof value.status === 'string' && ['To do', 'In progress', 'Done'].includes(value.status) &&
    'notes' in value && typeof value.notes === 'string' &&
    (!('createdAt' in value) || typeof value.createdAt === 'string') &&
    (!('completedAt' in value) || typeof value.completedAt === 'string') &&
    (!('startDate' in value) || typeof value.startDate === 'string') &&
    (!('estimatedMinutes' in value) || typeof value.estimatedMinutes === 'number') &&
    (!('tags' in value) || Array.isArray(value.tags) && value.tags.every((tag) => typeof tag === 'string')) &&
    (!('subtasks' in value) || Array.isArray(value.subtasks) && value.subtasks.every(isSubtask)) &&
    (!('recurrence' in value) || typeof value.recurrence === 'string' && ['None', 'Daily', 'Weekly', 'Monthly'].includes(value.recurrence)) &&
    (!('dependsOn' in value) || Array.isArray(value.dependsOn) && value.dependsOn.every((id) => typeof id === 'string')) &&
    (!('color' in value) || typeof value.color === 'string') &&
    (!('description' in value) || typeof value.description === 'string')
}

function isSubtask(value: unknown): value is TaskSubtask {
  return typeof value === 'object' && value !== null &&
    'id' in value && typeof value.id === 'string' &&
    'title' in value && typeof value.title === 'string' &&
    'done' in value && typeof value.done === 'boolean'
}

function advanceDate(value: string, recurrence: TaskRecurrence) {
  if (!value || recurrence === 'None') return value
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, 1)
  if (recurrence === 'Monthly') {
    date.setMonth(date.getMonth() + 1)
    date.setDate(Math.min(day, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()))
  } else {
    date.setDate(day + (recurrence === 'Daily' ? 1 : 7))
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function nextOccurrence(task: Task): Task | null {
  if (!task.recurrence || task.recurrence === 'None') return null
  return {
    ...task,
    id: crypto.randomUUID(),
    dueDate: advanceDate(task.dueDate, task.recurrence),
    startDate: task.startDate ? advanceDate(task.startDate, task.recurrence) : undefined,
    status: 'To do',
    createdAt: new Date().toISOString(),
    completedAt: undefined,
    subtasks: task.subtasks?.map((subtask) => ({ ...subtask, id: crypto.randomUUID(), done: false })),
    dependsOn: [],
  }
}

function readTasks(userId: string): Task[] {
  try {
    const storageKey = scopedStorageKey('tasks', 2, userId)
    const stored = readUserStorage(userId, storageKey, LEGACY_STORAGE_KEYS)
    if (!stored) return claimDemoSeed(userId, 'tasks') ? demoTasks() : []

    const parsed: unknown = JSON.parse(stored)
    if (!Array.isArray(parsed)) {
      console.error('Saved tasks have an invalid format.')
      return []
    }
    const tasks = parsed.filter(isTask)
    if (tasks.length !== parsed.length) console.error('Some saved tasks were invalid and could not be loaded.')
    return tasks
  } catch (error) {
    console.error('Unable to load saved tasks.', error)
    return []
  }
}

export function useTasks(userId: string) {
  const storageKey = scopedStorageKey('tasks', 2, userId)
  const [tasks, setTasks] = useState<Task[]>(() => readTasks(userId))

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(tasks))
    } catch (error) {
      console.error('Unable to save tasks to local storage.', error)
    }
  }, [tasks, storageKey])

  return {
    tasks,
    addTask: (task: Omit<Task, 'id'>) =>
      setTasks((current) => [{ ...task, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...current]),
    updateTask: (task: Task) =>
      setTasks((current) => current.flatMap((item) => {
        if (item.id !== task.id) return [item]
        const updated = {
          ...task,
          createdAt: item.createdAt ?? task.createdAt,
          completedAt: task.status === 'Done'
            ? item.status === 'Done' ? item.completedAt : new Date().toISOString()
            : undefined,
        }
        const next = item.status !== 'Done' && updated.status === 'Done' ? nextOccurrence(updated) : null
        return next ? [updated, next] : [updated]
      })),
    deleteTask: (id: string) => setTasks((current) => current.filter((task) => task.id !== id)),
    restoreTasks: (restored: Task[]) => setTasks((current) => {
      const existing = new Set(current.map((task) => task.id))
      return [...restored.filter((task) => !existing.has(task.id)), ...current]
    }),
    toggleTask: (id: string) =>
      setTasks((current) => current.flatMap((task) => {
        if (task.id !== id) return [task]
        if (task.status === 'Done') return [{ ...task, status: 'To do', completedAt: undefined }]
        const completed = { ...task, status: 'Done' as const, completedAt: new Date().toISOString() }
        const next = nextOccurrence(completed)
        return next ? [completed, next] : [completed]
      })),
    dailyGoal: DAILY_GOAL,
  }
}
