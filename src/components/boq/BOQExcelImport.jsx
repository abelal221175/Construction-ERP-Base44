import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/components/shared/LanguageContext';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Upload, FileSpreadsheet, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from "sonner";

export default function BOQExcelImport({ open, onClose, projectId, onSuccess, entityType = 'ProjectBOQ' }) {
  const { language, isRTL } = useLanguage();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState([]);

  const parseCSVLine = (line) => {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  };

  const parseNumber = (value) => {
    if (value === null || value === undefined || value === '') return 0;
    const num = String(value)
      .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
      .replace(/,/g, '')
      .replace(/[^\d.-]/g, '');
    return parseFloat(num) || 0;
  };

  const findColumnIndex = (headers, searchTerms) => {
    for (const term of searchTerms) {
      const index = headers.findIndex(h => 
        String(h).toLowerCase().includes(term.toLowerCase())
      );
      if (index !== -1) return index;
    }
    return -1;
  };

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErrors([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n').filter(line => line.trim());

        if (lines.length < 2) {
          setErrors([language === 'ar' ? 'الملف فارغ' : 'File is empty']);
          return;
        }

        const headers = parseCSVLine(lines[0]);
        
        const columnMap = {
          code: findColumnIndex(headers, ['external code', 'code', 'الكود', 'كود', 'item no']),
          parentCode: findColumnIndex(headers, ['parent code', 'parent', 'الكود الأب']),
          level: findColumnIndex(headers, ['level', 'المستوى']),
          description: findColumnIndex(headers, ['description', 'الوصف', 'item description', 'وصف البند', 'item']),
          uom: findColumnIndex(headers, ['uom', 'unit', 'الوحدة', 'وحدة']),
          quantity: findColumnIndex(headers, ['quantity', 'qty', 'الكمية', 'كمية']),
          unitPrice: findColumnIndex(headers, ['unit price', 'price', 'سعر الوحدة', 'سعر']),
        };

        const parsedRows = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (!line.trim() || line.includes('===') || line.includes('تعليمات')) continue;

          const row = parseCSVLine(line);
          const getValue = (key) => columnMap[key] !== -1 ? row[columnMap[key]] : '';

          const description = String(getValue('description') || '').trim();
          if (!description) continue;

          const code = String(getValue('code') || '').trim();
          const quantity = parseNumber(getValue('quantity'));
          const unitPrice = parseNumber(getValue('unitPrice'));
          const uom = String(getValue('uom') || '').trim();

          let level = parseInt(getValue('level')) || 3;
          if (!getValue('level') && code) {
            const dots = (code.match(/\./g) || []).length;
            level = dots === 0 ? 1 : dots === 1 ? 2 : 3;
          }

          parsedRows.push({
            rowNum: i + 1,
            code,
            parentCode: String(getValue('parentCode') || '').trim(),
            level,
            description,
            uom,
            quantity,
            unitPrice,
            total: quantity * unitPrice,
          });
        }

        setPreview(parsedRows.slice(0, 20));
        
        if (parsedRows.length === 0) {
          setErrors([language === 'ar' ? 'لم يتم العثور على بيانات' : 'No valid data found']);
        }
      } catch (err) {
        setErrors([language === 'ar' ? 'خطأ في قراءة الملف' : 'Error reading file']);
      }
    };
    reader.readAsText(selectedFile, 'UTF-8');
  };

  const handleImport = async () => {
    if (!file || preview.length === 0) return;

    setImporting(true);
    setProgress(0);
    setErrors([]);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        const headers = parseCSVLine(lines[0]);
        
        const columnMap = {
          code: findColumnIndex(headers, ['external code', 'code', 'الكود', 'كود', 'item no']),
          parentCode: findColumnIndex(headers, ['parent code', 'parent', 'الكود الأب']),
          level: findColumnIndex(headers, ['level', 'المستوى']),
          description: findColumnIndex(headers, ['description', 'الوصف', 'item description', 'وصف البند', 'item']),
          uom: findColumnIndex(headers, ['uom', 'unit', 'الوحدة', 'وحدة']),
          quantity: findColumnIndex(headers, ['quantity', 'qty', 'الكمية', 'كمية']),
          unitPrice: findColumnIndex(headers, ['unit price', 'price', 'سعر الوحدة', 'سعر']),
        };

        const codeToIdMap = {};
        let imported = 0;
        const importErrors = [];
        const dataRows = lines.slice(1).filter(l => l.trim() && !l.includes('===') && !l.includes('تعليمات'));

        for (let i = 0; i < dataRows.length; i++) {
          setProgress(Math.round((i / dataRows.length) * 100));

          const row = parseCSVLine(dataRows[i]);
          const getValue = (key) => columnMap[key] !== -1 ? row[columnMap[key]] : '';

          const description = String(getValue('description') || '').trim();
          if (!description) continue;

          const code = String(getValue('code') || '').trim();
          const parentCode = String(getValue('parentCode') || '').trim();
          const quantity = parseNumber(getValue('quantity'));
          const unitPrice = parseNumber(getValue('unitPrice'));
          const uom = String(getValue('uom') || '').trim();

          let level = parseInt(getValue('level')) || 3;
          if (!getValue('level') && code) {
            const dots = (code.match(/\./g) || []).length;
            level = dots === 0 ? 1 : dots === 1 ? 2 : 3;
          }

          let parentBoqId = null;
          if (parentCode && codeToIdMap[parentCode]) {
            parentBoqId = codeToIdMap[parentCode];
          } else if (code && level > 1) {
            const parts = code.split('.');
            if (parts.length > 1) {
              const inferredParentCode = parts.slice(0, -1).join('.');
              if (codeToIdMap[inferredParentCode]) {
                parentBoqId = codeToIdMap[inferredParentCode];
              }
            }
          }

          const itemData = {
            [entityType === 'TenderBOQ' ? 'tender_id' : 'project_id']: projectId,
            parent_boq_id: parentBoqId,
            level,
            system_code: code || `BOQ-${Date.now()}-${i}`,
            external_code: code,
            item_description: description,
            quantity: level === 3 ? quantity : null,
            uom: level === 3 ? uom : null,
            unit_price: level === 3 ? unitPrice : null,
            total_amount: level === 3 ? (quantity * unitPrice) : null,
            has_cost_breakdown: false,
            sort_order: i + 1
          };

          try {
            const Entity = entityType === 'TenderBOQ' ? base44.entities.TenderBOQ : base44.entities.ProjectBOQ;
            const created = await Entity.create(itemData);
            if (code) codeToIdMap[code] = created.id;
            imported++;
          } catch (err) {
            importErrors.push(`Row ${i + 2}: ${err.message}`);
          }
        }

        setProgress(100);
        setErrors(importErrors);

        if (importErrors.length > 0) {
          toast.warning(`${imported} items imported with ${importErrors.length} errors`);
        } else {
          toast.success(`${imported} items imported successfully`);
        }

        if (imported > 0) {
          onSuccess();
          onClose();
        }
      } catch (err) {
        setErrors([language === 'ar' ? 'خطأ في الاستيراد' : 'Import error']);
      } finally {
        setImporting(false);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleDownloadTemplate = () => {
    const headers = ['External Code', 'Parent Code', 'Level', 'Item Description', 'UOM', 'Quantity', 'Unit Price'];
    const rows = [
      ['1', '', '1', 'الاعمال الاعتيادية - CIVIL WORKS', '', '', ''],
      ['1.1', '1', '2', 'اعمال الفك والشراء - Demolition Works', '', '', ''],
      ['1.1.1', '1.1', '3', 'فك وشراء رخام الأرضيات - Marble demolition', 'م²', '150', '85'],
      ['1.1.2', '1.1', '3', 'تكسير وإزالة سيراميك - Ceramic removal', 'م²', '200', '45'],
      ['2', '', '1', 'أعمال التشطيبات - FINISHING WORKS', '', '', ''],
      ['2.1', '2', '2', 'أعمال الدهانات - Painting', '', '', ''],
      ['2.1.1', '2.1', '3', 'دهان بلاستيك 3 أوجه - Plastic paint', 'م²', '800', '65'],
    ];

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(c => `"${c}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'BOQ_Import_Template.csv';
    link.click();
    URL.revokeObjectURL(url);
    toast.success(language === 'ar' ? 'تم تحميل القالب' : 'Template downloaded');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle>
            {language === 'ar' ? 'استيراد جدول الكميات' : 'Import BOQ'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="flex-1">
              <Upload className="h-4 w-4 mr-2" />
              {file ? file.name : (language === 'ar' ? 'اختر ملف CSV' : 'Select CSV File')}
            </Button>
            <Button variant="outline" onClick={handleDownloadTemplate}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              {language === 'ar' ? 'تحميل القالب' : 'Download Template'}
            </Button>
          </div>

          {preview.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-slate-100 p-2 text-sm font-medium">
                {language === 'ar' ? `معاينة (${preview.length} صف)` : `Preview (${preview.length} rows)`}
              </div>
              <div className="overflow-x-auto max-h-64">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-2">{language === 'ar' ? 'الكود' : 'Code'}</th>
                      <th className="p-2">{language === 'ar' ? 'المستوى' : 'Level'}</th>
                      <th className="p-2">{language === 'ar' ? 'الوصف' : 'Description'}</th>
                      <th className="p-2">{language === 'ar' ? 'الوحدة' : 'UOM'}</th>
                      <th className="p-2">{language === 'ar' ? 'الكمية' : 'Qty'}</th>
                      <th className="p-2">{language === 'ar' ? 'السعر' : 'Price'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2">{row.code}</td>
                        <td className="p-2 text-center">
                          <span className={`inline-block w-2 h-2 rounded-full ${row.level === 1 ? 'bg-red-500' : row.level === 2 ? 'bg-amber-500' : 'bg-green-500'}`} />
                        </td>
                        <td className="p-2 max-w-xs truncate">{row.description}</td>
                        <td className="p-2 text-center">{row.uom}</td>
                        <td className="p-2 text-center">{row.quantity || '-'}</td>
                        <td className="p-2 text-center">{row.unitPrice || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {importing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{language === 'ar' ? 'جاري الاستيراد...' : 'Importing...'}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                <AlertCircle className="h-4 w-4" />
                {language === 'ar' ? 'أخطاء' : 'Errors'}
              </div>
              <ul className="text-sm text-red-600 max-h-32 overflow-y-auto">
                {errors.slice(0, 10).map((err, idx) => <li key={idx}>{err}</li>)}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={importing}>
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={handleImport} disabled={!file || preview.length === 0 || importing} className="bg-blue-600 hover:bg-blue-700">
            {importing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {language === 'ar' ? `استيراد ${preview.length} بند` : `Import ${preview.length} Items`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}