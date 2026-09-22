import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/components/shared/LanguageContext.jsx';
import { useCompany } from '@/components/shared/CompanyContext.jsx';
import { formatNumber, formatCurrency, formatDate, getStatusColor } from '@/components/shared/formatters';
import { cn } from "@/lib/utils";
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import FormModal from '@/components/shared/FormModal';
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from 'lucide-react';
import { toast } from "sonner";

const initialFormData = {
  entry_number: '',
  entry_date: new Date().toISOString().split('T')[0],
  description: '',
  status: 'draft',
  lines: [{ account_id: '', description: '', debit_amount: 0, credit_amount: 0 }]
};

export default function JournalEntries() {
  const { language, t, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(initialFormData);

  const companyFilter = currentCompany ? { company_id: currentCompany.id } : {};

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['journalEntries', currentCompany?.id],
    queryFn: () => currentCompany ? base44.entities.JournalEntry.filter(companyFilter) : base44.entities.JournalEntry.list(),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['glAccounts', currentCompany?.id],
    queryFn: () => currentCompany ? base44.entities.GLAccount.filter(companyFilter) : base44.entities.GLAccount.list(),
  });

  const postableAccounts = accounts.filter(a => a.allow_posting);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const entry = await base44.entities.JournalEntry.create({
        company_id: currentCompany?.id,
        entry_number: data.entry_number,
        entry_date: data.entry_date,
        description: data.description,
        status: data.status,
        total_debit: data.lines.reduce((sum, l) => sum + (parseFloat(l.debit_amount) || 0), 0),
        total_credit: data.lines.reduce((sum, l) => sum + (parseFloat(l.credit_amount) || 0), 0),
      });
      // Create lines
      for (let i = 0; i < data.lines.length; i++) {
        const line = data.lines[i];
        if (line.account_id) {
          await base44.entities.JournalEntryLine.create({
            entry_id: entry.id,
            line_no: i + 1,
            account_id: line.account_id,
            description: line.description,
            debit_amount: parseFloat(line.debit_amount) || 0,
            credit_amount: parseFloat(line.credit_amount) || 0,
          });
        }
      }
      return entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
      setShowModal(false);
      toast.success(language === 'ar' ? 'تم إنشاء القيد بنجاح' : 'Entry created successfully');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.JournalEntry.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
      setShowDelete(false);
      toast.success(language === 'ar' ? 'تم حذف القيد بنجاح' : 'Entry deleted successfully');
    },
  });

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({ ...initialFormData, entry_number: `JE-${Date.now().toString().slice(-6)}` });
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      entry_number: item.entry_number || '',
      entry_date: item.entry_date || '',
      description: item.description || '',
      status: item.status || 'draft',
      lines: [{ account_id: '', description: '', debit_amount: 0, credit_amount: 0 }]
    });
    setShowModal(true);
  };

  const handleDelete = (item) => {
    setEditingItem(item);
    setShowDelete(true);
  };

  const handleSave = () => {
    const totalDebit = formData.lines.reduce((sum, l) => sum + (parseFloat(l.debit_amount) || 0), 0);
    const totalCredit = formData.lines.reduce((sum, l) => sum + (parseFloat(l.credit_amount) || 0), 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      toast.error(language === 'ar' ? 'القيد غير متوازن' : 'Entry is not balanced');
      return;
    }

    createMutation.mutate(formData);
  };

  const addLine = () => {
    setFormData({
      ...formData,
      lines: [...formData.lines, { account_id: '', description: '', debit_amount: 0, credit_amount: 0 }]
    });
  };

  const removeLine = (index) => {
    setFormData({
      ...formData,
      lines: formData.lines.filter((_, i) => i !== index)
    });
  };

  const updateLine = (index, field, value) => {
    const newLines = [...formData.lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setFormData({ ...formData, lines: newLines });
  };

  const totalDebit = formData.lines.reduce((sum, l) => sum + (parseFloat(l.debit_amount) || 0), 0);
  const totalCredit = formData.lines.reduce((sum, l) => sum + (parseFloat(l.credit_amount) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const statusLabels = {
    draft: { ar: 'مسودة', en: 'Draft' },
    posted: { ar: 'مرحل', en: 'Posted' },
    reversed: { ar: 'ملغي', en: 'Reversed' },
  };

  const columns = [
    {
      header: language === 'ar' ? 'رقم القيد' : 'Entry No.',
      accessor: 'entry_number',
      render: (value, row) => (
        <Link to={createPageUrl('JournalEntryDetails') + `?id=${row.id}`} className="text-blue-600 hover:underline font-medium">
          {value}
        </Link>
      )
    },
    {
      header: language === 'ar' ? 'التاريخ' : 'Date',
      accessor: 'entry_date',
      render: (value) => formatDate(value)
    },
    {
      header: language === 'ar' ? 'الوصف' : 'Description',
      accessor: 'description',
    },
    {
      header: language === 'ar' ? 'مدين' : 'Debit',
      accessor: 'total_debit',
      render: (value) => formatCurrency(value)
    },
    {
      header: language === 'ar' ? 'دائن' : 'Credit',
      accessor: 'total_credit',
      render: (value) => formatCurrency(value)
    },
    {
      header: language === 'ar' ? 'الحالة' : 'Status',
      accessor: 'status',
      render: (value) => (
        <Badge className={getStatusColor(value)}>
          {statusLabels[value]?.[language] || value}
        </Badge>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={language === 'ar' ? 'قيود اليومية' : 'Journal Entries'}
        subtitle={language === 'ar' ? 'إدارة القيود المحاسبية' : 'Manage accounting entries'}
        onAdd={handleAdd}
        addLabel={language === 'ar' ? 'قيد جديد' : 'New Entry'}
      />

      <DataTable
        data={entries}
        columns={columns}
        isLoading={isLoading}
        searchable
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <FormModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingItem ? (language === 'ar' ? 'تعديل قيد' : 'Edit Entry') : (language === 'ar' ? 'قيد جديد' : 'New Entry')}
        onSave={handleSave}
        isSaving={createMutation.isPending}
        size="xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'رقم القيد' : 'Entry Number'}</Label>
              <Input
                value={formData.entry_number}
                onChange={(e) => setFormData({ ...formData, entry_number: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'التاريخ' : 'Date'}</Label>
              <Input
                type="date"
                value={formData.entry_date}
                onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الحالة' : 'Status'}</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label[language]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الوصف' : 'Description'}</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
              <Label>{language === 'ar' ? 'البنود' : 'Lines'}</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                <Plus className="h-4 w-4 mr-1" />
                {language === 'ar' ? 'إضافة بند' : 'Add Line'}
              </Button>
            </div>
            
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-2 text-right">{language === 'ar' ? 'الحساب' : 'Account'}</th>
                    <th className="p-2 text-right">{language === 'ar' ? 'البيان' : 'Description'}</th>
                    <th className="p-2 text-right">{language === 'ar' ? 'مدين' : 'Debit'}</th>
                    <th className="p-2 text-right">{language === 'ar' ? 'دائن' : 'Credit'}</th>
                    <th className="p-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.lines.map((line, index) => (
                    <tr key={index} className="border-t">
                      <td className="p-2">
                        <Select value={line.account_id} onValueChange={(v) => updateLine(index, 'account_id', v)}>
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder={language === 'ar' ? 'اختر حساب' : 'Select Account'} />
                          </SelectTrigger>
                          <SelectContent>
                            {postableAccounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.account_code} - {language === 'ar' ? account.account_name_ar : account.account_name_en}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2">
                        <Input
                          className="h-8"
                          value={line.description}
                          onChange={(e) => updateLine(index, 'description', e.target.value)}
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          className="h-8"
                          value={line.debit_amount}
                          onChange={(e) => updateLine(index, 'debit_amount', e.target.value)}
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          className="h-8"
                          value={line.credit_amount}
                          onChange={(e) => updateLine(index, 'credit_amount', e.target.value)}
                        />
                      </td>
                      <td className="p-2">
                        {formData.lines.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500"
                            onClick={() => removeLine(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-medium">
                  <tr className="border-t">
                    <td colSpan="2" className="p-2 text-right">{language === 'ar' ? 'الإجمالي' : 'Total'}</td>
                    <td className="p-2">{formatNumber(totalDebit)}</td>
                    <td className="p-2">{formatNumber(totalCredit)}</td>
                    <td className="p-2">
                      {isBalanced ? (
                        <Badge className="bg-green-100 text-green-700">✓</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700">✗</Badge>
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </FormModal>

      <DeleteConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={() => deleteMutation.mutate(editingItem?.id)}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}