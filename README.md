# TaskFlow Pro

A student productivity dashboard for organizing assignments, deadlines, classes, and study sessions.

## Features

- See data-derived task totals, completion rate, overdue work, study streaks, today's schedule, recent completions, subject progress, and upcoming exam countdowns.
- Create, edit, complete, search, filter, sort, duplicate, and delete tasks; organize them with tags, subtasks, dependencies, recurring schedules, and list, grid, or Kanban views.
- Bulk-select tasks and undo recent deletions.
- Create, edit, and remove exams with dates, syllabus notes, preparation status, and target marks.
- Review task deadlines and exams in monthly, weekly, and daily calendar views, with date navigation and create/edit actions from the calendar.
- Track exam preparation status and generate dated revision tasks from syllabus topics using a configurable session duration.
- Manage subjects and view task progress by class.
- Use the focus and short-break timer.
- Switch between light and dark themes and collapse the sidebar.
- Sign up and log in with clearly labelled local prototype authentication.
- Explore the app with dynamically dated demo tasks and exams on first launch.

## Local data and limitations

Tasks, subjects, exams, and theme preferences are stored in browser LocalStorage and scoped to the local demo account. On upgrade, existing unscoped task, subject, exam, and theme data is copied to the first account that opens the upgraded app; other demo accounts do not inherit that data. Demo data is seeded only for that first local account when no existing data is available.

Authentication is a local UI prototype, not production authentication. Passwords are stored as salted PBKDF2 hashes, not plaintext, but there is no server-side identity verification, secure password recovery, account synchronization, or protection against someone with access to the browser profile. Do not use a real or reused password. “Remember me” keeps the demo login across browser restarts; otherwise it lasts for the current tab session and survives refreshes.

The app does not yet implement the full multi-stage roadmap (including persisted study-session history, habit rewards, notes, data import/export, and a command palette). The focus timer is a simple in-page timer and does not record completed study sessions. Revision generation creates regular tasks; it does not yet optimize plans around a weekly availability calendar or automatically rebalance workload.

## Development

Install dependencies and start the Vite development server:

```sh
npm install
npm run dev
```

Create a production build and run ESLint:

```sh
npm run build
npm run lint
```

There is no automated test runner configured yet. The current verification baseline is the production TypeScript/Vite build, ESLint, and browser smoke tests for the primary task and exam flows.
