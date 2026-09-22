import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Download, Upload, FileSpreadsheet } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { cn } from "@/lib/utils";
import ImportDialog from './ImportDialog';
import { exportToExcel, generateTemplate } from './ExcelUtils';

export default function ImportExportActions({
  entityName,
  moduleName,
  data = [],
  columns = [],
  onImportComplete,
  disabled = false
}) {
  const { language, isRTL } = useLanguage();
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!data || data.length === 0) {
      return;
    }
    setIsExporting(true);
    try {
      await exportToExcel(data, columns, entityName, language);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    generateTemplate(columns, entityName, language);
  };

  return (
    <>
      <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadTemplate}
          disabled={disabled}
          className="h-8"
        >
          <FileSpreadsheet className={cn("h-4 w-4", isRTL ? "ml-1" : "mr-1")} />
          {language === 'ar' ? 'تحميل القالب' : 'Template'}
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowImportDialog(true)}
          disabled={disabled}
          className="h-8"
        >
          <Upload className={cn("h-4 w-4", isRTL ? "ml-1" : "mr-1")} />
          {language === 'ar' ? 'استيراد' : 'Import'}
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={disabled || isExporting || !data?.length}
          className="h-8"
        >
          <Download className={cn("h-4 w-4", isRTL ? "ml-1" : "mr-1")} />
          {language === 'ar' ? 'تصدير' : 'Export'}
        </Button>
      </div>

      <ImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        entityName={entityName}
        moduleName={moduleName}
        columns={columns}
        onImportComplete={onImportComplete}
      />
    </>
  );
}