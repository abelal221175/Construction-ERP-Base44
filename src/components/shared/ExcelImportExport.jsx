import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { cn } from "@/lib/utils";
import { base44 } from '@/api/base44Client';

export function ExcelExportButton({ data, columns, filename, className }) {
  const { t, isRTL } = useLanguage();
  
  const handleExport = () => {
    // Create CSV content
    const headers = columns.map(col => col.header).join(',');
    const rows = data.map(row => 
      columns.map(col => {
        const value = row[col.accessor];
        // Escape quotes and wrap in quotes if contains comma
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    );
    
    const csv = [headers, ...rows].join('\n');
    const BOM = '\uFEFF'; // UTF-8 BOM for Excel
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename || 'export'}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <Button variant="outline" onClick={handleExport} className={className}>
      <Download className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
      {t('export')}
    </Button>
  );
}

export function ExcelImportButton({ 
  onImport, 
  columns, 
  templateData,
  className 
}) {
  const { t, isRTL } = useLanguage();
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const downloadTemplate = () => {
    const headers = columns.map(col => col.header).join(',');
    const sampleRows = templateData ? templateData.map(row =>
      columns.map(col => row[col.accessor] ?? '').join(',')
    ) : [];
    
    const csv = [headers, ...sampleRows].join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'import_template.csv';
    link.click();
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setResult(null);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Parse CSV
      const response = await fetch(file_url);
      const text = await response.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        setResult({ success: false, message: 'File is empty or has only headers' });
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      const data = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const row = {};
        headers.forEach((header, index) => {
          const col = columns.find(c => c.header === header || c.accessor === header);
          if (col) {
            row[col.accessor] = values[index];
          }
        });
        if (Object.keys(row).length > 0) {
          data.push(row);
        }
      }

      const importResult = await onImport(data);
      setResult({ 
        success: true, 
        message: `Successfully imported ${data.length} records`,
        ...importResult 
      });
    } catch (error) {
      setResult({ success: false, message: error.message || 'Import failed' });
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className={className}>
        <Upload className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
        {t('import')}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              {t('import')} Excel/CSV
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="text-center p-6 border-2 border-dashed rounded-lg">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer"
              >
                <Upload className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                <p className="text-sm text-slate-600">
                  {importing ? t('loading') : 'Click to select file'}
                </p>
                <p className="text-xs text-slate-400 mt-1">CSV, XLSX, XLS</p>
              </label>
            </div>

            <Button 
              variant="outline" 
              className="w-full" 
              onClick={downloadTemplate}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>

            {result && (
              <div className={cn(
                "p-4 rounded-lg flex items-start gap-3",
                result.success ? "bg-emerald-50" : "bg-red-50"
              )}>
                {result.success ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                )}
                <div>
                  <p className={cn(
                    "text-sm font-medium",
                    result.success ? "text-emerald-700" : "text-red-700"
                  )}>
                    {result.message}
                  </p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}