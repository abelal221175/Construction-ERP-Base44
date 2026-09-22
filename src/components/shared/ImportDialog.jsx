import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { useCompany } from './CompanyContext';
import { base44 } from '@/api/base44Client';
import { parseCSV, validateImportData } from './ExcelUtils';
import { cn } from "@/lib/utils";

export default function ImportDialog({
  open,
  onOpenChange,
  entityName,
  moduleName,
  columns,
  onImportComplete
}) {
  const { language, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const fileInputRef = useRef(null);
  
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setProgress(0);
    setResult(null);

    try {
      // Read file
      const text = await file.text();
      const data = parseCSV(text);
      
      if (data.length < 2) {
        setResult({
          status: 'error',
          message: language === 'ar' ? 'الملف فارغ أو غير صالح' : 'File is empty or invalid'
        });
        setImporting(false);
        return;
      }

      // Validate data
      const { validRows, errors } = validateImportData(data, columns, language);
      
      setProgress(30);

      // Import valid rows
      let successCount = 0;
      let errorCount = errors.length;
      const importErrors = [...errors];

      const entity = base44.entities[entityName];
      if (!entity) {
        setResult({
          status: 'error',
          message: language === 'ar' ? 'الكيان غير موجود' : 'Entity not found'
        });
        setImporting(false);
        return;
      }

      for (let i = 0; i < validRows.length; i++) {
        try {
          const rowData = { ...validRows[i] };
          
          // Add company_id if entity has it and company is selected
          if (currentCompany?.id && columns.some(c => c.accessorKey === 'company_id')) {
            rowData.company_id = currentCompany.id;
          }

          await entity.create(rowData);
          successCount++;
        } catch (err) {
          errorCount++;
          importErrors.push({
            row: i + 2,
            errors: [err.message || 'Unknown error'],
            data: validRows[i]
          });
        }
        
        setProgress(30 + ((i + 1) / validRows.length) * 70);
      }

      // Log the import
      try {
        await base44.entities.ImportExportLog.create({
          company_id: currentCompany?.id,
          operation_type: 'import',
          module_name: moduleName,
          table_name: entityName,
          file_name: file.name,
          total_records: validRows.length + errors.length,
          success_count: successCount,
          error_count: errorCount,
          status: errorCount === 0 ? 'completed' : 'completed_with_errors',
          error_details: JSON.stringify(importErrors),
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString()
        });
      } catch (e) {
        console.log('Could not log import:', e);
      }

      setResult({
        status: errorCount === 0 ? 'success' : 'warning',
        successCount,
        errorCount,
        errors: importErrors
      });

      if (successCount > 0 && onImportComplete) {
        onImportComplete();
      }

    } catch (err) {
      setResult({
        status: 'error',
        message: err.message || (language === 'ar' ? 'حدث خطأ أثناء الاستيراد' : 'Import failed')
      });
    } finally {
      setImporting(false);
      setProgress(100);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    setProgress(0);
    onOpenChange(false);
  };

  const downloadErrorReport = () => {
    if (!result?.errors?.length) return;

    const headers = ['Row', 'Errors', 'Original Data'];
    const rows = result.errors.map(err => [
      err.row,
      err.errors.join('; '),
      Array.isArray(err.data) ? err.data.join(', ') : JSON.stringify(err.data)
    ]);

    const BOM = '\uFEFF';
    const csvContent = BOM + [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${entityName}_ImportErrors_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle>
            {language === 'ar' ? `استيراد ${entityName}` : `Import ${entityName}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload */}
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors",
              file ? "border-green-400 bg-green-50" : "border-slate-300"
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <FileSpreadsheet className="h-8 w-8 text-green-600" />
                <span className="text-green-700 font-medium">{file.name}</span>
              </div>
            ) : (
              <div>
                <Upload className="h-12 w-12 mx-auto text-slate-400 mb-2" />
                <p className="text-slate-600">
                  {language === 'ar' ? 'اضغط لاختيار ملف CSV' : 'Click to select a CSV file'}
                </p>
              </div>
            )}
          </div>

          {/* Progress */}
          {importing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-slate-500 text-center">
                {language === 'ar' ? 'جاري الاستيراد...' : 'Importing...'}
              </p>
            </div>
          )}

          {/* Result */}
          {result && (
            <Alert variant={result.status === 'success' ? 'default' : result.status === 'error' ? 'destructive' : 'default'}>
              <div className="flex items-start gap-2">
                {result.status === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
                {result.status === 'error' && <XCircle className="h-5 w-5 text-red-600" />}
                {result.status === 'warning' && <AlertTriangle className="h-5 w-5 text-amber-600" />}
                <AlertDescription>
                  {result.message || (
                    <div>
                      <p>
                        {language === 'ar' 
                          ? `تم استيراد ${result.successCount} سجل بنجاح`
                          : `Successfully imported ${result.successCount} records`}
                      </p>
                      {result.errorCount > 0 && (
                        <p className="text-red-600">
                          {language === 'ar'
                            ? `فشل استيراد ${result.errorCount} سجل`
                            : `Failed to import ${result.errorCount} records`}
                        </p>
                      )}
                    </div>
                  )}
                </AlertDescription>
              </div>
            </Alert>
          )}

          {/* Error Report Download */}
          {result?.errors?.length > 0 && (
            <Button variant="outline" onClick={downloadErrorReport} className="w-full">
              {language === 'ar' ? 'تحميل تقرير الأخطاء' : 'Download Error Report'}
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {language === 'ar' ? 'إغلاق' : 'Close'}
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!file || importing}
          >
            {importing 
              ? (language === 'ar' ? 'جاري الاستيراد...' : 'Importing...') 
              : (language === 'ar' ? 'استيراد' : 'Import')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}