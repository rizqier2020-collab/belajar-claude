import { useState } from 'react'
import client, { apiError } from '../api/client'
import { useToast } from '../context/ToastContext'

/**
 * Upload file ke /api/uploads, panggil onUploaded(path) saat sukses.
 */
export default function FileUpload({ onUploaded, value, required }) {
  const toast = useToast()
  const [uploading, setUploading] = useState(false)
  const [filename, setFilename] = useState('')

  const handle = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    setUploading(true)
    try {
      const { data } = await client.post('/uploads', fd)
      setFilename(data.filename)
      onUploaded(data.path)
      toast.success('File berhasil diupload')
    } catch (err) {
      toast.error(apiError(err, 'Upload gagal'))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <input
        type="file"
        accept=".jpg,.jpeg,.png,.pdf"
        onChange={handle}
        className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-white hover:file:bg-primary-dark"
      />
      {uploading && <p className="mt-1 text-xs text-gray-400">Mengupload...</p>}
      {value && !uploading && (
        <p className="mt-1 text-xs text-green-600">✓ Terlampir: {filename || value}</p>
      )}
      {required && !value && (
        <p className="mt-1 text-xs text-gray-400">Format: JPG, PNG, PDF · maks 5MB</p>
      )}
    </div>
  )
}
