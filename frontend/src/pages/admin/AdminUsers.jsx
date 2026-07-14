import { useEffect, useState } from 'react'
import client, { apiError } from '../../api/client'
import { useToast } from '../../context/ToastContext'
import DataTable from '../../components/DataTable'
import { Modal, Spinner } from '../../components/ui'

const ROLES = [
  { value: 'employee', label: 'Karyawan' },
  { value: 'manager', label: 'Manager' },
  { value: 'director', label: 'Direktur' },
  { value: 'admin', label: 'Admin (FAT)' },
]

const EMPTY = {
  employee_id: '', full_name: '', email: '', password: '', role: 'employee',
  department: '', gender: '', join_date: '', approver_id: '', is_active: true,
}

export default function AdminUsers() {
  const toast = useToast()
  const [users, setUsers] = useState(null)
  const [approvers, setApprovers] = useState([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = () => {
    client.get('/users').then((r) => setUsers(r.data))
    client.get('/users/approvers').then((r) => setApprovers(r.data))
  }
  useEffect(load, [])

  const openCreate = () => { setForm(EMPTY); setEditId(null); setOpen(true) }
  const openEdit = (u) => {
    setForm({
      employee_id: u.employee_id, full_name: u.full_name, email: u.email, password: '',
      role: u.role, department: u.department || '', gender: u.gender || '',
      join_date: u.join_date, approver_id: u.approver_id || '', is_active: u.is_active,
    })
    setEditId(u.id)
    setOpen(true)
  }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form, approver_id: form.approver_id ? Number(form.approver_id) : null }
    try {
      if (editId) {
        if (!payload.password) delete payload.password
        await client.put(`/users/${editId}`, payload)
        toast.success('Karyawan diperbarui')
      } else {
        await client.post('/users', payload)
        toast.success('Karyawan ditambahkan')
      }
      setOpen(false)
      load()
    } catch (err) {
      toast.error(apiError(err))
    } finally {
      setSaving(false)
    }
  }

  if (!users) return <Spinner />

  const nameById = Object.fromEntries(users.map((u) => [u.id, u.full_name]))
  const columns = [
    { key: 'employee_id', header: 'NIK', sortable: true },
    { key: 'full_name', header: 'Nama', sortable: true },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Role', render: (r) => ROLES.find((x) => x.value === r.role)?.label || r.role },
    { key: 'department', header: 'Departemen' },
    { key: 'approver_id', header: 'Atasan', render: (r) => nameById[r.approver_id] || '-' },
    { key: 'is_active', header: 'Aktif', render: (r) => (r.is_active ? '✓' : '✗') },
    {
      key: 'actions', header: '',
      render: (r) => <button className="text-xs text-primary hover:underline" onClick={() => openEdit(r)}>Edit</button>,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Manajemen User</h1>
        <button className="btn-primary" onClick={openCreate}>+ Tambah Karyawan</button>
      </div>

      <DataTable columns={columns} data={users} searchKeys={['full_name', 'email', 'employee_id', 'department']} pageSize={15} />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editId ? 'Edit Karyawan' : 'Tambah Karyawan'}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setOpen(false)}>Batal</button>
            <button className="btn-primary" form="user-form" type="submit" disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </>
        }
      >
        <form id="user-form" onSubmit={submit} className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">NIK</label>
            <input className="input" value={form.employee_id} disabled={!!editId}
              onChange={(e) => setForm({ ...form, employee_id: e.target.value })} required />
          </div>
          <div>
            <label className="label">Nama Lengkap</label>
            <input className="input" value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
          </div>
          <div className="col-span-2">
            <label className="label">Email</label>
            <input type="email" className="input" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <label className="label">Password {editId && <span className="text-gray-400">(kosongkan jika tetap)</span>}</label>
            <input type="password" className="input" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editId} minLength={6} />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Departemen</label>
            <input className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          </div>
          <div>
            <label className="label">Gender</label>
            <select className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              <option value="">-</option>
              <option value="male">Laki-laki</option>
              <option value="female">Perempuan</option>
            </select>
          </div>
          <div>
            <label className="label">Tanggal Bergabung</label>
            <input type="date" className="input" value={form.join_date}
              onChange={(e) => setForm({ ...form, join_date: e.target.value })} required />
          </div>
          <div>
            <label className="label">Atasan (Approver)</label>
            <select className="input" value={form.approver_id} onChange={(e) => setForm({ ...form, approver_id: e.target.value })}>
              <option value="">- Tidak ada -</option>
              {approvers.filter((a) => a.id !== editId).map((a) => (
                <option key={a.id} value={a.id}>{a.full_name} ({a.role})</option>
              ))}
            </select>
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            <label className="text-sm text-gray-700">Akun aktif</label>
          </div>
        </form>
      </Modal>
    </div>
  )
}
