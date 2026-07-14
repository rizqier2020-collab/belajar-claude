import { useState } from 'react'
import client, { apiError } from '../../api/client'
import { useToast } from '../../context/ToastContext'

const MONTHS = [
  '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

export default function AdminReports() {
  const toast = useToast()
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState('')
  const [loading, setLoading] = useState('')

  const download = async (kind) => {
    setLoading(kind)
    try {
      const params = { year }
      if (month) params.month = month
      const res = await client.get(`/reports/${kind}`, { params, responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      const suffix = month ? `${year}-${String(month).padStart(2, '0')}` : year
      a.download = `laporan-${kind === 'leaves' ? 'cuti' : 'reimbursement'}-${suffix}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('Laporan berhasil diunduh')
    } catch (err) {
      toast.error(apiError(err, 'Gagal mengunduh laporan'))
    } finally {
      setLoading('')
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-800">Laporan</h1>

      <div className="card max-w-lg space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Tahun</label>
            <input type="number" className="input" value={year} onChange={(e) => setYear(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Bulan (opsional)</label>
            <select className="input" value={month} onChange={(e) => setMonth(e.target.value)}>
              <option value="">Semua Bulan</option>
              {MONTHS.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <button className="btn-primary flex-1" onClick={() => download('leaves')} disabled={!!loading}>
            {loading === 'leaves' ? 'Mengunduh...' : '⬇ Export Cuti (CSV)'}
          </button>
          <button className="btn-primary flex-1" onClick={() => download('reimbursements')} disabled={!!loading}>
            {loading === 'reimbursements' ? 'Mengunduh...' : '⬇ Export Reimbursement (CSV)'}
          </button>
        </div>
        <p className="text-xs text-gray-400">
          File CSV dapat dibuka langsung di Microsoft Excel atau Google Sheets.
        </p>
      </div>
    </div>
  )
}
