import { useEffect, useMemo, useState } from 'react'
import client, { apiError } from '../../api/client'
import { useToast } from '../../context/ToastContext'
import DataTable from '../../components/DataTable'
import { Spinner, StatusBadge, formatDate, formatRupiah, CATEGORY_LABELS } from '../../components/ui'
import { ReimbDetailModal } from '../MyReimbursements'

const STATUSES = ['pending', 'approved_l1', 'approved', 'rejected', 'paid', 'cancelled']

export default function AdminReimbursements() {
  const toast = useToast()
  const [items, setItems] = useState(null)
  const [users, setUsers] = useState([])
  const [status, setStatus] = useState('')
  const [userId, setUserId] = useState('')
  const [month, setMonth] = useState('')
  const [detail, setDetail] = useState(null)

  const load = () => {
    const params = {}
    if (status) params.status = status
    if (userId) params.user_id = userId
    client.get('/reimbursements', { params }).then((r) => setItems(r.data))
  }

  useEffect(() => {
    client.get('/users').then((r) => setUsers(r.data)).catch(() => {})
  }, [])
  useEffect(load, [status, userId])

  const filtered = useMemo(() => {
    if (!items) return []
    if (!month) return items
    return items.filter((i) => i.receipt_date?.slice(0, 7) === month)
  }, [items, month])

  const markPaid = async (id) => {
    if (!confirm('Tandai pengajuan ini sebagai sudah dibayar?')) return
    try {
      await client.put(`/reimbursements/${id}/paid`)
      toast.success('Ditandai sebagai dibayar')
      load()
    } catch (err) {
      toast.error(apiError(err))
    }
  }

  const override = async (id, mode) => {
    const notes = prompt(`Catatan override (${mode})?`) ?? ''
    try {
      await client.post(`/reimbursements/${id}/${mode}`, { notes })
      toast.success('Override berhasil')
      load()
    } catch (err) {
      toast.error(apiError(err))
    }
  }

  if (!items) return <Spinner />

  const totalPending = filtered
    .filter((i) => i.status === 'approved')
    .reduce((s, i) => s + Number(i.amount), 0)

  const columns = [
    { key: 'request_number', header: 'No.', sortable: true },
    { key: 'pemohon', header: 'Karyawan', render: (r) => r.user?.full_name || '-' },
    { key: 'category', header: 'Kategori', render: (r) => CATEGORY_LABELS[r.category] || r.category },
    { key: 'amount', header: 'Nominal', sortable: true, sortValue: (r) => Number(r.amount), render: (r) => formatRupiah(r.amount) },
    { key: 'receipt_date', header: 'Tgl Bukti', sortable: true, render: (r) => formatDate(r.receipt_date) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: '',
      render: (r) => (
        <div className="flex gap-2">
          <button className="text-xs text-primary hover:underline" onClick={() => setDetail(r)}>Detail</button>
          {r.status === 'approved' && (
            <button className="text-xs font-medium text-blue-600 hover:underline" onClick={() => markPaid(r.id)}>Mark as Paid</button>
          )}
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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Semua Reimbursement</h1>
        {totalPending > 0 && (
          <div className="text-sm text-gray-500">
            Menunggu pembayaran: <span className="font-semibold text-primary">{formatRupiah(totalPending)}</span>
          </div>
        )}
      </div>

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

      <DataTable columns={columns} data={filtered} searchKeys={['request_number', 'description', 'project_code']} pageSize={15} />
      <ReimbDetailModal detail={detail} onClose={() => setDetail(null)} />
    </div>
  )
}
