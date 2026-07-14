// Komponen UI kecil yang dipakai bersama.

const STATUS_MAP = {
  pending: { label: 'Menunggu', cls: 'bg-yellow-100 text-yellow-800' },
  approved_l1: { label: 'Disetujui L1', cls: 'bg-blue-100 text-blue-800' },
  approved: { label: 'Disetujui', cls: 'bg-green-100 text-green-800' },
  rejected: { label: 'Ditolak', cls: 'bg-red-100 text-red-800' },
  cancelled: { label: 'Dibatalkan', cls: 'bg-gray-100 text-gray-600' },
  paid: { label: 'Dibayar', cls: 'bg-blue-100 text-blue-800' },
}

export function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || { label: status, cls: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  )
}

export function Spinner() {
  return (
    <div className="flex justify-center py-10">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-primary" />
    </div>
  )
}

export function EmptyState({ children }) {
  return (
    <div className="py-12 text-center text-sm text-gray-400">{children || 'Belum ada data'}</div>
  )
}

export function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}

export function formatRupiah(amount) {
  const n = Number(amount)
  return 'Rp ' + n.toLocaleString('id-ID', { minimumFractionDigits: 0 })
}

export function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export const LEAVE_LABELS = {
  CT: 'Cuti Tahunan',
  CS: 'Cuti Sakit',
  CM: 'Cuti Menikah',
  CK: 'Cuti Melahirkan',
  CB: 'Cuti Besar',
  CP: 'Cuti Penting',
  CI: 'Izin Tidak Masuk',
}

export const CATEGORY_LABELS = {
  TR: 'Transport',
  ML: 'Meals',
  AC: 'Accommodation',
  PR: 'Printing',
  OT: 'Others',
}
