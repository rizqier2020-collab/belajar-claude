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
        <div className="mb-3 flex items-center gap-2">
          <input
            className="input max-w-xs"
            placeholder="Cari..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
          />
          {actions}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`px-4 py-3 font-semibold ${c.sortable ? 'cursor-pointer select-none' : ''}`}
                  onClick={c.sortable ? () => toggleSort(c.key) : undefined}
                >
                  {c.header}
                  {c.sortable && sortKey === c.key && (
                    <span className="ml-1">{sortDir === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageRows.map((row, i) => (
              <tr key={row.id ?? i} className="hover:bg-gray-50">
                {columns.map((c) => (
                  <td key={c.key} className="px-4 py-3 align-middle text-gray-700">
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
        <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
          <span>
            Menampilkan {(current - 1) * pageSize + 1}–{Math.min(current * pageSize, filtered.length)} dari {filtered.length}
          </span>
          <div className="flex gap-1">
            <button
              className="btn-secondary !py-1 !px-2"
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
            >
              ‹
            </button>
            <span className="px-2 py-1">{current} / {totalPages}</span>
            <button
              className="btn-secondary !py-1 !px-2"
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
