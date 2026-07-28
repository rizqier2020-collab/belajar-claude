import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ROLE_LABELS = {
  employee: 'Karyawan',
  manager: 'Manager',
  director: 'Direktur',
  admin: 'Admin (FAT)',
}

// Ikon inline (stroke) — ringan, tanpa dependency.
const Icon = ({ path }) => (
  <svg className="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
  </svg>
)

const ICONS = {
  dashboard: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0h6',
  leave: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  reimb: 'M9 7h6m-6 4h6m-6 4h4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z',
  approve: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  quota: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  users: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  holiday: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  report: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  logout: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
}

function NavItem({ to, label, icon, onClick, badge }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onClick}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
          isActive
            ? 'bg-primary text-white shadow-sm shadow-primary/30'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`
      }
    >
      <Icon path={ICONS[icon]} />
      <span className="flex-1">{label}</span>
      {badge > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1.5 text-[11px] font-bold text-white">
          {badge}
        </span>
      )}
    </NavLink>
  )
}

function SectionLabel({ children }) {
  return <div className="mb-1 mt-5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{children}</div>
}

function initials(name) {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

export default function Layout() {
  const { user, isApprover, isAdmin, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const close = () => setOpen(false)

  const nav = (
    <nav className="flex flex-col">
      <NavItem to="/" label="Dashboard" icon="dashboard" onClick={close} />

      <SectionLabel>Pengajuan Saya</SectionLabel>
      <NavItem to="/leaves" label="Cuti Saya" icon="leave" onClick={close} />
      <NavItem to="/reimbursements" label="Reimbursement Saya" icon="reimb" onClick={close} />

      {isApprover && (
        <>
          <SectionLabel>Approval</SectionLabel>
          <NavItem to="/approvals" label="Menunggu Persetujuan" icon="approve" onClick={close} />
        </>
      )}

      {isAdmin && (
        <>
          <SectionLabel>Admin (FAT)</SectionLabel>
          <NavItem to="/admin/leaves" label="Semua Cuti" icon="leave" onClick={close} />
          <NavItem to="/admin/reimbursements" label="Semua Reimbursement" icon="reimb" onClick={close} />
          <NavItem to="/admin/balances" label="Kuota Cuti" icon="quota" onClick={close} />
          <NavItem to="/admin/users" label="Manajemen User" icon="users" onClick={close} />
          <NavItem to="/admin/holidays" label="Hari Libur" icon="holiday" onClick={close} />
          <NavItem to="/admin/reports" label="Laporan" icon="report" onClick={close} />
        </>
      )}
    </nav>
  )

  return (
    <div className="min-h-screen">
      {/* Topbar */}
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 md:hidden"
              onClick={() => setOpen((o) => !o)}
              aria-label="Menu"
            >
              ☰
            </button>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-b from-primary-light to-primary text-sm font-extrabold text-white shadow-sm shadow-primary/30">
                JFP
              </div>
              <div className="leading-tight">
                <div className="text-sm font-bold tracking-tight text-slate-800">Cuti & Reimbursement</div>
                <div className="text-xs text-slate-400">PT Jasa Ferrie Pratama</div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right leading-tight sm:block">
              <div className="text-sm font-semibold text-slate-800">{user?.full_name}</div>
              <div className="text-xs text-slate-400">{ROLE_LABELS[user?.role] || user?.role}</div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary ring-2 ring-white">
              {initials(user?.full_name)}
            </div>
            <button
              onClick={handleLogout}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
              title="Keluar"
            >
              <Icon path={ICONS.logout} />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        {/* Sidebar desktop */}
        <aside className="hidden w-60 shrink-0 md:block">
          <div className="sticky top-[84px] rounded-2xl border border-slate-200/70 bg-white p-3 shadow-soft">{nav}</div>
        </aside>

        {/* Sidebar mobile drawer */}
        {open && (
          <div className="fixed inset-0 z-40 md:hidden" onClick={close}>
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in" />
            <div className="absolute left-0 top-0 h-full w-72 overflow-y-auto bg-white p-4 shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
              {nav}
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
