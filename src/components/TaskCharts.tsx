import { BookOpen, TrendingUp } from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { Task } from '../types'

const colors = ['#6b6ce8', '#f0a75b', '#43aa82']

interface ProgressProps {
  tasks: Task[]
  completion: number
}

interface SubjectSummary {
  name: string
  count: number
  done: number
}

export function ProgressChart({ tasks, completion }: ProgressProps) {
  const chartData = [
    { name: 'In progress', value: tasks.filter((task) => task.status === 'In progress').length, color: colors[0] },
    { name: 'To do', value: tasks.filter((task) => task.status === 'To do').length, color: colors[1] },
    { name: 'Completed', value: tasks.filter((task) => task.status === 'Done').length, color: colors[2] },
  ]

  return (
    <>
      <div className="chart-wrap">
        {chartData.some((item) => item.value > 0) ? (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData.filter((item) => item.value > 0)} dataKey="value" nameKey="name" innerRadius={49} outerRadius={66} paddingAngle={4} stroke="none">
                  {chartData.filter((item) => item.value > 0).map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="chart-center"><strong>{completion}%</strong><span>complete</span></div>
          </>
        ) : <div className="chart-empty"><span className="empty-icon"><TrendingUp size={17} /></span>Add a task to see your progress</div>}
      </div>
      <div className="chart-legend">{chartData.map((item) => <div key={item.name}><i className="legend-dot" style={{ background: item.color }} />{item.name}<strong>{item.value}</strong></div>)}</div>
    </>
  )
}

export function SubjectChart({ subjects }: { subjects: SubjectSummary[] }) {
  const activeSubjects = subjects.filter((subject) => subject.count > 0)
  if (!activeSubjects.length) return <p className="chart-empty subject-chart-empty"><BookOpen size={17} />Add a task to see subject activity</p>

  return (
    <div className="subject-chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={activeSubjects} margin={{ top: 12, right: 4, left: -24, bottom: 0 }}>
          <CartesianGrid stroke="#f0f0f5" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: '#9294a7', fontSize: 8 }} tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tick={{ fill: '#a0a2b2', fontSize: 8 }} tickLine={false} axisLine={false} />
          <Tooltip />
          <Bar dataKey="done" name="Completed" stackId="tasks" fill="#43aa82" radius={[0, 0, 0, 0]} maxBarSize={26} />
          <Bar dataKey={(subject: SubjectSummary) => subject.count - subject.done} name="Open" stackId="tasks" fill="#716de0" radius={[4, 4, 0, 0]} maxBarSize={26} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
