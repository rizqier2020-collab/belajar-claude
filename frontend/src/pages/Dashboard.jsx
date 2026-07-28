import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Spinner, LEAVE_LABELS } from '../components/ui'

const StatIcon = ({ path }) => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
  </svg>
)

const ICON_PATHS = {
  total: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  pending: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  approved: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
}

function StatCard({ label, value, icon, tone = 'primary' }) {
  const tones = {
    primary: 'bg-primary-50 text-primary',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  }
  return (
    <div className="card group transition-all hover:-translate-y-0.5 hover:shadow-card-hover">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
          <div className="mt-2 text-3xl font-extrabold tracking-tight text-slate-800">{value}</div>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
          <StatIcon path={ICON_PATHS[icon]} />
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user, isApprover } = useAuth()
  const [data, setData] = useState(null)
  const [balances, setBalances] = useState([])

  useEffect(() => {
    client.get('/meta/dashboard').then((r) => setData(r.data))
    client.get('/leaves/balances', { params: { year: new Date().getFullYear() } })
      .then((r) => setBalances(r.data))
  }, [])

  if (!data) return <Spinner />

  const pendingApprovals = data.pending_leave_approvals + data.pending_reimb_approvals

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Halo, {user.full_name} 👋</h1>
        <p className="mt-1 text-sm text-slate-500">Ringkasan aktivitas pengajuan Anda.</p>
      </div>

      {isApprover && pendingApprovals > 0 && (
        <Link
          to="/approvals"
          className="group flex items-center justify-between overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white p-4 shadow-soft transition hover:shadow-card"
        >
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400 text-white shadow-sm shadow-amber-400/40">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </span>
            <div>
              <div className="font-semibold text-amber-900">
                {pendingApprovals} pengajuan menunggu persetujuan Anda
              </div>
              <div className="text-xs text-amber-700">
                {data.pending_leave_approvals} cuti · {data.pending_reimb_approvals} reimbursement
              </div>
            </div>
          </div>
          <span className="text-amber-600 transition group-hover:translate-x-1">→</span>
        </Link>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-500">Cuti Saya</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <StatCard label="Total Pengajuan" value={data.my_leaves_total} icon="total" tone="primary" />
          <StatCard label="Menunggu" value={data.my_leaves_pending} icon="pending" tone="amber" />
          <StatCard label="Disetujui" value={data.my_leaves_approved} icon="approved" tone="emerald" />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-500">Reimbursement Saya</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <StatCard label="Total Pengajuan" value={data.my_reimb_total} icon="total" tone="primary" />
          <StatCard label="Menunggu" value={data.my_reimb_pending} icon="pending" tone="amber" />
          <StatCard label="Disetujui/Dibayar" value={data.my_reimb_approved} icon="approved" tone="emerald" />
        </div>
      </div>

      {balances.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-slate-500">Kuota Cuti {new Date().getFullYear()}</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {balances.map((b) => {
              const remaining = b.quota - b.used
              const pct = b.quota > 0 ? Math.max(0, Math.min(100, (remaining / b.quota) * 100)) : 0
              return (
                <div key={b.id} className="card">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {LEAVE_LABELS[b.leave_type] || b.leave_type}
                    </div>
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">{b.leave_type}</span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold tracking-tight text-primary">{remaining}</span>
                    <span className="text-xs text-slate-400">/ {b.quota} hari</span>
                  </div>
                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary-light to-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-1.5 text-[11px] text-slate-400">Terpakai {b.used} hari</div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
