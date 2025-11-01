// Table component - reusable data table

import React from 'react'
import './Table.css'

export interface TableColumn<T> {
  key: string
  header: string
  render?: (item: T) => React.ReactNode
  width?: string
  align?: 'left' | 'center' | 'right'
}

export interface TableProps<T> {
  data: T[]
  columns: TableColumn<T>[]
  onRowClick?: (item: T) => void
  isLoading?: boolean
  emptyMessage?: string
  keyExtractor?: (item: T, index: number) => string | number
}

export function Table<T>({
  data,
  columns,
  onRowClick,
  isLoading = false,
  emptyMessage = 'No data available',
  keyExtractor = (_, index) => index,
}: TableProps<T>) {
  if (isLoading) {
    return (
      <div className="table-loading">
        <div className="table-spinner">Loading...</div>
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
    <div className="table-wrapper">
      <table className="table">
        <thead className="table-head">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`table-header table-align-${column.align || 'left'}`}
                style={{ width: column.width }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="table-body">
          {data.map((item, index) => {
            const key = keyExtractor(item, index)
            return (
              <tr
                key={key}
                className={`table-row ${onRowClick ? 'table-row-clickable' : ''}`}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`table-cell table-align-${column.align || 'left'}`}
                  >
                    {column.render ? column.render(item) : String((item as any)[column.key] ?? '')}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
