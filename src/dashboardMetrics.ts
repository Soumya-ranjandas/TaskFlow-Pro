import type { Task } from './types'

export function localDayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function shiftDayKey(key: string, days: number) {
  const [year, month, day] = key.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + days)
  return localDayKey(date)
}

function completedDay(task: Task) {
  if (!task.completedAt) return null
  const date = new Date(task.completedAt)
  return Number.isNaN(date.getTime()) ? null : localDayKey(date)
}

export function calculateCompletionStreaks(tasks: Task[], now = new Date()) {
  const completionDays = new Set(tasks
    .filter((task) => task.status === 'Done')
    .map(completedDay)
    .filter((day): day is string => day !== null))
  const today = localDayKey(now)
  let currentStreak = 0
  let cursor = completionDays.has(today) ? today : shiftDayKey(today, -1)

  while (completionDays.has(cursor)) {
    currentStreak += 1
    cursor = shiftDayKey(cursor, -1)
  }

  const orderedDays = [...completionDays].sort()
  let longestStreak = 0
  let run = 0
  let previous = ''
  for (const day of orderedDays) {
    run = previous && shiftDayKey(previous, 1) === day ? run + 1 : 1
    longestStreak = Math.max(longestStreak, run)
    previous = day
  }
  return { currentStreak, longestStreak, completionDays }
}

export function getWeekStart(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  return start
}
