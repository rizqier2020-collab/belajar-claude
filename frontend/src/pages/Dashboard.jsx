import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Spinner } from '../components/ui'

function StatCard({ label, value, sub, accent = 'text-primary' }) {
  return (
    <div className="card">
      <div className="text-xs font-medium uppercase text-gray-400">{label}</div>
      <div className={`mt-1 text-3xl font-bold ${accent}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-gray-400">{sub}</div>}
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
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">Halo, {user.full_name} 👋</h1>
        <p className="text-sm text-gray-500">Ringkasan aktivitas pengajuan Anda.</p>
      </div>

      {isApprover && pendingApprovals > 0 && (
        <Link
          to="/approvals"
          className="flex items-center justify-between rounded-xl border border-yellow-300 bg-yellow-50 p-4 transition hover:bg-yellow-100"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-400 text-white">
              🔔
            </span>
            <div>
              <div className="font-medium text-yellow-900">
                {pendingApprovals} pengajuan menunggu persetujuan Anda
              </div>
              <div className="text-xs text-yellow-700">
                {data.pending_leave_approvals} cuti · {data.pending_reimb_approvals} reimbursement
              </div>
            </div>
          </div>
          <span className="text-yellow-700">→</span>
        </Link>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold text-gray-600">Cuti Saya</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <StatCard label="Total Pengajuan" value={data.my_leaves_total} />
          <StatCard label="Menunggu" value={data.my_leaves_pending} accent="text-yellow-600" />
          <StatCard label="Disetujui" value={data.my_leaves_approved} accent="text-green-600" />
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-gray-600">Reimbursement Saya</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <StatCard label="Total Pengajuan" value={data.my_reimb_total} />
          <StatCard label="Menunggu" value={data.my_reimb_pending} accent="text-yellow-600" />
          <StatCard label="Disetujui/Dibayar" value={data.my_reimb_approved} accent="text-green-600" />
        </div>
      </div>

      {balances.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-gray-600">Kuota Cuti {new Date().getFullYear()}</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {balances.map((b) => (
              <div key={b.id} className="card">
                <div className="text-xs font-medium uppercase text-gray-400">{b.leave_type} · Sisa</div>
                <div className="mt-1 text-2xl font-bold text-primary">{b.quota - b.used}</div>
                <div className="mt-1 text-xs text-gray-400">
                  dari {b.quota} hari (terpakai {b.used})
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
