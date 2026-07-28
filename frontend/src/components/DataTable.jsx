import { useMemo, useState } from 'react'
import { EmptyState } from './ui'

/**
 * columns: [{ key, header, render?, sortable?, sortValue? }]
 * data: array of rows
 * searchKeys: keys to match against search box
 */
export default function DataTable({ columns, data, searchKeys = [], pageSize = 10, actions }) {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    let rows = data
    if (query && searchKeys.length) {
      const q = query.toLowerCase()
      rows = rows.filter((r) =>
        searchKeys.some((k) => String(r[k] ?? '').toLowerCase().includes(q))
      )
    }
    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey)
      rows = [...rows].sort((a, b) => {
        const av = col?.sortValue ? col.sortValue(a) : a[sortKey]
        const bv = col?.sortValue ? col.sortValue(b) : b[sortKey]
        if (av == null) return 1
        if (bv == null) return -1
        if (av < bv) return sortDir === 'asc' ? -1 : 1
        if (av > bv) return sortDir === 'asc' ? 1 : -1
        return 0
      })
    }
    return rows
  }, [data, query, sortKey, sortDir, columns, searchKeys])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const current = Math.min(page, totalPages)
  const pageRows = filtered.slice((current - 1) * pageSize, current * pageSize)

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  return (
    <div>
      {searchKeys.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <div className="relative max-w-xs flex-1">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
            </svg>
            <input
              className="input pl-9"
              placeholder="Cari..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
            />
          </div>
          {actions}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`whitespace-nowrap px-4 py-3.5 font-semibold ${c.sortable ? 'cursor-pointer select-none transition hover:text-slate-700' : ''}`}
                  onClick={c.sortable ? () => toggleSort(c.key) : undefined}
                >
                  {c.header}
                  {c.sortable && sortKey === c.key && (
                    <span className="ml-1 text-primary">{sortDir === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pageRows.map((row, i) => (
              <tr key={row.id ?? i} className="transition-colors hover:bg-slate-50/70">
                {columns.map((c) => (
                  <td key={c.key} className="px-4 py-3.5 align-middle text-slate-700">
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <EmptyState />}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
          <span>
            Menampilkan {(current - 1) * pageSize + 1}–{Math.min(current * pageSize, filtered.length)} dari {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              className="btn-secondary !px-2.5 !py-1.5"
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
            >
              ‹
            </button>
            <span className="px-3 py-1 font-medium text-slate-600">{current} / {totalPages}</span>
            <button
              className="btn-secondary !px-2.5 !py-1.5"
              disabled={current === totalPages}
              onClick={() => setPage(current + 1)}
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
