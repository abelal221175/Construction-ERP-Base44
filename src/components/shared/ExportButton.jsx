import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Download } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * Reusable Excel/CSV export button that works with DataTable-style columns.
 * Columns use `accessor` (field name) and optional `render(value, row)` for display.
 *
 * @param {Array}  data      - rows to export
 * @param {Array}  columns   - DataTable column defs: { header, accessor, render?, exportable? }
 * @param {String} filename  - base filename (without extension)
 * @param {String} [sheetName] - optional sheet/tab label (used in toast only)
 */
export default function ExportButton({ data = [], columns = [], filename = 'export', disabled, className }) {
  const { language, isRTL } = useLanguage();
  const [exporting, setExporting] = useState(false);

  const handleExport = () => {
    if (!data.length) {
      toast.info(language === 'ar' ? 'لا توجد بيانات للتصدير' : 'No data to export');
      return;
    }

    setExporting(true);
    try {
      const exportCols = columns.filter(c => c.exportable !== false && c.accessor);

      // Header row
      const headers = exportCols.map(c => c.header || c.accessor);

      // Data rows — use render fn if available so exported values match what users see
      const rows = data.map(row =>
        exportCols.map(col => {
          const raw = row[col.accessor];
          let value = raw;
          if (typeof col.render === 'function') {
            try {
              value = col.render(raw, row);
              // render may return JSX/React element — extract text
              if (React.isValidElement(value)) {
                value = extractText(value);
              }
            } catch {
              value = raw;
            }
          }
          if (value === null || value === undefined) return '';
          if (typeof value === 'boolean') return value ? 'Yes' : 'No';
          return String(value);
        })
      );

      // Build CSV with UTF-8 BOM for Excel + Arabic compatibility
      const BOM = '\uFEFF';
      const csv = BOM + [
        headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','),
        ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(
        language === 'ar'
          ? `تم تصدير ${data.length} سجل بنجاح`
          : `${data.length} records exported successfully`
      );
    } catch (err) {
      toast.error(language === 'ar' ? 'فشل التصدير' : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleExport}
      disabled={disabled || exporting || !data.length}
      className={cn("h-9", className)}
    >
      <Download className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
      {exporting
        ? (language === 'ar' ? 'جاري التصدير...' : 'Exporting...')
        : (language === 'ar' ? 'تصدير Excel' : 'Export Excel')}
    </Button>
  );
}

// Recursively extract text content from React elements/JSX returned by render fns
function extractText(node) {
  if (node === null || node === undefined || node === false) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join(' ');
  if (React.isValidElement(node)) {
    const props = node.props || {};
    return extractText(props.children);
  }
  return '';
}