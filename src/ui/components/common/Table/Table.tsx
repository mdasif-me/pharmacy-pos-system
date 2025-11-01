import React from 'react'
import './Table.css'

export interface Column<T> {
  key: string
  header: string
  render: (item: T) => React.ReactNode
  width?: string
}

export interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (item: T) => string | number
  emptyMessage?: string
  isLoading?: boolean
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'No data available',
  isLoading = false,
}: TableProps<T>) {
  if (isLoading) {
    return (
      <div className="table-loading">
        <div className="table-spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="table-empty">
        <p>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="table-container">
      <div className="table-scroll-wrapper">
        <table className="data-table">
          <thead className="data-table-header">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="data-table-th" style={{ width: column.width }}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="data-table-body">
            {data.map((item) => (
              <tr key={keyExtractor(item)} className="data-table-row">
                {columns.map((column) => (
                  <td key={column.key} className="data-table-td">
                    {column.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
