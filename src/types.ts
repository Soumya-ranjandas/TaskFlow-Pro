export type TaskPriority = 'Low' | 'Medium' | 'High'
export type TaskStatus = 'To do' | 'In progress' | 'Done'
export type TaskRecurrence = 'None' | 'Daily' | 'Weekly' | 'Monthly'

export interface TaskSubtask {
  id: string
  title: string
  done: boolean
}

export interface Task {
  id: string
  title: string
  course: string
  dueDate: string
  priority: TaskPriority
  status: TaskStatus
  notes: string
  createdAt?: string
  completedAt?: string
  startDate?: string
  estimatedMinutes?: number
  tags?: string[]
  subtasks?: TaskSubtask[]
  recurrence?: TaskRecurrence
  dependsOn?: string[]
  color?: string
  description?: string
}

export interface Exam {
  id: string
  title: string
  subject: string
  date: string
  syllabus: string
  targetMarks: number | null
  preparation?: 'Not started' | 'In progress' | 'Ready'
  createdAt: string
}

export interface AuthUser {
  id: string
  name: string
  email: string
}
