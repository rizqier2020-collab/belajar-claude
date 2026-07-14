import { useEffect, useState } from 'react'
import client, { apiError } from '../api/client'
import { useToast } from '../context/ToastContext'
import DataTable from '../components/DataTable'
import { Modal, Spinner, StatusBadge, formatDate, formatRupiah, LEAVE_LABELS, CATEGORY_LABELS } from '../components/ui'

export default function PendingApprovals() {
  const toast = useToast()
  const [tab, setTab] = useState('leaves')
  const [leaves, setLeaves] = useState(null)
  const [reimb, setReimb] = useState(null)
  const [action, setAction] = useState(null) // { kind, item, mode }
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    client.get('/leaves/pending-approvals').then((r) => setLeaves(r.data))
    client.get('/reimbursements/pending-approvals').then((r) => setReimb(r.data))
  }

  useEffect(load, [])

  const doAction = async () => {
    setSaving(true)
    const { kind, item, mode } = action
    const base = kind === 'leave' ? 'leaves' : 'reimbursements'
    try {
      await client.post(`/${base}/${item.id}/${mode}`, { notes })
      toast.success(mode === 'approve' ? 'Pengajuan disetujui' : 'Pengajuan ditolak')
      setAction(null)
      setNotes('')
      load()
    } catch (err) {
      toast.error(apiError(err))
    } finally {
      setSaving(false)
    }
  }

  if (!leaves || !reimb) return <Spinner />

  const leaveCols = [
    { key: 'request_number', header: 'No.', sortable: true },
    { key: 'pemohon', header: 'Pemohon', render: (r) => r.user?.full_name || '-' },
    { key: 'leave_type', header: 'Jenis', render: (r) => LEAVE_LABELS[r.leave_type] || r.leave_type },
    { key: 'periode', header: 'Periode', render: (r) => `${formatDate(r.start_date)} – ${formatDate(r.end_date)}` },
    { key: 'total_days', header: 'Hari' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: 'Aksi',
      render: (r) => (
        <div className="flex gap-2">
          <button className="btn-success !py-1 !px-3 text-xs" onClick={() => { setNotes(''); setAction({ kind: 'leave', item: r, mode: 'approve' }) }}>Setujui</button>
          <button className="btn-danger !py-1 !px-3 text-xs" onClick={() => { setNotes(''); setAction({ kind: 'leave', item: r, mode: 'reject' }) }}>Tolak</button>
        </div>
      ),
    },
  ]

  const reimbCols = [
    { key: 'request_number', header: 'No.', sortable: true },
    { key: 'pemohon', header: 'Pemohon', render: (r) => r.user?.full_name || '-' },
    { key: 'category', header: 'Kategori', render: (r) => CATEGORY_LABELS[r.category] || r.category },
    { key: 'amount', header: 'Nominal', sortable: true, sortValue: (r) => Number(r.amount), render: (r) => formatRupiah(r.amount) },
    { key: 'receipt_date', header: 'Tgl Bukti', render: (r) => formatDate(r.receipt_date) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: 'Aksi',
      render: (r) => (
        <div className="flex gap-2">
          <a className="text-xs text-primary hover:underline self-center" href={`/uploads/${r.receipt_path}`} target="_blank" rel="noreferrer">Bukti</a>
          <button className="btn-success !py-1 !px-3 text-xs" onClick={() => { setNotes(''); setAction({ kind: 'reimb', item: r, mode: 'approve' }) }}>Setujui</button>
          <button className="btn-danger !py-1 !px-3 text-xs" onClick={() => { setNotes(''); setAction({ kind: 'reimb', item: r, mode: 'reject' }) }}>Tolak</button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-800">Menunggu Persetujuan</h1>

      <div className="flex gap-2 border-b">
        <TabBtn active={tab === 'leaves'} onClick={() => setTab('leaves')} label={`Cuti (${leaves.length})`} />
        <TabBtn active={tab === 'reimb'} onClick={() => setTab('reimb')} label={`Reimbursement (${reimb.length})`} />
      </div>

      {tab === 'leaves' ? (
        <DataTable columns={leaveCols} data={leaves} searchKeys={['request_number']} />
      ) : (
        <DataTable columns={reimbCols} data={reimb} searchKeys={['request_number', 'description']} />
      )}

      <Modal
        open={!!action}
        onClose={() => setAction(null)}
        title={action?.mode === 'approve' ? 'Setujui Pengajuan' : 'Tolak Pengajuan'}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setAction(null)}>Batal</button>
            <button
              className={action?.mode === 'approve' ? 'btn-success' : 'btn-danger'}
              onClick={doAction}
              disabled={saving}
            >
              {saving ? 'Memproses...' : action?.mode === 'approve' ? 'Setujui' : 'Tolak'}
            </button>
          </>
        }
      >
        <p className="mb-3 text-sm text-gray-600">
          {action?.item?.request_number} · {action?.item?.user?.full_name}
        </p>
        <label className="label">Catatan {action?.mode === 'reject' && <span className="text-red-500">(disarankan)</span>}</label>
        <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Catatan persetujuan/penolakan" />
      </Modal>
    </div>
  )
}

function TabBtn({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
        active ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {label}
    </button>
  )
}
