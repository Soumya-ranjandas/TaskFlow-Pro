import { useEffect, useState } from 'react'
import type { Exam } from '../types'
import { claimDemoSeed, readUserStorage, scopedStorageKey } from '../userStorage'

const LEGACY_STORAGE_KEYS = ['taskflow-pro.exams.v1']

function dateAfter(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function demoExams(): Exam[] {
  return [
    { id: 'demo-exam-biology', title: 'Cell Biology Midterm', subject: 'Biology', date: dateAfter(8), syllabus: 'Cell structure, genetics, and lab methods', targetMarks: 90, createdAt: new Date().toISOString() },
    { id: 'demo-exam-statistics', title: 'Statistics Quiz 2', subject: 'Statistics', date: dateAfter(15), syllabus: 'Probability, distributions, and sampling', targetMarks: 85, createdAt: new Date().toISOString() },
  ]
}

function isExam(value: unknown): value is Exam {
  return typeof value === 'object' && value !== null &&
    'id' in value && typeof value.id === 'string' &&
    'title' in value && typeof value.title === 'string' &&
    'subject' in value && typeof value.subject === 'string' &&
    'date' in value && typeof value.date === 'string' &&
    'syllabus' in value && typeof value.syllabus === 'string' &&
    'targetMarks' in value && (typeof value.targetMarks === 'number' || value.targetMarks === null) &&
    (!('preparation' in value) || typeof value.preparation === 'string' && ['Not started', 'In progress', 'Ready'].includes(value.preparation)) &&
    'createdAt' in value && typeof value.createdAt === 'string'
}

function readExams(userId: string): Exam[] {
  try {
    const stored = readUserStorage(userId, scopedStorageKey('exams', 1, userId), LEGACY_STORAGE_KEYS)
    if (!stored) return claimDemoSeed(userId, 'exams') ? demoExams() : []
    const parsed: unknown = JSON.parse(stored)
    if (!Array.isArray(parsed)) throw new Error('Saved exams have an invalid format.')
    const exams = parsed.filter(isExam)
    if (exams.length !== parsed.length) console.error('Some saved exams were invalid and could not be loaded.')
    return exams
  } catch (error) {
    console.error('Unable to load saved exams.', error)
    return []
  }
}

export function useExams(userId: string) {
  const storageKey = scopedStorageKey('exams', 1, userId)
  const [exams, setExams] = useState<Exam[]>(() => readExams(userId))

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(exams))
    } catch (error) {
      console.error('Unable to save exams to local storage.', error)
    }
  }, [exams, storageKey])

  return {
    exams,
    addExam: (exam: Omit<Exam, 'id' | 'createdAt'>) =>
      setExams((current) => [{ ...exam, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...current]),
    updateExam: (exam: Exam) =>
      setExams((current) => current.map((item) => item.id === exam.id ? exam : item)),
    deleteExam: (id: string) => setExams((current) => current.filter((exam) => exam.id !== id)),
  }
}
