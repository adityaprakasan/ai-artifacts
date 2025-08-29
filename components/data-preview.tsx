import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ParsedDataset, DataSummary } from '@/lib/data-utils';

interface DataPreviewProps {
  dataset: ParsedDataset;
  summary: DataSummary;
  fileName: string;
  maxRows?: number;
  maxCols?: number;
}

export function DataPreview({ 
  dataset, 
  summary, 
  fileName, 
  maxRows = 10, 
  maxCols = 10 
}: DataPreviewProps) {
  const totalRows = summary.rowCount ?? dataset.rows.length
  const totalColumns = summary.columnCount ?? dataset.columns.length
  const isDataTruncated = totalRows > maxRows || totalColumns > maxCols;
  const displayRows = dataset.rows.slice(0, maxRows);
  const displayColumns = dataset.columns.slice(0, maxCols);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">{fileName}</CardTitle>
        <CardDescription>
          {totalRows.toLocaleString()} rows × {totalColumns} columns
          {isDataTruncated && ' (preview)'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                {displayColumns.map((column, index) => (
                  <th 
                    key={index} 
                    className="text-left p-2 font-medium text-muted-foreground bg-muted/50"
                  >
                    <div className="truncate max-w-[120px]" title={column}>
                      {column}
                    </div>
                  </th>
                ))}
                {totalColumns > maxCols && (
                  <th className="text-left p-2 font-medium text-muted-foreground bg-muted/50">
                    <div className="text-xs italic">
                      +{totalColumns - maxCols} more
                    </div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b hover:bg-muted/30">
                  {displayColumns.map((_, colIndex) => (
                    <td key={colIndex} className="p-2">
                      <div className="truncate max-w-[120px]" title={String(row[colIndex] || '')}>
                        {row[colIndex] !== undefined && row[colIndex] !== null 
                          ? String(row[colIndex]) 
                          : <span className="text-muted-foreground italic">—</span>
                        }
                      </div>
                    </td>
                  ))}
                  {totalColumns > maxCols && (
                    <td className="p-2 text-muted-foreground">
                      <div className="text-xs italic">...</div>
                    </td>
                  )}
                </tr>
              ))}
              {totalRows > maxRows && (
                <tr>
                  <td 
                    colSpan={Math.min(displayColumns.length + (totalColumns > maxCols ? 1 : 0), displayColumns.length + 1)} 
                    className="p-2 text-center text-muted-foreground text-xs italic"
                  >
                    +{totalRows - maxRows} more rows
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {Object.keys(summary.columnTypes).length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="text-xs text-muted-foreground">
              <div className="font-medium mb-2">Column Types:</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(summary.columnTypes).slice(0, 6).map(([column, type]) => (
                  <span 
                    key={column} 
                    className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-xs"
                  >
                    <span className="truncate max-w-[80px]" title={column}>
                      {column}
                    </span>
                    <span className="ml-1 text-muted-foreground">
                      ({type})
                    </span>
                  </span>
                ))}
                {Object.keys(summary.columnTypes).length > 6 && (
                  <span className="text-muted-foreground text-xs">
                    +{Object.keys(summary.columnTypes).length - 6} more
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
