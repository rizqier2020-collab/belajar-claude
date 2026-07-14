import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ROLE_LABELS = {
  employee: 'Karyawan',
  manager: 'Manager',
  director: 'Direktur',
  admin: 'Admin (FAT)',
}

function NavItem({ to, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `block rounded-lg px-3 py-2 text-sm font-medium transition ${
          isActive ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'
        }`
      }
    >
      {label}
    </NavLink>
  )
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
    <nav className="flex flex-col gap-1">
      <NavItem to="/" label="Dashboard" onClick={close} />
      <div className="mt-3 px-3 text-xs font-semibold uppercase text-gray-400">Pengajuan Saya</div>
      <NavItem to="/leaves" label="Cuti Saya" onClick={close} />
      <NavItem to="/reimbursements" label="Reimbursement Saya" onClick={close} />

      {isApprover && (
        <>
          <div className="mt-3 px-3 text-xs font-semibold uppercase text-gray-400">Approval</div>
          <NavItem to="/approvals" label="Menunggu Persetujuan" onClick={close} />
        </>
      )}

      {isAdmin && (
        <>
          <div className="mt-3 px-3 text-xs font-semibold uppercase text-gray-400">Admin (FAT)</div>
          <NavItem to="/admin/leaves" label="Semua Cuti" onClick={close} />
          <NavItem to="/admin/reimbursements" label="Semua Reimbursement" onClick={close} />
          <NavItem to="/admin/balances" label="Kuota Cuti" onClick={close} />
          <NavItem to="/admin/users" label="Manajemen User" onClick={close} />
          <NavItem to="/admin/holidays" label="Hari Libur" onClick={close} />
          <NavItem to="/admin/reports" label="Laporan" onClick={close} />
        </>
      )}
    </nav>
  )

  return (
    <div className="min-h-screen">
      {/* Topbar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
          >
            ☰
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
              JFP
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-gray-800">Cuti & Reimbursement</div>
              <div className="text-xs text-gray-400">PT Jasa Ferrie Pratama</div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right leading-tight">
            <div className="text-sm font-medium text-gray-800">{user?.full_name}</div>
            <div className="text-xs text-gray-400">{ROLE_LABELS[user?.role] || user?.role}</div>
          </div>
          <button onClick={handleLogout} className="btn-secondary !py-1.5 !px-3 text-xs">
            Keluar
          </button>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        {/* Sidebar desktop */}
        <aside className="hidden w-56 shrink-0 md:block">
          <div className="sticky top-20 rounded-xl border border-gray-200 bg-white p-3">{nav}</div>
        </aside>

        {/* Sidebar mobile drawer */}
        {open && (
          <div className="fixed inset-0 z-40 md:hidden" onClick={close}>
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute left-0 top-0 h-full w-64 bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
              {nav}
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
