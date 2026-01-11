import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { formatMontant } from '@/components/utils/formatMontant.jsx';

const COLUMNS = [
  { key: 'copies', label: 'COPIES', type: 'number' },
  { key: 'marchandises', label: 'MARCHANDISES', type: 'number' },
  { key: 'scan', label: 'SCAN', type: 'number' },
  { key: 'tirage_saisies', label: 'TIRAGE / SAISIES', type: 'number' },
  { key: 'badges_plastification', label: 'BADGES / PLASTIFICATION', type: 'number' },
  { key: 'demi_photos', label: 'DEMI-PHOTOS', type: 'number' },
  { key: 'maintenance', label: 'MAINTENANCE', type: 'number' },
  { key: 'imprimerie', label: 'IMPRIMERIE', type: 'number' },
  { key: 'sorties', label: 'SORTIES', type: 'number', danger: true },
  { key: 'description', label: 'DESCRIPTION', type: 'text' }
];

export default function SpreadsheetGrid({ rows, onChange, readOnly = false }) {
  const [focusedCell, setFocusedCell] = useState(null);
  const inputRefs = useRef({});

  const handleCellChange = (rowIndex, columnKey, value) => {
    if (readOnly) return;

    const newRows = [...rows];
    if (COLUMNS.find(c => c.key === columnKey)?.type === 'number') {
      const numValue = value === '' ? 0 : parseFloat(value.replace(/\s/g, '')) || 0;
      newRows[rowIndex] = { ...newRows[rowIndex], [columnKey]: Math.max(0, numValue) };
    } else {
      newRows[rowIndex] = { ...newRows[rowIndex], [columnKey]: value };
    }
    onChange(newRows);
  };

  const handleKeyDown = (e, rowIndex, colIndex) => {
    const totalCols = COLUMNS.length;
    const totalRows = rows.length;

    if (e.key === 'Enter') {
      e.preventDefault();
      if (rowIndex < totalRows - 1) {
        setFocusedCell({ row: rowIndex + 1, col: colIndex });
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        // Shift+Tab: précédent
        if (colIndex > 0) {
          setFocusedCell({ row: rowIndex, col: colIndex - 1 });
        } else if (rowIndex > 0) {
          setFocusedCell({ row: rowIndex - 1, col: totalCols - 1 });
        }
      } else {
        // Tab: suivant
        if (colIndex < totalCols - 1) {
          setFocusedCell({ row: rowIndex, col: colIndex + 1 });
        } else if (rowIndex < totalRows - 1) {
          setFocusedCell({ row: rowIndex + 1, col: 0 });
        }
      }
    } else if (e.key === 'ArrowDown' && rowIndex < totalRows - 1) {
      e.preventDefault();
      setFocusedCell({ row: rowIndex + 1, col: colIndex });
    } else if (e.key === 'ArrowUp' && rowIndex > 0) {
      e.preventDefault();
      setFocusedCell({ row: rowIndex - 1, col: colIndex });
    } else if (e.key === 'ArrowRight' && colIndex < totalCols - 1) {
      e.preventDefault();
      setFocusedCell({ row: rowIndex, col: colIndex + 1 });
    } else if (e.key === 'ArrowLeft' && colIndex > 0) {
      e.preventDefault();
      setFocusedCell({ row: rowIndex, col: colIndex - 1 });
    }
  };

  useEffect(() => {
    if (focusedCell) {
      const key = `${focusedCell.row}-${focusedCell.col}`;
      if (inputRefs.current[key]) {
        inputRefs.current[key].focus();
        inputRefs.current[key].select();
      }
    }
  }, [focusedCell]);

  const calculateColumnTotal = (columnKey) => {
    return rows.reduce((sum, row) => sum + (parseFloat(row[columnKey]) || 0), 0);
  };

  const totalEntrees = COLUMNS.filter(c => c.type === 'number' && c.key !== 'sorties')
    .reduce((sum, col) => sum + calculateColumnTotal(col.key), 0);

  const totalSorties = calculateColumnTotal('sorties');

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-blue-600 text-white">
              <th className="border border-slate-300 px-2 py-3 text-xs font-semibold w-12">#</th>
              {COLUMNS.map(col => (
                <th 
                  key={col.key} 
                  className={`border border-slate-300 px-2 py-3 text-xs font-semibold min-w-[120px] ${
                    col.danger ? 'bg-red-600' : ''
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="border border-slate-300 px-2 py-1 text-center text-xs font-medium text-slate-500">
                  {rowIndex + 1}
                </td>
                {COLUMNS.map((col, colIndex) => (
                  <td key={col.key} className="border border-slate-300 p-0">
                    <Input
                      ref={(el) => inputRefs.current[`${rowIndex}-${colIndex}`] = el}
                      type={col.type === 'number' ? 'text' : 'text'}
                      value={
                        col.type === 'number' 
                          ? (row[col.key] === 0 || row[col.key] === '' ? '' : formatMontant(row[col.key]).replace(' F', ''))
                          : (row[col.key] || '')
                      }
                      onChange={(e) => handleCellChange(rowIndex, col.key, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                      onFocus={() => setFocusedCell({ row: rowIndex, col: colIndex })}
                      disabled={readOnly}
                      className="border-0 rounded-none h-9 text-sm focus:ring-2 focus:ring-blue-500 focus:z-10"
                      placeholder={col.type === 'number' ? '0' : ''}
                    />
                  </td>
                ))}
              </tr>
            ))}
            <tr className="bg-slate-200 font-bold">
              <td className="border border-slate-300 px-2 py-2 text-center text-sm">
                TOTAL
              </td>
              {COLUMNS.map(col => (
                <td key={col.key} className="border border-slate-300 px-2 py-2 text-sm text-center">
                  {col.type === 'number' ? `${formatMontant(calculateColumnTotal(col.key))} F` : ''}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="p-4 bg-slate-100 border-t flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900">
            Total entrées: <span className="text-emerald-600">{formatMontant(totalEntrees)} XAF</span>
          </p>
          <p className="text-sm font-semibold text-slate-900">
            Total sorties: <span className="text-red-600">{formatMontant(totalSorties)} XAF</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Caisse journée</p>
          <p className="text-2xl font-bold text-blue-600">
            {formatMontant(totalEntrees - totalSorties)} XAF
          </p>
        </div>
      </div>
    </div>
  );
}