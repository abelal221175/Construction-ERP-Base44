import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/components/shared/LanguageContext';
import { useCompany } from '@/components/shared/CompanyContext';
import PageHeader from '@/components/shared/PageHeader';
import FormModal from '@/components/shared/FormModal';
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog';
import ImportExportActions from '@/components/shared/ImportExportActions';
import { formatCurrency } from '@/components/shared/formatters';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const MODULE_NAME = 'MODULE 03';
const ENTITY_NAME = 'GLAccount';

const accountTypes = [
  { value: 'Assets', label_ar: 'الأصول', label_en: 'Assets', color: 'bg-blue-100 text-blue-700' },
  { value: 'Liabilities', label_ar: 'الخصوم', label_en: 'Liabilities', color: 'bg-red-100 text-red-700' },
  { value: 'Equity', label_ar: 'حقوق الملكية', label_en: 'Equity', color: 'bg-purple-100 text-purple-700' },
  { value: 'Revenue', label_ar: 'الإيرادات', label_en: 'Revenue', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'Expenses', label_ar: 'المصروفات', label_en: 'Expenses', color: 'bg-amber-100 text-amber-700' },
];

const initialFormData = {
  account_code: '',
  account_name_ar: '',
  account_name_en: '',
  parent_account_id: '',
  account_level: 1,
  account_type: 'Assets',
  account_group: '',
  is_project_related: false,
  is_cost_center_required: false,
  is_ar: false,
  is_ap: false,
  is_retention: false,
  is_vat: false,
  allow_posting: false,
  opening_balance_debit: 0,
  opening_balance_credit: 0,
  is_active: true,
};

export default function ChartOfAccounts() {
  const { t, language, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedAccounts, setExpandedAccounts] = useState(new Set());

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['glAccounts', currentCompany?.id],
    queryFn: () => currentCompany 
      ? base44.entities.GLAccount.filter({ company_id: currentCompany.id }, 'account_code')
      : base44.entities.GLAccount.list('-account_code'),
  });

  // Build tree structure
  const accountTree = useMemo(() => {
    const rootAccounts = accounts.filter(a => !a.parent_account_id);
    
    const buildTree = (parentId) => {
      return accounts
        .filter(a => a.parent_account_id === parentId)
        .sort((a, b) => a.account_code.localeCompare(b.account_code))
        .map(account => ({
          ...account,
          children: buildTree(account.id),
        }));
    };

    return rootAccounts
      .sort((a, b) => a.account_code.localeCompare(b.account_code))
      .map(account => ({
        ...account,
        children: buildTree(account.id),
      }));
  }, [accounts]);

  // Filter tree based on search
  const filterTree = (tree, term) => {
    if (!term) return tree;
    
    return tree.filter(node => {
      const matches = 
        node.account_code.toLowerCase().includes(term.toLowerCase()) ||
        node.account_name_ar.includes(term) ||
        node.account_name_en.toLowerCase().includes(term.toLowerCase());
      
      const childMatches = node.children && filterTree(node.children, term).length > 0;
      
      return matches || childMatches;
    }).map(node => ({
      ...node,
      children: filterTree(node.children || [], term),
    }));
  };

  const filteredTree = filterTree(accountTree, searchTerm);

  const exportColumns = [
    { accessorKey: 'account_code', header: language === 'ar' ? 'الكود' : 'Code', headerAr: 'الكود', required: true },
    { accessorKey: 'account_name_ar', header: language === 'ar' ? 'الاسم بالعربية' : 'Name (AR)', headerAr: 'الاسم بالعربية', required: true },
    { accessorKey: 'account_name_en', header: language === 'ar' ? 'الاسم بالإنجليزية' : 'Name (EN)', headerAr: 'الاسم بالإنجليزية', required: true },
    { accessorKey: 'account_level', header: language === 'ar' ? 'المستوى' : 'Level', headerAr: 'المستوى', type: 'number', required: true },
    { accessorKey: 'account_type', header: language === 'ar' ? 'النوع' : 'Type', headerAr: 'النوع', required: true },
    { accessorKey: 'account_group', header: language === 'ar' ? 'المجموعة' : 'Group', headerAr: 'المجموعة' },
    { accessorKey: 'is_project_related', header: language === 'ar' ? 'مرتبط بمشروع' : 'Project Related', headerAr: 'مرتبط بمشروع', type: 'boolean' },
    { accessorKey: 'is_cost_center_required', header: language === 'ar' ? 'يتطلب مركز تكلفة' : 'Cost Center Required', headerAr: 'يتطلب مركز تكلفة', type: 'boolean' },
    { accessorKey: 'is_ar', header: language === 'ar' ? 'ذمم مدينة' : 'AR', headerAr: 'ذمم مدينة', type: 'boolean' },
    { accessorKey: 'is_ap', header: language === 'ar' ? 'ذمم دائنة' : 'AP', headerAr: 'ذمم دائنة', type: 'boolean' },
    { accessorKey: 'is_retention', header: language === 'ar' ? 'ضمان' : 'Retention', headerAr: 'ضمان', type: 'boolean' },
    { accessorKey: 'is_vat', header: language === 'ar' ? 'ضريبة' : 'VAT', headerAr: 'ضريبة', type: 'boolean' },
    { accessorKey: 'allow_posting', header: language === 'ar' ? 'قابل للترحيل' : 'Allow Posting', headerAr: 'قابل للترحيل', type: 'boolean' },
    { accessorKey: 'opening_balance_debit', header: language === 'ar' ? 'رصيد افتتاحي مدين' : 'Opening Debit', headerAr: 'رصيد افتتاحي مدين', type: 'number' },
    { accessorKey: 'opening_balance_credit', header: language === 'ar' ? 'رصيد افتتاحي دائن' : 'Opening Credit', headerAr: 'رصيد افتتاحي دائن', type: 'number' },
    { accessorKey: 'is_active', header: language === 'ar' ? 'نشط' : 'Active', headerAr: 'نشط', type: 'boolean' }
  ];

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.GLAccount.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['glAccounts'] });
      setModalOpen(false);
      toast.success(t('savedSuccessfully'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.GLAccount.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['glAccounts'] });
      setModalOpen(false);
      toast.success(t('savedSuccessfully'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.GLAccount.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['glAccounts'] });
      setDeleteOpen(false);
      toast.success(t('deletedSuccessfully'));
    },
  });

  const handleAdd = (parentAccount = null) => {
    setEditingItem(null);
    setFormData({ 
      ...initialFormData, 
      company_id: currentCompany?.id,
      parent_account_id: parentAccount?.id || '',
      account_level: parentAccount ? parentAccount.account_level + 1 : 1,
      account_type: parentAccount?.account_type || 'Assets',
      allow_posting: parentAccount ? parentAccount.account_level >= 5 : false,
    });
    setModalOpen(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({ ...initialFormData, ...item });
    setModalOpen(true);
  };

  const handleDelete = (item) => {
    setEditingItem(item);
    setDeleteOpen(true);
  };

  const handleSave = () => {
    const dataToSave = {
      ...formData,
      company_id: currentCompany?.id,
      allow_posting: formData.account_level === 6,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: dataToSave });
    } else {
      createMutation.mutate(dataToSave);
    }
  };

  const toggleExpand = (accountId) => {
    setExpandedAccounts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(accountId)) {
        newSet.delete(accountId);
      } else {
        newSet.add(accountId);
      }
      return newSet;
    });
  };

  const getAccountTypeInfo = (type) => accountTypes.find(t => t.value === type);

  const renderAccountRow = (account, depth = 0) => {
    const hasChildren = account.children && account.children.length > 0;
    const isExpanded = expandedAccounts.has(account.id);
    const typeInfo = getAccountTypeInfo(account.account_type);

    return (
      <React.Fragment key={account.id}>
        <div 
          className={cn(
            "flex items-center gap-2 py-2 px-3 hover:bg-slate-50 border-b border-slate-100",
            depth > 0 && "bg-slate-50/50",
            isRTL && "flex-row-reverse"
          )}
          style={{ paddingLeft: isRTL ? undefined : `${depth * 24 + 12}px`, paddingRight: isRTL ? `${depth * 24 + 12}px` : undefined }}
        >
          {/* Expand/Collapse */}
          <div className="w-6">
            {hasChildren && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => toggleExpand(account.id)}
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            )}
          </div>

          {/* Account Code */}
          <div className="w-32 font-mono text-sm font-medium text-slate-700">
            {account.account_code}
          </div>

          {/* Account Name */}
          <div className="flex-1">
            <span className={cn(
              account.account_level <= 2 && "font-semibold",
              account.account_level === 1 && "text-lg"
            )}>
              {language === 'ar' ? account.account_name_ar : account.account_name_en}
            </span>
          </div>

          {/* Level Badge */}
          <Badge variant="outline" className="text-xs">
            L{account.account_level}
          </Badge>

          {/* Type Badge */}
          <Badge variant="outline" className={cn("text-xs border", typeInfo?.color)}>
            {language === 'ar' ? typeInfo?.label_ar : typeInfo?.label_en}
          </Badge>

          {/* Flags */}
          <div className="flex items-center gap-1 w-24">
            {account.is_ar && <Badge className="text-xs bg-blue-500">AR</Badge>}
            {account.is_ap && <Badge className="text-xs bg-red-500">AP</Badge>}
            {account.is_project_related && <Badge className="text-xs bg-emerald-500">P</Badge>}
          </div>

          {/* Balance */}
          <div className="w-32 text-right font-mono text-sm">
            {account.allow_posting ? formatCurrency(account.current_balance, 'EGP') : '-'}
          </div>

          {/* Actions */}
          <div className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleAdd(account)}
              title={language === 'ar' ? 'إضافة فرعي' : 'Add Child'}
            >
              <Plus className="h-4 w-4 text-emerald-600" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleEdit(account)}
            >
              <Pencil className="h-4 w-4 text-slate-500" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleDelete(account)}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && account.children.map(child => renderAccountRow(child, depth + 1))}
      </React.Fragment>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('chartOfAccounts')}
        subtitle={language === 'ar' ? 'دليل الحسابات (6 مستويات)' : 'Chart of Accounts (6 Levels)'}
        onAdd={() => handleAdd()}
        addLabel={`${t('add')} ${language === 'ar' ? 'حساب' : 'Account'}`}
      >
        <ImportExportActions
          entityName={ENTITY_NAME}
          moduleName={MODULE_NAME}
          data={accounts}
          columns={exportColumns}
          onImportComplete={() => queryClient.invalidateQueries({ queryKey: ['glAccounts'] })}
        />
      </PageHeader>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className={cn(
          "absolute top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400",
          isRTL ? "right-3" : "left-3"
        )} />
        <Input
          placeholder={t('search')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={cn("h-10", isRTL ? "pr-10" : "pl-10")}
        />
      </div>

      {/* Accounts Tree */}
      <Card>
        <CardContent className="p-0">
          {/* Header */}
          <div className={cn(
            "flex items-center gap-2 py-3 px-3 bg-slate-100 border-b font-medium text-sm text-slate-600",
            isRTL && "flex-row-reverse"
          )}>
            <div className="w-6"></div>
            <div className="w-32">{t('code')}</div>
            <div className="flex-1">{t('name')}</div>
            <div className="w-16 text-center">{language === 'ar' ? 'المستوى' : 'Level'}</div>
            <div className="w-24 text-center">{language === 'ar' ? 'النوع' : 'Type'}</div>
            <div className="w-24 text-center">{language === 'ar' ? 'علامات' : 'Flags'}</div>
            <div className="w-32 text-right">{language === 'ar' ? 'الرصيد' : 'Balance'}</div>
            <div className="w-28"></div>
          </div>

          {/* Tree */}
          <div className="max-h-[600px] overflow-y-auto">
            {filteredTree.map(account => renderAccountRow(account))}
            {filteredTree.length === 0 && (
              <div className="py-16 text-center text-slate-400">
                {t('noData')}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? `${t('edit')} ${language === 'ar' ? 'حساب' : 'Account'}` : `${t('add')} ${language === 'ar' ? 'حساب' : 'Account'}`}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('code')} *</Label>
            <Input
              value={formData.account_code}
              onChange={(e) => setFormData({ ...formData, account_code: e.target.value })}
              placeholder="1-1-1-1"
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'المستوى' : 'Level'} *</Label>
            <Select
              value={String(formData.account_level)}
              onValueChange={(value) => setFormData({ ...formData, account_level: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6].map(level => (
                  <SelectItem key={level} value={String(level)}>
                    {language === 'ar' ? `المستوى ${level}` : `Level ${level}`}
                    {level === 6 && ` (${language === 'ar' ? 'قابل للترحيل' : 'Posting'})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('nameAr')} *</Label>
            <Input
              value={formData.account_name_ar}
              onChange={(e) => setFormData({ ...formData, account_name_ar: e.target.value })}
              dir="rtl"
            />
          </div>

          <div className="space-y-2">
            <Label>{t('nameEn')} *</Label>
            <Input
              value={formData.account_name_en}
              onChange={(e) => setFormData({ ...formData, account_name_en: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'نوع الحساب' : 'Account Type'} *</Label>
            <Select
              value={formData.account_type}
              onValueChange={(value) => setFormData({ ...formData, account_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accountTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {language === 'ar' ? type.label_ar : type.label_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الحساب الأب' : 'Parent Account'}</Label>
            <Select
              value={formData.parent_account_id}
              onValueChange={(value) => setFormData({ ...formData, parent_account_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectAll')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>{language === 'ar' ? 'بدون أب' : 'No Parent'}</SelectItem>
                {accounts
                  .filter(a => a.account_level < 6 && a.id !== editingItem?.id)
                  .map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.account_code} - {language === 'ar' ? account.account_name_ar : account.account_name_en}
                    </SelectItem>
                  ))
                }
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4 md:col-span-2">
            <Label>{language === 'ar' ? 'خصائص الحساب' : 'Account Properties'}</Label>
            <div className={cn("flex flex-wrap gap-4", isRTL && "flex-row-reverse")}>
              {[
                { key: 'is_project_related', label_ar: 'مرتبط بمشروع', label_en: 'Project Related' },
                { key: 'is_cost_center_required', label_ar: 'يتطلب مركز تكلفة', label_en: 'Cost Center Required' },
                { key: 'is_ar', label_ar: 'ذمم مدينة', label_en: 'Accounts Receivable' },
                { key: 'is_ap', label_ar: 'ذمم دائنة', label_en: 'Accounts Payable' },
                { key: 'is_retention', label_ar: 'ضمان', label_en: 'Retention' },
                { key: 'is_vat', label_ar: 'ضريبة', label_en: 'VAT' },
              ].map(prop => (
                <div key={prop.key} className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                  <Checkbox
                    id={prop.key}
                    checked={formData[prop.key]}
                    onCheckedChange={(checked) => setFormData({ ...formData, [prop.key]: checked })}
                  />
                  <label htmlFor={prop.key} className="text-sm cursor-pointer">
                    {language === 'ar' ? prop.label_ar : prop.label_en}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {formData.account_level === 6 && (
            <>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'رصيد افتتاحي مدين' : 'Opening Balance (Debit)'}</Label>
                <Input
                  type="number"
                  value={formData.opening_balance_debit}
                  onChange={(e) => setFormData({ ...formData, opening_balance_debit: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>{language === 'ar' ? 'رصيد افتتاحي دائن' : 'Opening Balance (Credit)'}</Label>
                <Input
                  type="number"
                  value={formData.opening_balance_credit}
                  onChange={(e) => setFormData({ ...formData, opening_balance_credit: e.target.value })}
                />
              </div>
            </>
          )}
        </div>
      </FormModal>

      <DeleteConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate(editingItem?.id)}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}