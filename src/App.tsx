import { lazy, Suspense, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  AlarmClock, ArrowDownWideNarrow, Award, Bell, BookOpen, CalendarDays, Check,
  CheckCheck, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3, Flame,
  KanbanSquare, LayoutDashboard, List, ListTodo, LogOut, Moon, MoreHorizontal,
  Pencil, Play, Plus, RotateCcw, Search, Settings2, Sparkles, Sun, Tag, TimerReset, TrendingUp,
  X, LayoutGrid,
} from 'lucide-react'
import AuthScreen from './components/AuthScreen'
import CalendarView from './components/CalendarView'
import ExamDialog from './components/ExamDialog'
import TaskDialog from './components/TaskDialog'
import TaskRow from './components/TaskRow'
import { endSession, getActiveSession } from './auth'
import { calculateCompletionStreaks, getWeekStart, localDayKey } from './dashboardMetrics'
import { useExams } from './hooks/useExams'
import { useTasks } from './hooks/useTasks'
import { readUserStorage, scopedStorageKey } from './userStorage'
import type { AuthUser, Exam, Task } from './types'
import './styles.css'

const ProgressChart = lazy(() => import('./components/TaskCharts').then((module) => ({ default: module.ProgressChart })))
const SubjectChart = lazy(() => import('./components/TaskCharts').then((module) => ({ default: module.SubjectChart })))
const SUBJECTS_KEY = 'taskflow-pro.subjects.v1'
const THEME_KEY = 'taskflow-pro.theme.v1'
const statusFilters = ['All tasks', 'To do', 'In progress', 'Done'] as const
type StatusFilter = typeof statusFilters[number]
type Page = 'Dashboard' | 'Tasks' | 'Calendar' | 'Subjects' | 'Exams' | 'Focus' | 'Settings'
type TaskView = 'List' | 'Grid' | 'Kanban'
type TaskSort = 'deadline' | 'priority' | 'created' | 'duration'

function dayKey(date: Date) {
  return localDayKey(date)
}

function daysUntil(day: string, from = new Date()) {
  const [year, month, date] = day.split('-').map(Number)
  const target = new Date(year, month - 1, date)
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

function readSubjects(userId: string) {
  try {
    const saved = readUserStorage(userId, scopedStorageKey('subjects', 1, userId), [SUBJECTS_KEY])
    if (!saved) return ['Biology', 'Statistics', 'Literature', 'Computer Science']
    const parsed: unknown = JSON.parse(saved)
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) return parsed
    console.error('Saved subjects have an invalid format.')
  } catch (error) {
    console.error('Unable to load saved subjects.', error)
  }
  return ['Biology', 'Statistics', 'Literature', 'Computer Science']
}

function readTheme(userId: string) {
  try {
    return readUserStorage(userId, scopedStorageKey('theme', 1, userId), [THEME_KEY]) === 'dark' ? 'dark' : 'light'
  } catch (error) {
    console.error('Unable to load the saved theme.', error)
    return 'light'
  }
}

function App() {
  const [user, setUser] = useState<AuthUser | null>(getActiveSession)
  function logOut() {
    try {
      endSession()
      setUser(null)
      return true
    } catch (error) {
      console.error('Unable to end the local demo session.', error)
      return false
    }
  }

  if (!user) return <AuthScreen onAuthenticated={setUser} />
  return <DashboardApp key={user.id} user={user} onLogout={logOut} />
}

function DashboardApp({ user, onLogout }: { user: AuthUser; onLogout: () => boolean }) {
  const { tasks, addTask, updateTask, deleteTask, toggleTask, restoreTasks } = useTasks(user.id)
  const { exams, addExam, updateExam, deleteExam } = useExams(user.id)
  const [page, setPage] = useState<Page>('Dashboard')
  const [filter, setFilter] = useState<StatusFilter>('All tasks')
  const [priorityFilter, setPriorityFilter] = useState('Any priority')
  const [subjectFilter, setSubjectFilter] = useState('Any subject')
  const [tagFilter, setTagFilter] = useState('Any tag')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [taskView, setTaskView] = useState<TaskView>('List')
  const [taskSort, setTaskSort] = useState<TaskSort>('deadline')
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([])
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [undoTasks, setUndoTasks] = useState<Task[]>([])
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [taskInitialDueDate, setTaskInitialDueDate] = useState('')
  const [examDialogOpen, setExamDialogOpen] = useState(false)
  const [editingExam, setEditingExam] = useState<Exam | null>(null)
  const [examInitialDate, setExamInitialDate] = useState('')
  const [revisionMinutes, setRevisionMinutes] = useState(45)
  const [subjects, setSubjects] = useState<string[]>(() => readSubjects(user.id))
  const [subjectInput, setSubjectInput] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [theme, setTheme] = useState(() => readTheme(user.id))
  const [focusSeconds, setFocusSeconds] = useState(25 * 60)
  const [timerActive, setTimerActive] = useState(false)
  const [timerMode, setTimerMode] = useState<'Focus' | 'Break'>('Focus')
  const [toast, setToast] = useState('')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(scopedStorageKey('theme', 1, user.id), theme)
    } catch (error) {
      console.error('Unable to save the selected theme.', error)
    }
  }, [theme, user.id])

  useEffect(() => {
    try {
      localStorage.setItem(scopedStorageKey('subjects', 1, user.id), JSON.stringify(subjects))
    } catch (error) {
      console.error('Unable to save subjects.', error)
    }
  }, [subjects, user.id])

  useEffect(() => {
    if (!timerActive) return
    const interval = window.setInterval(() => {
      setFocusSeconds((seconds) => {
        if (seconds <= 1) {
          window.clearInterval(interval)
          setTimerActive(false)
          setToast(`${timerMode} session complete. Nice work!`)
          return 0
        }
        return seconds - 1
      })
    }, 1000)
    return () => window.clearInterval(interval)
  }, [timerActive, timerMode])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(''), 3200)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const today = dayKey(new Date())
  const openTasks = tasks.filter((task) => task.status !== 'Done')
  const completedTasks = tasks.filter((task) => task.status === 'Done')
  const dueToday = openTasks.filter((task) => task.dueDate === today)
  const overdueTasks = openTasks.filter((task) => task.dueDate && task.dueDate < today)
  const completion = tasks.length ? Math.round(completedTasks.length / tasks.length * 100) : 0
  const completedToday = completedTasks.filter((task) => task.completedAt && dayKey(new Date(task.completedAt)) === today)
  const weekStart = getWeekStart()
  const weekStartKey = dayKey(weekStart)
  const weeklyCompletions = completedTasks.filter((task) => task.completedAt && dayKey(new Date(task.completedAt)) >= weekStartKey)
  const weeklyGoal = 15
  const weeklyScore = Math.min(100, Math.round(weeklyCompletions.length / weeklyGoal * 100))
  const dailyGoalProgress = Math.min(100, Math.round(completedToday.length / 3 * 100))
  const { currentStreak, longestStreak } = calculateCompletionStreaks(tasks)
  const recentCompleted = completedTasks
    .filter((task) => task.completedAt)
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
    .slice(0, 4)
  const todaySchedule = tasks.filter((task) => task.dueDate === today).sort((a, b) => Number(a.status === 'Done') - Number(b.status === 'Done'))
  const upcomingExams = [...exams].filter((exam) => daysUntil(exam.date) >= 0).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3)
  const nextDeadlines = [...openTasks]
    .filter((task) => task.dueDate && task.dueDate >= today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 4)
  const filteredTasks = useMemo(() => tasks
    .filter((task) => filter === 'All tasks' || task.status === filter)
    .filter((task) => priorityFilter === 'Any priority' || task.priority === priorityFilter)
    .filter((task) => subjectFilter === 'Any subject' || task.course.toLowerCase() === subjectFilter.toLowerCase())
    .filter((task) => !dateFrom || Boolean(task.dueDate && task.dueDate >= dateFrom))
    .filter((task) => !dateTo || Boolean(task.dueDate && task.dueDate <= dateTo))
    .filter((task) => tagFilter === 'Any tag' || task.tags?.includes(tagFilter))
    .filter((task) => `${task.title} ${task.description ?? ''} ${task.course} ${task.notes} ${(task.tags ?? []).join(' ')}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (taskSort === 'priority') return ({ High: 0, Medium: 1, Low: 2 }[a.priority] - { High: 0, Medium: 1, Low: 2 }[b.priority]) || (a.dueDate || '9999').localeCompare(b.dueDate || '9999')
      if (taskSort === 'created') return (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
      if (taskSort === 'duration') return (b.estimatedMinutes ?? 0) - (a.estimatedMinutes ?? 0)
      return (a.dueDate || '9999').localeCompare(b.dueDate || '9999')
    }), [tasks, filter, priorityFilter, subjectFilter, tagFilter, dateFrom, dateTo, search, taskSort])
  const subjectCounts = subjects.map((name) => ({
    name,
    count: tasks.filter((task) => task.course.toLowerCase() === name.toLowerCase()).length,
    done: tasks.filter((task) => task.course.toLowerCase() === name.toLowerCase() && task.status === 'Done').length,
  }))

  function openNewTask(dueDate = '') {
    setEditingTask(null)
    setTaskInitialDueDate(dueDate)
    setDialogOpen(true)
  }

  function handleDeleteTask(task: Task) {
    setUndoTasks([task])
    deleteTask(task.id)
    setToast(`“${task.title}” deleted.`)
  }

  function undoTaskDeletion() {
    restoreTasks(undoTasks)
    setUndoTasks([])
    setToast('Task restored.')
  }

  function bulkCompleteTasks() {
    tasks.filter((task) => selectedTaskIds.includes(task.id) && task.status !== 'Done').forEach((task) => toggleTask(task.id))
    setSelectedTaskIds([])
    setToast('Selected tasks marked complete.')
  }

  function bulkDeleteTasks() {
    const selected = tasks.filter((task) => selectedTaskIds.includes(task.id))
    if (!selected.length) return
    if (!window.confirm(`Delete ${selected.length} selected ${selected.length === 1 ? 'task' : 'tasks'}?`)) return
    setUndoTasks(selected)
    selected.forEach((task) => deleteTask(task.id))
    setSelectedTaskIds([])
    setToast(`${selected.length} tasks deleted.`)
  }

  function duplicateTask(task: Task) {
    addTask({
      ...task,
      title: `${task.title} (copy)`,
      status: 'To do',
      completedAt: undefined,
      subtasks: task.subtasks?.map((subtask) => ({ ...subtask, id: crypto.randomUUID(), done: false })),
      dependsOn: [],
    })
    setToast('Task duplicated.')
  }

  function updateSubtask(task: Task, subtaskId: string) {
    updateTask({ ...task, subtasks: task.subtasks?.map((subtask) => subtask.id === subtaskId ? { ...subtask, done: !subtask.done } : subtask) })
  }

  function setTaskSelected(taskId: string, selected: boolean) {
    setSelectedTaskIds((current) => selected
      ? current.includes(taskId) ? current : [...current, taskId]
      : current.filter((id) => id !== taskId))
  }

  function taskIsBlocked(task: Task) {
    return (task.dependsOn ?? []).some((id) => tasks.some((candidate) => candidate.id === id && candidate.status !== 'Done'))
  }

  function renderTask(task: Task, selectable = false, draggable = false) {
    return <TaskRow
      key={task.id}
      task={task}
      blocked={taskIsBlocked(task)}
      selectable={selectable}
      selected={selectedTaskIds.includes(task.id)}
      onSelect={() => setTaskSelected(task.id, !selectedTaskIds.includes(task.id))}
      onToggle={() => toggleTask(task.id)}
      onEdit={() => { setEditingTask(task); setDialogOpen(true) }}
      onDelete={() => handleDeleteTask(task)}
      onDuplicate={() => duplicateTask(task)}
      onToggleSubtask={(subtaskId) => updateSubtask(task, subtaskId)}
      onDragStart={draggable ? () => setDraggedTaskId(task.id) : undefined}
      onDrop={draggable ? () => handleDropTask(task.status) : undefined}
    />
  }

  function handleDropTask(status: Task['status']) {
    if (!draggedTaskId) return
    const task = tasks.find((item) => item.id === draggedTaskId)
    if (task && task.status !== status) updateTask({ ...task, status })
    setDraggedTaskId(null)
  }

  function changePage(nextPage: Page) {
    setPage(nextPage)
    if (nextPage === 'Tasks') setFilter('All tasks')
  }

  function openExamDialog(exam: Exam | null = null) {
    setEditingExam(exam)
    setExamInitialDate('')
    setExamDialogOpen(true)
  }

  function openExamForDate(date: string) {
    setEditingExam(null)
    setExamInitialDate(date)
    setExamDialogOpen(true)
  }

  function closeExamDialog() {
    setExamDialogOpen(false)
    setEditingExam(null)
    setExamInitialDate('')
  }

  function saveExam(values: Omit<Exam, 'id' | 'createdAt'>) {
    if (editingExam) updateExam({ ...editingExam, ...values })
    else addExam(values)
    closeExamDialog()
  }

  function createRevisionPlan(exam: Exam) {
    const daysRemaining = daysUntil(exam.date)
    if (daysRemaining <= 0) {
      setToast('Revision plans can only be generated for an upcoming exam.')
      return
    }
    const existingPlans = tasks.filter((task) => task.tags?.includes(`exam-revision:${exam.id}`))
    if (existingPlans.length && !window.confirm(`Replace the ${existingPlans.length} existing revision tasks for ${exam.title}?`)) return

    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const topics = exam.syllabus.split(/[,;\n]+/).map((topic) => topic.trim().replace(/^and\s+/i, '')).filter(Boolean)
    const sessionCount = Math.min(daysRemaining, Math.max(topics.length, 1))
    const scheduledTasks: Omit<Task, 'id'>[] = Array.from({ length: sessionCount }, (_, index) => {
      const dayOffset = Math.floor((index + 1) * daysRemaining / (sessionCount + 1))
      const dueDate = new Date(start)
      dueDate.setDate(start.getDate() + dayOffset)
      const topic = topics[index] ?? `Review ${exam.subject} and practice key questions`
      return {
        title: `Revise ${exam.subject}: ${topic}`,
        course: exam.subject,
        dueDate: dayKey(dueDate),
        priority: daysRemaining <= 3 ? 'High' : 'Medium',
        status: 'To do',
        notes: `Preparation for ${exam.title}.`,
        estimatedMinutes: revisionMinutes,
        tags: ['revision', `exam-revision:${exam.id}`],
      }
    })
    existingPlans.forEach((task) => deleteTask(task.id))
    scheduledTasks.forEach((task) => addTask(task))
    setToast(`${scheduledTasks.length} revision sessions planned before ${exam.title}.`)
  }

  function addSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = subjectInput.trim()
    if (!name) return
    if (subjects.some((subject) => subject.toLowerCase() === name.toLowerCase())) {
      setToast('That subject already exists.')
      return
    }
    setSubjects((current) => [...current, name])
    setSubjectInput('')
    setToast(`${name} added to your subjects.`)
  }

  function removeSubject(name: string) {
    const inUse = tasks.some((task) => task.course.toLowerCase() === name.toLowerCase())
    if (inUse) {
      setToast('This subject is used by a task. Edit those tasks before removing it.')
      return
    }
    setSubjects((current) => current.filter((subject) => subject !== name))
  }

  function startTimer() {
    if (focusSeconds === 0) setFocusSeconds(timerMode === 'Focus' ? 25 * 60 : 5 * 60)
    setTimerActive(true)
  }

  function setMode(mode: 'Focus' | 'Break') {
    setTimerMode(mode)
    setTimerActive(false)
    setFocusSeconds(mode === 'Focus' ? 25 * 60 : 5 * 60)
  }

  const pageTitle = page === 'Dashboard' ? 'Overview' : page
  const formattedTime = `${String(Math.floor(focusSeconds / 60)).padStart(2, '0')}:${String(focusSeconds % 60).padStart(2, '0')}`
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'
  const weekdayLabel = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date()).toUpperCase()
  const displayName = user?.name.trim() || 'Student'
  const initials = displayName.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('')

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className="sidebar">
        <button className="brand" onClick={() => changePage('Dashboard')} type="button" aria-label="TaskFlow Pro home">
          <span className="brand-mark"><CheckCheck size={18} /></span>
          <span>taskflow<span className="brand-pro">.pro</span></span>
        </button>

        <p className="workspace-label">YOUR WORKSPACE</p>
        <button className="workspace-switch" onClick={() => changePage('Subjects')} type="button">
          <span className="workspace-avatar"><BookOpen size={16} /></span>
          <span><strong>My studies</strong><small>{subjects.length} subjects</small></span>
          <ChevronDown className="workspace-chevron" size={15} />
        </button>

        <p className="nav-label">MENU</p>
        <nav className="side-nav" aria-label="Main navigation">
          {([
            ['Dashboard', LayoutDashboard],
            ['Tasks', ListTodo],
            ['Calendar', CalendarDays],
            ['Subjects', BookOpen],
            ['Exams', AlarmClock],
            ['Focus', Clock3],
            ['Settings', Settings2],
          ] as const).map(([label, Icon]) => (
            <button className={`nav-item ${page === label ? 'active' : ''}`} key={label} onClick={() => changePage(label)} type="button" title={label}>
              <Icon size={17} /><span>{label}</span>
              {label === 'Tasks' && <span aria-hidden="true" className="nav-count">{openTasks.length}</span>}
              {label === 'Subjects' && <span aria-hidden="true" className="nav-count">{subjects.length}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <span className="help-icon"><Sparkles size={16} /></span>
            <strong>Small steps, big progress</strong>
            <p>You’ve completed {completedTasks.length} {completedTasks.length === 1 ? 'task' : 'tasks'} so far. Keep your momentum going!</p>
            <div className="help-progress"><span style={{ width: `${completion}%` }} /></div>
            <small>{completion}% of your tasks complete</small>
          </div>
          <button className="nav-item help-link" onClick={() => setToast('Tip: break big assignments into smaller tasks to stay on track.')} type="button"><CircleHelp size={16} /><span>Help & tips</span></button>
          <div className="profile">
            <span className="profile-avatar">{initials}</span>
            <span><strong>{displayName}</strong><small>{user.email}</small></span>
            <button aria-label="Log out" className="profile-logout" onClick={() => { if (!onLogout()) setToast('We couldn’t clear the demo session. Please try again.') }} title="Log out" type="button"><LogOut size={15} /></button>
            <button aria-label="Collapse sidebar" className="profile-menu" onClick={() => setSidebarCollapsed((value) => !value)} type="button"><ChevronLeft size={16} /></button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><span>›</span><strong>{pageTitle}</strong></div>
          <div className="topbar-right">
            <span className="today-chip"><CalendarDays size={14} />{new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date())}</span>
            <button className="icon-button top-action" aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'} onClick={() => setTheme((value) => value === 'light' ? 'dark' : 'light')} type="button">
              {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
            </button>
            <button className="icon-button top-action notification-button" aria-label="Show upcoming deadlines" onClick={() => { changePage('Dashboard'); setToast(`${nextDeadlines.length} upcoming ${nextDeadlines.length === 1 ? 'deadline' : 'deadlines'}`) }} type="button">
              <Bell size={17} />{dueToday.length > 0 && <i />}
            </button>
            <button aria-label="Log out" className="icon-button top-action logout-action" onClick={() => { if (!onLogout()) setToast('We couldn’t clear the demo session. Please try again.') }} title="Log out" type="button"><LogOut size={16} /></button>
            <span className="top-avatar" title={user.email}>{initials}</span>
          </div>
        </header>

        <div className="page-content">
          {page === 'Calendar' && (
            <CalendarView
              exams={exams}
              onAddExam={openExamForDate}
              onAddTask={openNewTask}
              onExamClick={openExamDialog}
              onTaskClick={(task) => { setEditingTask(task); setTaskInitialDueDate(''); setDialogOpen(true) }}
              tasks={tasks}
            />
          )}

          {page === 'Dashboard' && (
            <>
              <section className="welcome-row">
                <div>
                  <p className="eyebrow">{weekdayLabel} · YOUR PROGRESS IS LOOKING GOOD</p>
                  <h1>{greeting}, {displayName.split(/\s+/)[0]} <span className="wave">✦</span></h1>
                  <p className="welcome-copy">Here’s what’s happening with your studies today.</p>
                </div>
                <button className="button button-primary add-task-button" onClick={() => openNewTask()} type="button"><Plus size={15} />Add new task</button>
              </section>

              <section className="summary-grid" aria-label="Task statistics">
                <article className="summary-card">
                <div className="summary-top"><span className="summary-icon icon-purple"><ListTodo size={16} /></span><span className="summary-caption">TOTAL TASKS</span></div>
                <strong className="summary-value">{tasks.length}</strong>
                <p>Across all your subjects</p>
                <div className="summary-foot">{subjects.length} active subjects</div>
                </article>
                <article className="summary-card">
                <div className="summary-top"><span className="summary-icon icon-green"><Check size={17} /></span><span className="summary-caption">COMPLETED</span></div>
                <strong className="summary-value">{completedTasks.length}</strong>
                <p>Tasks you’ve checked off</p>
                <div className="summary-foot"><span className="foot-dot green-dot" />{completedToday.length} completed today</div>
                </article>
                <article className="summary-card">
                <div className="summary-top"><span className="summary-icon icon-orange"><ListTodo size={16} /></span><span className="summary-caption">PENDING</span></div>
                <strong className="summary-value">{openTasks.length}</strong>
                <p>Still in progress or to do</p>
                <div className="summary-foot">{dueToday.length} due today</div>
                </article>
                <article className="summary-card">
                <div className="summary-top"><span className="summary-icon icon-red"><AlarmClock size={16} /></span><span className="summary-caption">OVERDUE</span></div>
                <strong className="summary-value">{overdueTasks.length}</strong>
                <p>{overdueTasks.length ? 'Ready for a fresh plan?' : 'Nothing past its deadline'}</p>
                <div className="summary-foot">{overdueTasks.length ? 'Review your overdue tasks' : 'You’re right on track'}</div>
                </article>
                <article className="summary-card">
                <div className="summary-top"><span className="summary-icon icon-blue"><TrendingUp size={16} /></span><span className="summary-caption">COMPLETION</span></div>
                <strong className="summary-value">{completion}<span>%</span></strong>
                <p>Of all your tasks completed</p>
                <div className="summary-foot"><span className="mini-progress"><i style={{ width: `${completion}%` }} /></span>{completedTasks.length} of {tasks.length}</div>
                </article>
              </section>

              <section className="dashboard-insights" aria-label="Your productivity">
                <article className="insight-card daily-goal-card">
                <div className="insight-copy"><span className="insight-icon"><Flame size={16} /></span><div><p className="insight-label">DAILY TASK GOAL</p><strong>{completedToday.length} <span>/ 3 tasks</span></strong><small>{completedToday.length >= 3 ? 'Goal reached — lovely work!' : `${3 - completedToday.length} more to reach today’s goal`}</small></div></div>
                <div className="goal-ring" style={{ background: `conic-gradient(#6b6ce8 ${dailyGoalProgress}%, #ececf5 0)` }}><div><strong>{dailyGoalProgress}%</strong><span>today</span></div></div>
                </article>
                <article className="insight-card weekly-score-card">
                <div className="insight-copy"><span className="insight-icon"><TrendingUp size={16} /></span><div><p className="insight-label">WEEKLY PRODUCTIVITY</p><strong>{weeklyScore}<span>%</span></strong><small>{weeklyCompletions.length} of {weeklyGoal} weekly goal tasks completed</small></div></div>
                <div className="weekly-progress"><span style={{ width: `${weeklyScore}%` }} /></div>
                </article>
                <article className="insight-card streak-card">
                <span className="insight-icon"><Award size={16} /></span><div className="streak-values"><div><p className="insight-label">CURRENT STREAK</p><strong>{currentStreak} <span>{currentStreak === 1 ? 'day' : 'days'}</span></strong></div><div><p className="insight-label">LONGEST</p><strong>{longestStreak} <span>{longestStreak === 1 ? 'day' : 'days'}</span></strong></div></div><small>Keep checking off tasks to build your streak.</small>
                </article>
              </section>

              <section className="quick-actions" aria-label="Quick actions">
                <span className="quick-actions-label">QUICK ACTIONS</span>
                <button onClick={() => openNewTask()} type="button"><Plus size={14} />Add a task</button>
                <button onClick={() => changePage('Subjects')} type="button"><BookOpen size={14} />Add a subject</button>
                <button onClick={() => openExamDialog()} type="button"><AlarmClock size={14} />Add an exam</button>
                <button onClick={() => changePage('Focus')} type="button"><Clock3 size={14} />Start a study session</button>
              </section>

              <section className="content-grid">
                <div className="tasks-panel">
                  <div className="section-heading">
                    <div><h2>My tasks</h2><p>A little progress every day adds up.</p></div>
                    <button className="button button-secondary compact-add" onClick={() => openNewTask()} type="button"><Plus size={13} />New task</button>
                  </div>
                  <div className="task-toolbar">
                    <div className="filter-tabs" role="tablist" aria-label="Filter tasks">
                      {statusFilters.map((item) => (
                        <button aria-label={item} aria-selected={filter === item} className={`filter-tab ${filter === item ? 'selected' : ''}`} key={item} onClick={() => setFilter(item)} role="tab" type="button">
                          {item}<span className="tab-count">{item === 'All tasks' ? tasks.length : tasks.filter((task) => task.status === item).length}</span>
                        </button>
                      ))}
                    </div>
                    <label className="search-box"><Search size={14} /><input aria-label="Search tasks" onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks..." value={search} />{search && <button aria-label="Clear search" onClick={() => setSearch('')} type="button"><X size={13} /></button>}</label>
                  </div>
                  <div className="task-filters">
                    <span><ArrowDownWideNarrow size={13} /> Filter by priority</span>
                    <select aria-label="Filter by priority" onChange={(event) => setPriorityFilter(event.target.value)} value={priorityFilter}>
                      <option>Any priority</option><option>High</option><option>Medium</option><option>Low</option>
                    </select>
                  </div>
                  <div className="task-list">
                    {filteredTasks.length ? filteredTasks.slice(0, 6).map((task) => (
                      renderTask(task)
                    )) : (
                      <div className="empty-state"><span className="empty-icon"><ListTodo size={20} /></span><h3>{search || priorityFilter !== 'Any priority' ? 'No matching tasks' : 'Nothing on your list yet'}</h3><p>{search || priorityFilter !== 'Any priority' ? 'Try changing your search or filters.' : 'Add your first task and make today count.'}</p><button className="button button-primary" onClick={() => openNewTask()} type="button"><Plus size={14} />Create a task</button></div>
                    )}
                  </div>
                  {filteredTasks.length > 6 && <div className="list-footer"><span>Showing 6 of {filteredTasks.length} tasks</span><button onClick={() => changePage('Tasks')} type="button">View all tasks <ChevronRight size={12} /></button></div>}
                  {completedTasks.length > 0 && <div className="list-footer"><span>{completedTasks.length} completed</span><button onClick={() => { if (!window.confirm(`Delete all ${completedTasks.length} completed tasks?`)) return; setUndoTasks(completedTasks); completedTasks.forEach((task) => deleteTask(task.id)); setToast(`${completedTasks.length} completed tasks deleted.`) }} type="button">Clear completed</button></div>}
                </div>

                <aside className="right-column">
                  <section className="today-panel">
                    <div className="widget-heading"><div><h3>Today’s schedule</h3><p>{todaySchedule.length ? `${todaySchedule.length} task${todaySchedule.length === 1 ? '' : 's'} due today` : 'Your day at a glance'}</p></div><span className="today-count">{todaySchedule.length}</span></div>
                    {todaySchedule.length ? <div className="deadline-list">{todaySchedule.map((task) => <div className="schedule-item" key={task.id}><button aria-label={task.status === 'Done' ? `Mark ${task.title} as not done` : `Complete ${task.title}`} className={`schedule-check ${task.status === 'Done' ? 'schedule-done' : ''}`} onClick={() => toggleTask(task.id)} type="button">{task.status === 'Done' && <Check size={11} />}</button><button className={`schedule-task ${task.status === 'Done' ? 'schedule-task-done' : ''}`} onClick={() => { setEditingTask(task); setDialogOpen(true) }} type="button"><strong>{task.title}</strong><small>{task.course || 'Personal'} · {task.priority} priority</small></button></div>)}</div> : <div className="schedule-empty"><span className="empty-icon"><CalendarDays size={17} /></span><p>No tasks due today. Add a task or take a well-earned breather.</p><button onClick={() => openNewTask()} type="button">Plan your day <ChevronRight size={12} /></button></div>}
                  </section>
                  <section className="progress-panel">
                    <div className="widget-heading"><div><h3>Task overview</h3><p>Your workload at a glance</p></div><MoreHorizontal className="widget-menu" size={18} /></div>
                    <Suspense fallback={<div className="chart-loading">Loading chart…</div>}><ProgressChart tasks={tasks} completion={completion} /></Suspense>
                  </section>
                  <section className="progress-panel subject-workload-panel">
                    <div className="widget-heading"><div><h3>By subject</h3><p>Tasks across your classes</p></div><BookOpen size={16} className="widget-menu" /></div>
                    <Suspense fallback={<div className="chart-loading">Loading chart…</div>}><SubjectChart subjects={subjectCounts} /></Suspense>
                  </section>
                  <section className="today-panel">
                    <div className="widget-heading"><div><h3>Coming up</h3><p>Your next deadlines</p></div><span className="today-count">{nextDeadlines.length}</span></div>
                    {nextDeadlines.length ? <div className="deadline-list">{nextDeadlines.map((task) => (
                      <button className="deadline-item" key={task.id} onClick={() => { setEditingTask(task); setDialogOpen(true) }} type="button">
                        <span className={`deadline-marker priority-border-${task.priority.toLowerCase()}`} />
                        <span className="deadline-copy"><strong>{task.title}</strong><small>{task.course || 'Personal'}</small></span>
                        <time>{task.dueDate === today ? 'Today' : new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(`${task.dueDate}T00:00:00`))}</time>
                      </button>
                    ))}</div> : <p className="nothing-today">No upcoming deadlines. Enjoy the breathing room!</p>}
                    <button className="text-link" onClick={() => changePage('Tasks')} type="button">See all tasks <ChevronRight size={13} /></button>
                  </section>
                  <section className="today-panel exam-widget">
                    <div className="widget-heading"><div><h3>Upcoming exams</h3><p>Prepare a little every day</p></div><button aria-label="Add an exam" className="icon-button" onClick={() => openExamDialog()} type="button"><Plus size={15} /></button></div>
                    {upcomingExams.length ? <div className="deadline-list">{upcomingExams.map((exam) => {
                      const remaining = daysUntil(exam.date)
                      return <div className="exam-countdown" key={exam.id}><span className="exam-icon"><AlarmClock size={15} /></span><span className="deadline-copy"><strong>{exam.title}</strong><small>{exam.subject}{exam.targetMarks !== null ? ` · Target ${exam.targetMarks}%` : ''}</small></span><span className="countdown-days"><strong>{remaining}</strong><small>{remaining === 1 ? 'day' : 'days'}</small></span></div>
                    })}</div> : <div className="schedule-empty"><p>No exams planned yet.</p><button onClick={() => openExamDialog()} type="button">Add your first exam <ChevronRight size={12} /></button></div>}
                    <button className="text-link" onClick={() => changePage('Exams')} type="button">View exam planner <ChevronRight size={13} /></button>
                  </section>
                </aside>
              </section>

              <section className="recent-panel today-panel">
                <div className="widget-heading"><div><h3>Recently completed</h3><p>Small wins worth celebrating</p></div><span className="today-count"><Check size={13} /></span></div>
                {recentCompleted.length ? <div className="recent-list">{recentCompleted.map((task) => <div className="recent-item" key={task.id}><span className="done-check"><Check size={12} /></span><span className="deadline-copy"><strong>{task.title}</strong><small>{task.course || 'Personal'}</small></span><time>{task.completedAt ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(task.completedAt)) : ''}</time></div>)}</div> : <div className="schedule-empty"><p>Your completed tasks will show up here.</p></div>}
              </section>
            </>
          )}

          {page === 'Tasks' && (
            <>
              <section className="welcome-row page-welcome"><div><p className="eyebrow">STAY ON TOP OF IT</p><h1>All your tasks</h1><p className="welcome-copy">Search, filter, and keep every assignment moving.</p></div><button className="button button-primary add-task-button" onClick={() => openNewTask()} type="button"><Plus size={15} />Add new task</button></section>
              <div className="task-page-stats"><span><ListTodo size={15} />{openTasks.length} open</span><span><Check size={15} />{completedTasks.length} completed</span><span><CalendarDays size={15} />{dueToday.length} due today</span></div>
              <div className="tasks-panel all-tasks-panel">
                <div className="task-toolbar">
                  <div className="filter-tabs" role="tablist" aria-label="Filter tasks">{statusFilters.map((item) => <button aria-label={item} aria-selected={filter === item} className={`filter-tab ${filter === item ? 'selected' : ''}`} key={item} onClick={() => setFilter(item)} role="tab" type="button">{item}<span aria-hidden="true" className="tab-count">{item === 'All tasks' ? tasks.length : tasks.filter((task) => task.status === item).length}</span></button>)}</div>
                  <label className="search-box"><Search size={14} /><input aria-label="Search tasks" onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks..." value={search} />{search && <button aria-label="Clear search" onClick={() => setSearch('')} type="button"><X size={13} /></button>}</label>
                </div>
                <div className="task-filters task-filter-advanced">
                  <label><ArrowDownWideNarrow size={13} /><select aria-label="Filter by priority" onChange={(event) => setPriorityFilter(event.target.value)} value={priorityFilter}><option>Any priority</option><option>High</option><option>Medium</option><option>Low</option></select></label>
                  <label><BookOpen size={13} /><select aria-label="Filter by subject" onChange={(event) => setSubjectFilter(event.target.value)} value={subjectFilter}><option>Any subject</option>{subjects.map((subject) => <option key={subject}>{subject}</option>)}</select></label>
                  <label><Tag size={13} /><select aria-label="Filter by tag" onChange={(event) => setTagFilter(event.target.value)} value={tagFilter}><option>Any tag</option>{[...new Set(tasks.flatMap((task) => task.tags ?? []))].sort().map((tag) => <option key={tag}>{tag}</option>)}</select></label>
                  <label className="date-filter-label">Deadline <input aria-label="Deadline from" onChange={(event) => setDateFrom(event.target.value)} type="date" value={dateFrom} /><span>to</span><input aria-label="Deadline to" onChange={(event) => setDateTo(event.target.value)} type="date" value={dateTo} /></label>
                  <label className="task-sort-label">Sort <select aria-label="Sort tasks" onChange={(event) => setTaskSort(event.target.value as TaskSort)} value={taskSort}><option value="deadline">Deadline</option><option value="priority">Priority</option><option value="created">Recently created</option><option value="duration">Estimated duration</option></select></label>
                  <div className="task-view-switch" aria-label="Task view">
                    <button aria-label="List view" aria-pressed={taskView === 'List'} onClick={() => setTaskView('List')} type="button"><List size={15} /></button>
                    <button aria-label="Grid view" aria-pressed={taskView === 'Grid'} onClick={() => setTaskView('Grid')} type="button"><LayoutGrid size={15} /></button>
                    <button aria-label="Kanban view" aria-pressed={taskView === 'Kanban'} onClick={() => setTaskView('Kanban')} type="button"><KanbanSquare size={15} /></button>
                  </div>
                </div>
                {selectedTaskIds.length > 0 && <div className="bulk-toolbar"><label><input checked={selectedTaskIds.length === filteredTasks.length} onChange={(event) => setSelectedTaskIds(event.target.checked ? filteredTasks.map((task) => task.id) : [])} type="checkbox" />{selectedTaskIds.length} selected</label><button onClick={bulkCompleteTasks} type="button"><Check size={14} />Complete selected</button><button className="bulk-delete" onClick={bulkDeleteTasks} type="button"><X size={14} />Delete selected</button></div>}
                {!selectedTaskIds.length && filteredTasks.length > 0 && <div className="bulk-select-row"><label><input checked={filteredTasks.length > 0 && filteredTasks.every((task) => selectedTaskIds.includes(task.id))} onChange={(event) => setSelectedTaskIds(event.target.checked ? filteredTasks.map((task) => task.id) : [])} type="checkbox" />Select tasks</label><span>{filteredTasks.length} results</span></div>}
                {!filteredTasks.length ? <div className="empty-state"><span className="empty-icon"><ListTodo size={20} /></span><h3>No tasks found</h3><p>Try changing your search or filters, or add a task.</p><button className="button button-primary" onClick={() => openNewTask()} type="button"><Plus size={14} />Create a task</button></div> :
                  taskView === 'Kanban' ? <div className="kanban-board">{(['To do', 'In progress', 'Done'] as const).map((status) => {
                    const columnTasks = filteredTasks.filter((task) => task.status === status)
                    return <section className="kanban-column" key={status} onDragOver={(event) => event.preventDefault()} onDrop={() => handleDropTask(status)}><header><strong>{status}</strong><span>{columnTasks.length}</span></header><div className="kanban-cards">{columnTasks.map((task) => renderTask(task, true, true))}{!columnTasks.length && <p className="kanban-empty">Drop a task here</p>}</div></section>
                  })}</div> :
                  <div className={taskView === 'Grid' ? 'task-board-grid' : 'task-list'}>{filteredTasks.map((task) => renderTask(task, true))}</div>}
              </div>
            </>
          )}

          {page === 'Subjects' && (
            <>
              <section className="welcome-row page-welcome"><div><p className="eyebrow">ORGANIZE YOUR CLASSES</p><h1>Your subjects</h1><p className="welcome-copy">Keep assignments grouped by the classes you’re taking.</p></div></section>
              <form className="subject-add-form" onSubmit={addSubject}><BookOpen size={17} /><input aria-label="New subject name" maxLength={40} onChange={(event) => setSubjectInput(event.target.value)} placeholder="Add a subject, e.g. Chemistry" value={subjectInput} /><button className="button button-primary" type="submit"><Plus size={14} />Add subject</button></form>
              <div className="subject-grid">{subjectCounts.map((subject, index) => <article className="subject-card" key={subject.name}><div className={`subject-icon subject-icon-${index % 4}`}><BookOpen size={19} /></div><button aria-label={`Remove ${subject.name}`} className="icon-button subject-remove" onClick={() => removeSubject(subject.name)} type="button"><X size={15} /></button><h2>{subject.name}</h2><p>{subject.count} {subject.count === 1 ? 'task' : 'tasks'} · {subject.done} completed</p><div className="subject-progress"><span style={{ width: `${subject.count ? Math.round(subject.done / subject.count * 100) : 0}%` }} /></div><small>{subject.count ? `${Math.round(subject.done / subject.count * 100)}% complete` : 'No tasks yet'}</small><button className="subject-open" onClick={() => { setSearch(subject.name); setFilter('All tasks'); changePage('Tasks') }} type="button">View subject tasks <ChevronRight size={13} /></button></article>)}</div>
              {!subjects.length && <div className="empty-state subject-empty"><span className="empty-icon"><BookOpen size={20} /></span><h3>No subjects yet</h3><p>Add a subject to start organizing your classes.</p></div>}
            </>
          )}

          {page === 'Exams' && (
            <>
              <section className="welcome-row page-welcome"><div><p className="eyebrow">A PLAN FOR EXAM DAY</p><h1>Your exam planner</h1><p className="welcome-copy">Keep upcoming exams in view and give yourself time to prepare.</p></div><button className="button button-primary add-task-button" onClick={() => openExamDialog()} type="button"><Plus size={15} />Add exam</button></section>
              <section className="revision-planner">
                <div><span className="revision-planner-icon"><Sparkles size={16} /></span><div><strong>Build a revision schedule</strong><small>Turn exam syllabus topics into dated tasks on your calendar.</small></div></div>
                <label>Study time per session <span><input aria-label="Available study minutes per revision session" max="240" min="15" onChange={(event) => setRevisionMinutes(Math.min(240, Math.max(15, Number(event.target.value) || 45)))} step="5" type="number" value={revisionMinutes} /> min</span></label>
              </section>
              <section className="exam-grid">{[...exams].sort((a, b) => a.date.localeCompare(b.date)).map((exam) => {
                const remaining = daysUntil(exam.date)
                return <article className="exam-card" key={exam.id}><div className="exam-card-top"><span className="exam-icon"><AlarmClock size={17} /></span><div><button aria-label={`Edit ${exam.title}`} className="icon-button" onClick={() => openExamDialog(exam)} type="button"><Pencil size={14} /></button><button aria-label={`Remove ${exam.title}`} className="icon-button delete-button" onClick={() => deleteExam(exam.id)} type="button"><X size={15} /></button></div></div><p className="exam-subject">{exam.subject}</p><h2>{exam.title}</h2><div className="exam-date-line"><CalendarDays size={14} />{new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(`${exam.date}T00:00:00`))}</div><div className="exam-card-bottom"><span className="exam-count-badge">{remaining < 0 ? `${Math.abs(remaining)} days past` : remaining === 0 ? 'Today' : `${remaining} days to go`}</span>{exam.targetMarks !== null && <span className="exam-target">Target {exam.targetMarks}%</span>}</div><span className={`exam-preparation preparation-${(exam.preparation ?? 'Not started').toLowerCase().replace(' ', '-')}`}>{exam.preparation ?? 'Not started'}</span>{exam.syllabus && <p className="exam-syllabus">{exam.syllabus}</p>}<button className="revision-plan-button" disabled={remaining <= 0} onClick={() => createRevisionPlan(exam)} type="button"><Sparkles size={13} />{remaining <= 0 ? 'Exam date reached' : 'Generate revision plan'}</button></article>
              })}</section>
              {!exams.length && <div className="empty-state exam-empty"><span className="empty-icon"><AlarmClock size={20} /></span><h3>No exams planned yet</h3><p>Add an exam to see its countdown and keep the syllabus close.</p><button className="button button-primary" onClick={() => openExamDialog()} type="button"><Plus size={14} />Add an exam</button></div>}
            </>
          )}

          {page === 'Focus' && (
            <section className="focus-page">
              <p className="eyebrow">MAKE SPACE FOR DEEP WORK</p><h1>Focus time</h1><p className="welcome-copy">One thing at a time. You’ve got this.</p>
              <div className="focus-card">
                <div className="focus-tabs"><button className={timerMode === 'Focus' ? 'selected' : ''} onClick={() => setMode('Focus')} type="button"><Flame size={15} />Focus · 25 min</button><button className={timerMode === 'Break' ? 'selected' : ''} onClick={() => setMode('Break')} type="button"><Clock3 size={15} />Short break · 5 min</button></div>
                <div className="timer-ring"><div><strong>{formattedTime}</strong><span>{timerActive ? 'Stay in the zone' : timerMode === 'Focus' ? 'Ready when you are' : 'Take a breather'}</span></div></div>
                <div className="focus-actions"><button className="button button-primary focus-start" onClick={() => timerActive ? setTimerActive(false) : startTimer()} type="button">{timerActive ? <><span className="pause-symbol">Ⅱ</span>Pause timer</> : <><Play size={15} fill="currentColor" />{focusSeconds < (timerMode === 'Focus' ? 25 * 60 : 5 * 60) ? 'Resume focus' : 'Start focusing'}</>}</button><button aria-label="Reset timer" className="button button-secondary timer-reset" onClick={() => { setTimerActive(false); setFocusSeconds(timerMode === 'Focus' ? 25 * 60 : 5 * 60) }} type="button"><TimerReset size={15} />Reset</button></div>
                <p className="focus-tip"><Sparkles size={14} />{openTasks.length ? `Try focusing on “${openTasks[0].title}”` : 'Add a task to give your focus session a goal.'}</p>
              </div>
            </section>
          )}

          {page === 'Settings' && (
            <>
              <section className="welcome-row page-welcome"><div><p className="eyebrow">MAKE IT YOURS</p><h1>Settings</h1><p className="welcome-copy">Personalize your TaskFlow workspace.</p></div></section>
              <div className="settings-panel">
                <div className="setting-row"><span className="setting-icon"><Sun size={18} /></span><span><strong>Appearance</strong><small>Choose how TaskFlow looks on this device.</small></span><button className="button button-secondary" onClick={() => setTheme((value) => value === 'light' ? 'dark' : 'light')} type="button">{theme === 'light' ? <><Moon size={14} />Dark mode</> : <><Sun size={14} />Light mode</>}</button></div>
                <div className="setting-row"><span className="setting-icon"><BookOpen size={18} /></span><span><strong>Manage subjects</strong><small>{subjects.length} subjects in your workspace.</small></span><button className="button button-secondary" onClick={() => changePage('Subjects')} type="button">Manage subjects <ChevronRight size={14} /></button></div>
                <div className="setting-row"><span className="setting-icon"><CheckCheck size={18} /></span><span><strong>Your progress</strong><small>{completedTasks.length} of {tasks.length} tasks completed so far.</small></span><strong className="setting-progress">{completion}%</strong></div>
                <div className="setting-row"><span className="setting-icon"><TimerReset size={18} /></span><span><strong>Focus timer</strong><small>25-minute focus sessions with 5-minute breaks.</small></span><button className="button button-secondary" onClick={() => changePage('Focus')} type="button">Open timer <ChevronRight size={14} /></button></div>
              </div>
            </>
          )}
        </div>
      </main>

      {dialogOpen && <TaskDialog initialDueDate={taskInitialDueDate} key={editingTask?.id ?? 'new-task'} task={editingTask} onClose={() => setDialogOpen(false)} onSave={addTask} onUpdate={updateTask} subjects={subjects} tasks={tasks} />}
      {examDialogOpen && <ExamDialog exam={editingExam ?? undefined} initialDate={examInitialDate} subjects={subjects} onClose={closeExamDialog} onSave={saveExam} />}
      {toast && <div className="toast-message" role="status"><Check size={15} />{toast}{undoTasks.length > 0 && <button className="toast-undo" onClick={undoTaskDeletion} type="button"><RotateCcw size={13} />Undo</button>}<button aria-label="Dismiss notification" onClick={() => setToast('')} type="button"><X size={14} /></button></div>}
      <button aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} className="sidebar-toggle" onClick={() => setSidebarCollapsed((value) => !value)} type="button">{sidebarCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}</button>
    </div>
  )
}

export default App
