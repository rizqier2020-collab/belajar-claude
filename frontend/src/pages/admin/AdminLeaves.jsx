import { useEffect, useMemo, useState } from 'react'
import client, { apiError } from '../../api/client'
import { useToast } from '../../context/ToastContext'
import DataTable from '../../components/DataTable'
import { Spinner, StatusBadge, formatDate, LEAVE_LABELS } from '../../components/ui'
import { LeaveDetailModal } from '../MyLeaves'

const STATUSES = ['pending', 'approved_l1', 'approved', 'rejected', 'cancelled']

export default function AdminLeaves() {
  const toast = useToast()
  const [leaves, setLeaves] = useState(null)
  const [users, setUsers] = useState([])
  const [status, setStatus] = useState('')
  const [userId, setUserId] = useState('')
  const [month, setMonth] = useState('')
  const [detail, setDetail] = useState(null)

  const load = () => {
    const params = {}
    if (status) params.status = status
    if (userId) params.user_id = userId
    client.get('/leaves', { params }).then((r) => setLeaves(r.data))
  }

  useEffect(() => {
    client.get('/users').then((r) => setUsers(r.data)).catch(() => {})
  }, [])
  useEffect(load, [status, userId])

  const filtered = useMemo(() => {
    if (!leaves) return []
    if (!month) return leaves
    return leaves.filter((l) => l.start_date?.slice(0, 7) === month)
  }, [leaves, month])

  const override = async (id, mode) => {
    const notes = prompt(`Catatan override (${mode})?`) ?? ''
    try {
      await client.post(`/leaves/${id}/${mode}`, { notes })
      toast.success('Override berhasil')
      load()
    } catch (err) {
      toast.error(apiError(err))
    }
  }

  if (!leaves) return <Spinner />

  const columns = [
    { key: 'request_number', header: 'No.', sortable: true },
    { key: 'pemohon', header: 'Karyawan', render: (r) => r.user?.full_name || '-' },
    { key: 'leave_type', header: 'Jenis', render: (r) => LEAVE_LABELS[r.leave_type] || r.leave_type },
    { key: 'start_date', header: 'Mulai', sortable: true, render: (r) => formatDate(r.start_date) },
    { key: 'total_days', header: 'Hari' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: '',
      render: (r) => (
        <div className="flex gap-2">
          <button className="text-xs text-primary hover:underline" onClick={() => setDetail(r)}>Detail</button>
          {['pending', 'approved_l1'].includes(r.status) && (
            <>
              <button className="text-xs text-green-600 hover:underline" onClick={() => override(r.id, 'approve')}>Approve</button>
              <button className="text-xs text-red-600 hover:underline" onClick={() => override(r.id, 'reject')}>Reject</button>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-800">Semua Cuti</h1>

      <div className="flex flex-wrap gap-3">
        <select className="input max-w-[180px]" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Semua Status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input max-w-[200px]" value={userId} onChange={(e) => setUserId(e.target.value)}>
          <option value="">Semua Karyawan</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
        </select>
        <input type="month" className="input max-w-[180px]" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>

      <DataTable columns={columns} data={filtered} searchKeys={['request_number', 'reason']} pageSize={15} />
      <LeaveDetailModal detail={detail} onClose={() => setDetail(null)} />
    </div>
  )
}
