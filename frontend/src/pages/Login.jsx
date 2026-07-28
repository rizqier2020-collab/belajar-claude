import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { apiError } from '../api/client'

export default function Login() {
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      toast.success('Login berhasil')
      navigate('/')
    } catch (err) {
      toast.error(apiError(err, 'Login gagal'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4">
      {/* Panel brand di kiri (desktop) */}
      <div className="relative hidden w-1/2 self-stretch overflow-hidden bg-gradient-to-br from-primary-light via-primary to-primary-dark lg:block">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 translate-x-1/3 translate-y-1/3 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-base font-extrabold backdrop-blur">
              JFP
            </div>
            <span className="font-semibold tracking-tight">Jasa Ferrie Pratama</span>
          </div>
          <div>
            <h2 className="text-3xl font-extrabold leading-tight tracking-tight">
              Kelola cuti & reimbursement<br />dalam satu tempat.
            </h2>
            <p className="mt-4 max-w-md text-sm text-white/70">
              Ajukan, setujui, dan pantau seluruh pengajuan karyawan dengan alur
              persetujuan bertingkat yang rapi dan transparan.
            </p>
          </div>
          <p className="text-xs text-white/50">© {new Date().getFullYear()} PT Jasa Ferrie Pratama</p>
        </div>
      </div>

      {/* Form login */}
      <div className="flex w-full flex-1 items-center justify-center py-10">
        <div className="w-full max-w-sm animate-slide-up rounded-2xl border border-slate-200/70 bg-white p-8 shadow-card">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-primary-light to-primary text-lg font-extrabold text-white shadow-lg shadow-primary/30 lg:hidden">
              JFP
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">Selamat Datang</h1>
            <p className="mt-1 text-sm text-slate-400">Masuk ke akun Anda untuk melanjutkan</p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@jfp.co.id"
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <button type="submit" className="btn-primary w-full !py-3" disabled={loading}>
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
