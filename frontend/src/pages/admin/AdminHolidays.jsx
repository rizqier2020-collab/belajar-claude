import { useEffect, useState } from 'react'
import client, { apiError } from '../../api/client'
import { useToast } from '../../context/ToastContext'
import DataTable from '../../components/DataTable'
import { Modal, Spinner, formatDate } from '../../components/ui'

export default function AdminHolidays() {
  const toast = useToast()
  const [year, setYear] = useState(new Date().getFullYear())
  const [holidays, setHolidays] = useState(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ holiday_date: '', description: '' })
  const [saving, setSaving] = useState(false)

  const load = () => client.get('/holidays', { params: { year } }).then((r) => setHolidays(r.data))
  useEffect(() => { load() }, [year])

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await client.post('/holidays', form)
      toast.success('Hari libur ditambahkan')
      setOpen(false)
      setForm({ holiday_date: '', description: '' })
      load()
    } catch (err) {
      toast.error(apiError(err))
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id) => {
    if (!confirm('Hapus hari libur ini?')) return
    try {
      await client.delete(`/holidays/${id}`)
      toast.success('Hari libur dihapus')
      load()
    } catch (err) {
      toast.error(apiError(err))
    }
  }

  if (!holidays) return <Spinner />

  const columns = [
    { key: 'holiday_date', header: 'Tanggal', sortable: true, render: (r) => formatDate(r.holiday_date) },
    { key: 'description', header: 'Keterangan' },
    {
      key: 'actions', header: '',
      render: (r) => <button className="text-xs text-red-600 hover:underline" onClick={() => remove(r.id)}>Hapus</button>,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Hari Libur Nasional</h1>
        <div className="flex gap-2">
          <input type="number" className="input max-w-[110px]" value={year} onChange={(e) => setYear(Number(e.target.value))} />
          <button className="btn-primary" onClick={() => setOpen(true)}>+ Tambah</button>
        </div>
      </div>

      <DataTable columns={columns} data={holidays} searchKeys={['description']} pageSize={20} />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Tambah Hari Libur"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setOpen(false)}>Batal</button>
            <button className="btn-primary" form="holiday-form" type="submit" disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </>
        }
      >
        <form id="holiday-form" onSubmit={submit} className="space-y-3">
          <div>
            <label className="label">Tanggal</label>
            <input type="date" className="input" value={form.holiday_date}
              onChange={(e) => setForm({ ...form, holiday_date: e.target.value })} required />
          </div>
          <div>
            <label className="label">Keterangan</label>
            <input className="input" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="mis. Hari Kemerdekaan RI" required />
          </div>
        </form>
      </Modal>
    </div>
  )
}
