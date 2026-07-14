import { useEffect, useState } from 'react'
import client, { apiError } from '../api/client'
import { useToast } from '../context/ToastContext'
import DataTable from '../components/DataTable'
import FileUpload from '../components/FileUpload'
import { Modal, Spinner, StatusBadge, formatDate, formatRupiah, CATEGORY_LABELS } from '../components/ui'

const EMPTY = {
  category: 'TR', amount: '', description: '', receipt_date: '',
  receipt_path: null, project_code: '',
}

export default function MyReimbursements() {
  const toast = useToast()
  const [items, setItems] = useState(null)
  const [categories, setCategories] = useState([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState(null)

  const load = () => client.get('/reimbursements').then((r) => setItems(r.data))

  useEffect(() => {
    load()
    client.get('/meta/reimbursement-categories').then((r) => setCategories(r.data))
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    if (!form.receipt_path) {
      toast.error('Bukti/nota wajib diupload')
      return
    }
    setSaving(true)
    try {
      await client.post('/reimbursements', { ...form, amount: Number(form.amount) })
      toast.success('Pengajuan reimbursement berhasil dikirim')
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
      await client.put(`/reimbursements/${id}/cancel`)
      toast.success('Pengajuan dibatalkan')
      load()
    } catch (err) {
      toast.error(apiError(err))
    }
  }

  if (!items) return <Spinner />

  const columns = [
    { key: 'request_number', header: 'No.', sortable: true },
    { key: 'category', header: 'Kategori', render: (r) => CATEGORY_LABELS[r.category] || r.category },
    { key: 'amount', header: 'Nominal', sortable: true, sortValue: (r) => Number(r.amount), render: (r) => formatRupiah(r.amount) },
    { key: 'receipt_date', header: 'Tgl Bukti', sortable: true, render: (r) => formatDate(r.receipt_date) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: '',
      render: (r) => (
        <div className="flex gap-2">
          <button className="text-xs text-primary hover:underline" onClick={() => setDetail(r)}>Detail</button>
          {r.status === 'pending' && (
            <button className="text-xs text-red-600 hover:underline" onClick={() => cancel(r.id)}>Batalkan</button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Reimbursement Saya</h1>
        <button className="btn-primary" onClick={() => { setForm(EMPTY); setOpen(true) }}>
          + Ajukan Reimbursement Baru
        </button>
      </div>

      <DataTable columns={columns} data={items} searchKeys={['request_number', 'description', 'project_code']} />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Ajukan Reimbursement Baru"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setOpen(false)}>Batal</button>
            <button className="btn-primary" form="reimb-form" type="submit" disabled={saving}>
              {saving ? 'Mengirim...' : 'Kirim'}
            </button>
          </>
        }
      >
        <form id="reimb-form" onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Kategori</label>
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {categories.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nominal (Rp)</label>
              <input type="number" min="1" className="input" value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <div>
              <label className="label">Tanggal Bukti</label>
              <input type="date" className="input" value={form.receipt_date}
                onChange={(e) => setForm({ ...form, receipt_date: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="label">Deskripsi</label>
            <textarea className="input" rows={2} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Keterangan detail pengeluaran" required />
          </div>
          <div>
            <label className="label">Kode Proyek (opsional)</label>
            <input className="input" value={form.project_code}
              onChange={(e) => setForm({ ...form, project_code: e.target.value })} placeholder="mis. PRJ-2026-011" />
          </div>
          <div>
            <label className="label">Bukti/Nota <span className="text-red-500">(wajib)</span></label>
            <FileUpload value={form.receipt_path} required
              onUploaded={(path) => setForm({ ...form, receipt_path: path })} />
          </div>
          {Number(form.amount) > 500000 && (
            <p className="rounded bg-blue-50 px-3 py-2 text-xs text-blue-700">
              Nominal &gt; Rp 500.000 membutuhkan persetujuan hingga Direktur.
            </p>
          )}
        </form>
      </Modal>

      <ReimbDetailModal detail={detail} onClose={() => setDetail(null)} />
    </div>
  )
}

export function ReimbDetailModal({ detail, onClose }) {
  if (!detail) return null
  return (
    <Modal open={!!detail} onClose={onClose} title={`Detail ${detail.request_number}`}>
      <div className="space-y-3 text-sm">
        <Row label="Kategori" value={CATEGORY_LABELS[detail.category] || detail.category} />
        <Row label="Nominal" value={formatRupiah(detail.amount)} />
        <Row label="Tgl Bukti" value={formatDate(detail.receipt_date)} />
        <Row label="Status" value={<StatusBadge status={detail.status} />} />
        <Row label="Deskripsi" value={detail.description} />
        {detail.project_code && <Row label="Kode Proyek" value={detail.project_code} />}
        {detail.user && <Row label="Pemohon" value={detail.user.full_name} />}
        {detail.paid_date && <Row label="Tgl Bayar" value={formatDate(detail.paid_date)} />}
        {detail.receipt_path && (
          <Row label="Bukti" value={<a className="text-primary hover:underline" href={`/uploads/${detail.receipt_path}`} target="_blank" rel="noreferrer">Lihat bukti</a>} />
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
