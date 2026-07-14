import { useEffect, useState } from 'react'
import client, { apiError } from '../api/client'
import { useToast } from '../context/ToastContext'
import DataTable from '../components/DataTable'
import FileUpload from '../components/FileUpload'
import { Modal, Spinner, StatusBadge, formatDate, LEAVE_LABELS } from '../components/ui'

const EMPTY = { leave_type: 'CT', start_date: '', end_date: '', reason: '', attachment_path: null }

export default function MyLeaves() {
  const toast = useToast()
  const [leaves, setLeaves] = useState(null)
  const [types, setTypes] = useState([])
  const [balances, setBalances] = useState([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState(null)

  const load = () => {
    client.get('/leaves').then((r) => setLeaves(r.data))
    client.get('/leaves/balances', { params: { year: new Date().getFullYear() } })
      .then((r) => setBalances(r.data))
  }

  useEffect(() => {
    load()
    client.get('/meta/leave-types').then((r) => setTypes(r.data))
  }, [])

  const selectedType = types.find((t) => t.code === form.leave_type)
  const needsAttachment = form.leave_type === 'CS'

  const submit = async (e) => {
    e.preventDefault()
    if (needsAttachment && !form.attachment_path) {
      // Backend hanya mewajibkan untuk CS > 1 hari; ingatkan lebih awal.
    }
    setSaving(true)
    try {
      await client.post('/leaves', form)
      toast.success('Pengajuan cuti berhasil dikirim')
      setOpen(false)
      setForm(EMPTY)
      load()
    } catch (err) {
      toast.error(apiError(err, 'Gagal mengirim pengajuan'))
    } finally {
      setSaving(false)
    }
  }

  const cancel = async (id) => {
    if (!confirm('Batalkan pengajuan ini?')) return
    try {
      await client.put(`/leaves/${id}/cancel`)
      toast.success('Pengajuan dibatalkan')
      load()
    } catch (err) {
      toast.error(apiError(err))
    }
  }

  if (!leaves) return <Spinner />

  const columns = [
    { key: 'request_number', header: 'No.', sortable: true },
    { key: 'leave_type', header: 'Jenis', render: (r) => LEAVE_LABELS[r.leave_type] || r.leave_type },
    { key: 'start_date', header: 'Mulai', sortable: true, render: (r) => formatDate(r.start_date) },
    { key: 'end_date', header: 'Selesai', render: (r) => formatDate(r.end_date) },
    { key: 'total_days', header: 'Hari' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="flex gap-2">
          <button className="text-xs text-primary hover:underline" onClick={() => setDetail(r)}>
            Detail
          </button>
          {r.status === 'pending' && (
            <button className="text-xs text-red-600 hover:underline" onClick={() => cancel(r.id)}>
              Batalkan
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Cuti Saya</h1>
        <button className="btn-primary" onClick={() => { setForm(EMPTY); setOpen(true) }}>
          + Ajukan Cuti Baru
        </button>
      </div>

      {balances.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {balances.map((b) => (
            <div key={b.id} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm">
              <span className="font-medium">{LEAVE_LABELS[b.leave_type] || b.leave_type}:</span>{' '}
              <span className="text-primary font-semibold">{b.quota - b.used}</span> / {b.quota} hari
            </div>
          ))}
        </div>
      )}

      <DataTable columns={columns} data={leaves} searchKeys={['request_number', 'reason']} />

      {/* Form pengajuan */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Ajukan Cuti Baru"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setOpen(false)}>Batal</button>
            <button className="btn-primary" form="leave-form" type="submit" disabled={saving}>
              {saving ? 'Mengirim...' : 'Kirim'}
            </button>
          </>
        }
      >
        <form id="leave-form" onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Jenis Cuti</label>
            <select
              className="input"
              value={form.leave_type}
              onChange={(e) => setForm({ ...form, leave_type: e.target.value })}
            >
              {types.map((t) => (
                <option key={t.code} value={t.code}>{t.name}</option>
              ))}
            </select>
            {selectedType && <p className="mt-1 text-xs text-gray-400">{selectedType.keterangan}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tanggal Mulai</label>
              <input
                type="date"
                className="input"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Tanggal Selesai</label>
              <input
                type="date"
                className="input"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                required
              />
            </div>
          </div>
          <div>
            <label className="label">Alasan</label>
            <textarea
              className="input"
              rows={3}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Keterangan pengajuan cuti"
            />
          </div>
          <div>
            <label className="label">
              Lampiran {needsAttachment && <span className="text-red-500">(surat dokter, wajib jika &gt; 1 hari)</span>}
            </label>
            <FileUpload
              value={form.attachment_path}
              onUploaded={(path) => setForm({ ...form, attachment_path: path })}
            />
          </div>
        </form>
      </Modal>

      {/* Detail */}
      <LeaveDetailModal detail={detail} onClose={() => setDetail(null)} />
    </div>
  )
}

export function LeaveDetailModal({ detail, onClose }) {
  if (!detail) return null
  return (
    <Modal open={!!detail} onClose={onClose} title={`Detail ${detail.request_number}`}>
      <div className="space-y-3 text-sm">
        <Row label="Jenis" value={LEAVE_LABELS[detail.leave_type] || detail.leave_type} />
        <Row label="Periode" value={`${formatDate(detail.start_date)} – ${formatDate(detail.end_date)} (${detail.total_days} hari kerja)`} />
        <Row label="Status" value={<StatusBadge status={detail.status} />} />
        <Row label="Alasan" value={detail.reason || '-'} />
        {detail.user && <Row label="Pemohon" value={detail.user.full_name} />}
        {detail.attachment_path && (
          <Row label="Lampiran" value={<a className="text-primary hover:underline" href={`/uploads/${detail.attachment_path}`} target="_blank" rel="noreferrer">Lihat file</a>} />
        )}
        {detail.approvals?.length > 0 && (
          <div>
            <div className="mb-1 font-medium text-gray-700">Riwayat Approval</div>
            <div className="space-y-1">
              {detail.approvals.map((a) => (
                <div key={a.id} className="rounded border border-gray-100 bg-gray-50 px-3 py-2 text-xs">
                  <span className={a.action === 'approved' ? 'text-green-700' : 'text-red-700'}>
                    {a.action === 'approved' ? '✓ Disetujui' : '✗ Ditolak'} (Level {a.level})
                  </span>
                  {a.approver && <> oleh {a.approver.full_name}</>}
                  {a.notes && <div className="mt-0.5 text-gray-500">"{a.notes}"</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex gap-3">
      <div className="w-28 shrink-0 text-gray-400">{label}</div>
      <div className="flex-1 text-gray-800">{value}</div>
    </div>
  )
}
