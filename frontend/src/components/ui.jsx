// Komponen UI kecil yang dipakai bersama.

const STATUS_MAP = {
  pending: { label: 'Menunggu', cls: 'bg-amber-50 text-amber-700 ring-amber-600/20', dot: 'bg-amber-500' },
  approved_l1: { label: 'Disetujui L1', cls: 'bg-sky-50 text-sky-700 ring-sky-600/20', dot: 'bg-sky-500' },
  approved: { label: 'Disetujui', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', dot: 'bg-emerald-500' },
  rejected: { label: 'Ditolak', cls: 'bg-red-50 text-red-700 ring-red-600/20', dot: 'bg-red-500' },
  cancelled: { label: 'Dibatalkan', cls: 'bg-slate-100 text-slate-500 ring-slate-500/20', dot: 'bg-slate-400' },
  paid: { label: 'Dibayar', cls: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20', dot: 'bg-indigo-500' },
}

export function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || { label: status, cls: 'bg-slate-100 text-slate-500 ring-slate-500/20', dot: 'bg-slate-400' }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${s.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

export function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-slate-200 border-t-primary" />
    </div>
  )
}

export function EmptyState({ children }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-6h6v6M4 7h16M6 7l1 13h10l1-13" />
        </svg>
      </div>
      <div className="text-sm text-slate-400">{children || 'Belum ada data'}</div>
    </div>
  )
}

export function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5 animate-slide-up">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-800">{title}</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-3.5">{footer}</div>}
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
