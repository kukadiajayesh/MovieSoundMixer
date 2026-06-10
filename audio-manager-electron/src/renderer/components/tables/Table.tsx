import React from 'react'

export interface TableProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export const Table: React.FC<TableProps> = ({ children, className = '', style }) => {
  return (
    <div className="table-container" style={style}>
      <table className={`custom-table ${className}`}>{children}</table>
    </div>
  )
}

export const TableHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return <thead className={className}>{children}</thead>
}

export const TableBody: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return <tbody className={className}>{children}</tbody>
}

interface TableRowProps {
  children: React.ReactNode
  className?: string
  selected?: boolean
  onClick?: () => void
  style?: React.CSSProperties
}

export const TableRow: React.FC<TableRowProps> = ({
  children,
  className = '',
  selected = false,
  onClick,
  style,
}) => {
  const rowClass = `${selected ? 'row-selected' : ''} ${className}`.trim()
  return (
    <tr
      className={rowClass}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default', ...style }}
    >
      {children}
    </tr>
  )
}

interface TableCellProps {
  children?: React.ReactNode
  className?: string
  isHeader?: boolean
  style?: React.CSSProperties
  colSpan?: number
}

export const TableCell: React.FC<TableCellProps> = ({
  children,
  className = '',
  isHeader = false,
  style,
  colSpan,
}) => {
  if (isHeader) {
    return (
      <th className={className} style={style} colSpan={colSpan}>
        {children}
      </th>
    )
  }
  return (
    <td className={className} style={style} colSpan={colSpan}>
      {children}
    </td>
  )
}
