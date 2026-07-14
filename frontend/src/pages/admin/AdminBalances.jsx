import { useEffect, useState } from 'react'
import client, { apiError } from '../../api/client'
import { useToast } from '../../context/ToastContext'
import DataTable from '../../components/DataTable'
import { Modal, Spinner, LEAVE_LABELS } from '../../components/ui'

export default function AdminBalances() {
  const toast = useToast()
  const [year, setYear] = useState(new Date().getFullYear())
  const [balances, setBalances] = useState(null)
  const [edit, setEdit] = useState(null)
  const [quota, setQuota] = useState(0)
  const [saving, setSaving] = useState(false)

  const load = () => client.get('/leaves/balances', { params: { year } }).then((r) => setBalances(r.data))
  useEffect(() => { load() }, [year])

  const save = async () => {
    setSaving(true)
    try {
      await client.put(`/leaves/balances/${edit.id}`, { quota: Number(quota) })
      toast.success('Kuota diperbarui')
      setEdit(null)
      load()
    } catch (err) {
      toast.error(apiError(err))
    } finally {
      setSaving(false)
    }
  }

  if (!balances) return <Spinner />

  const rows = balances.map((b) => ({ ...b, nama: b.user?.full_name || `User #${b.user_id}` }))
  const columns = [
    { key: 'nama', header: 'Karyawan', sortable: true },
    { key: 'leave_type', header: 'Jenis', render: (r) => LEAVE_LABELS[r.leave_type] || r.leave_type },
    { key: 'quota', header: 'Kuota', sortable: true },
    { key: 'used', header: 'Terpakai' },
    { key: 'sisa', header: 'Sisa', render: (r) => <span className="font-semibold text-primary">{r.quota - r.used}</span> },
    {
      key: 'actions', header: '',
      render: (r) => (
        <button className="text-xs text-primary hover:underline" onClick={() => { setEdit(r); setQuota(r.quota) }}>
          Edit Kuota
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Kuota Cuti</h1>
        <input type="number" className="input max-w-[120px]" value={year} onChange={(e) => setYear(Number(e.target.value))} />
      </div>

      <DataTable columns={columns} data={rows} searchKeys={['nama']} pageSize={15} />

      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title="Edit Kuota"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setEdit(null)}>Batal</button>
            <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
          </>
        }
      >
        {edit && (
          <div className="space-y-3 text-sm">
            <p>{edit.user?.full_name} · {LEAVE_LABELS[edit.leave_type]} · {edit.year}</p>
            <div>
              <label className="label">Kuota (hari)</label>
              <input type="number" className="input" value={quota} onChange={(e) => setQuota(e.target.value)} />
              <p className="mt-1 text-xs text-gray-400">Terpakai saat ini: {edit.used} hari</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
