import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/components/shared/LanguageContext';
import { useCompany } from '@/components/shared/CompanyContext';
import PageHeader from '@/components/shared/PageHeader';
import FormModal from '@/components/shared/FormModal';
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Shield, Users, Lock, Edit, Trash2, Plus, Copy, Save } from 'lucide-react';

const MODULES = [
  { key: 'dashboard', ar: 'لوحة التحكم', en: 'Dashboard' },
  { key: 'projects', ar: 'المشاريع', en: 'Projects' },
  { key: 'tenders', ar: 'المناقصات', en: 'Tenders' },
  { key: 'boq', ar: 'جدول الكميات', en: 'BOQ' },
  { key: 'cost_estimation', ar: 'تقدير التكلفة', en: 'Cost Estimation' },
  { key: 'purchase_requisition', ar: 'طلبات الشراء', en: 'Purchase Requisition' },
  { key: 'purchase_order', ar: 'أوامر الشراء', en: 'Purchase Order' },
  { key: 'rfq', ar: 'طلب عرض سعر', en: 'RFQ' },
  { key: 'grn', ar: 'استلام البضائع', en: 'GRN' },
  { key: 'inventory', ar: 'المخزون', en: 'Inventory' },
  { key: 'suppliers', ar: 'الموردين', en: 'Suppliers' },
  { key: 'client_ipc', ar: 'مستخلصات العملاء', en: 'Client IPC' },
  { key: 'subcontractor_ipc', ar: 'مستخلصات المقاولين', en: 'Subcontractor IPC' },
  { key: 'subcontracts', ar: 'عقود الباطن', en: 'Subcontracts' },
  { key: 'journal_entries', ar: 'القيود اليومية', en: 'Journal Entries' },
  { key: 'payments', ar: 'المدفوعات', en: 'Payments' },
  { key: 'receipts', ar: 'المقبوضات', en: 'Receipts' },
  { key: 'bank_accounts', ar: 'الحسابات البنكية', en: 'Bank Accounts' },
  { key: 'letters_of_guarantee', ar: 'خطابات الضمان', en: 'Letters of Guarantee' },
  { key: 'chart_of_accounts', ar: 'دليل الحسابات', en: 'Chart of Accounts' },
  { key: 'cost_centers', ar: 'مراكز التكلفة', en: 'Cost Centers' },
  { key: 'business_partners', ar: 'الشركاء التجاريين', en: 'Business Partners' },
  { key: 'products', ar: 'المنتجات', en: 'Products' },
  { key: 'equipment', ar: 'المعدات', en: 'Equipment' },
  { key: 'warehouses', ar: 'المخازن', en: 'Warehouses' },
  { key: 'employees', ar: 'الموظفين', en: 'Employees' },
  { key: 'reports', ar: 'التقارير', en: 'Reports' },
  { key: 'system_settings', ar: 'إعدادات النظام', en: 'System Settings' },
  { key: 'user_management', ar: 'إدارة المستخدمين', en: 'User Management' },
  { key: 'workflow_setup', ar: 'إعدادات سير العمل', en: 'Workflow Setup' },
];

const ACTIONS = [
  { key: 'view', ar: 'عرض', en: 'View' },
  { key: 'create', ar: 'إنشاء', en: 'Create' },
  { key: 'edit', ar: 'تعديل', en: 'Edit' },
  { key: 'delete', ar: 'حذف', en: 'Delete' },
  { key: 'approve', ar: 'اعتماد', en: 'Approve' },
  { key: 'post', ar: 'ترحيل', en: 'Post' },
  { key: 'print', ar: 'طباعة', en: 'Print' },
  { key: 'export', ar: 'تصدير', en: 'Export' },
];

export default function RolesPermissions() {
  const { language, t, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState('roles');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [rolePermissions, setRolePermissions] = useState({});
  const [formData, setFormData] = useState({
    role_name_ar: '',
    role_name_en: '',
    description_ar: '',
    description_en: '',
    is_system_role: false,
    is_active: true
  });

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['roles', currentCompany?.id],
    queryFn: () => currentCompany ? base44.entities.Role.filter({ company_id: currentCompany.id }) : base44.entities.Role.list(),
  });

  const { data: permissions = [] } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => base44.entities.Permission.list(),
  });

  const { data: rolePermissionsList = [] } = useQuery({
    queryKey: ['rolePermissions', selectedRole?.id],
    queryFn: () => selectedRole ? base44.entities.RolePermission.filter({ role_id: selectedRole.id }) : [],
    enabled: !!selectedRole,
  });

  useEffect(() => {
    if (rolePermissionsList.length > 0) {
      const perms = {};
      rolePermissionsList.forEach(rp => {
        const perm = permissions.find(p => p.id === rp.permission_id);
        if (perm) {
          const key = `${perm.module_name}_${perm.action_name}`;
          perms[key] = true;
        }
      });
      setRolePermissions(perms);
    } else {
      setRolePermissions({});
    }
  }, [rolePermissionsList, permissions]);

  const createRoleMutation = useMutation({
    mutationFn: (data) => base44.entities.Role.create({ ...data, company_id: currentCompany?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setModalOpen(false);
      toast.success(language === 'ar' ? 'تم إنشاء الدور بنجاح' : 'Role created successfully');
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Role.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setModalOpen(false);
      toast.success(language === 'ar' ? 'تم تحديث الدور بنجاح' : 'Role updated successfully');
    }
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (id) => base44.entities.Role.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setDeleteOpen(false);
      toast.success(language === 'ar' ? 'تم حذف الدور بنجاح' : 'Role deleted successfully');
    }
  });

  const handleAddRole = () => {
    setEditingItem(null);
    setFormData({
      role_name_ar: '',
      role_name_en: '',
      description_ar: '',
      description_en: '',
      is_system_role: false,
      is_active: true
    });
    setModalOpen(true);
  };

  const handleEditRole = (role) => {
    setEditingItem(role);
    setFormData({ ...role });
    setModalOpen(true);
  };

  const handleSaveRole = () => {
    if (editingItem) {
      updateRoleMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createRoleMutation.mutate(formData);
    }
  };

  const handlePermissionChange = (moduleKey, actionKey, checked) => {
    const key = `${moduleKey}_${actionKey}`;
    setRolePermissions(prev => ({ ...prev, [key]: checked }));
  };

  const handleSelectAllModule = (moduleKey, checked) => {
    const updates = {};
    ACTIONS.forEach(action => {
      updates[`${moduleKey}_${action.key}`] = checked;
    });
    setRolePermissions(prev => ({ ...prev, ...updates }));
  };

  const handleSelectAllAction = (actionKey, checked) => {
    const updates = {};
    MODULES.forEach(module => {
      updates[`${module.key}_${actionKey}`] = checked;
    });
    setRolePermissions(prev => ({ ...prev, ...updates }));
  };

  const handleSelectAll = (checked) => {
    const updates = {};
    MODULES.forEach(module => {
      ACTIONS.forEach(action => {
        updates[`${module.key}_${action.key}`] = checked;
      });
    });
    setRolePermissions(updates);
  };

  const savePermissions = async () => {
    if (!selectedRole) return;
    
    try {
      // Delete existing permissions
      for (const rp of rolePermissionsList) {
        await base44.entities.RolePermission.delete(rp.id);
      }
      
      // Get or create permissions and add new role permissions
      for (const [key, value] of Object.entries(rolePermissions)) {
        if (value) {
          const [moduleKey, actionKey] = key.split('_');
          let perm = permissions.find(p => p.module_name === moduleKey && p.action_name === actionKey);
          
          if (!perm) {
            const module = MODULES.find(m => m.key === moduleKey);
            const action = ACTIONS.find(a => a.key === actionKey);
            perm = await base44.entities.Permission.create({
              module_name: moduleKey,
              module_name_ar: module?.ar,
              module_name_en: module?.en,
              action_name: actionKey,
              description_ar: action?.ar,
              description_en: action?.en
            });
          }
          
          await base44.entities.RolePermission.create({
            role_id: selectedRole.id,
            permission_id: perm.id,
            is_active: true
          });
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['rolePermissions'] });
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      toast.success(language === 'ar' ? 'تم حفظ الصلاحيات بنجاح' : 'Permissions saved successfully');
    } catch (error) {
      toast.error(language === 'ar' ? 'خطأ في حفظ الصلاحيات' : 'Error saving permissions');
    }
  };

  return (
    <div className="p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <PageHeader
        title={language === 'ar' ? 'الأدوار والصلاحيات' : 'Roles & Permissions'}
        subtitle={language === 'ar' ? 'إدارة أدوار المستخدمين وصلاحياتهم' : 'Manage user roles and permissions'}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="roles" className="gap-2">
            <Shield className="h-4 w-4" />
            {language === 'ar' ? 'الأدوار' : 'Roles'}
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-2">
            <Lock className="h-4 w-4" />
            {language === 'ar' ? 'مصفوفة الصلاحيات' : 'Permission Matrix'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{language === 'ar' ? 'قائمة الأدوار' : 'Roles List'}</CardTitle>
              <Button onClick={handleAddRole} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'إضافة دور' : 'Add Role'}
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'ar' ? 'اسم الدور' : 'Role Name'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الوصف' : 'Description'}</TableHead>
                    <TableHead>{language === 'ar' ? 'نظامي' : 'System'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map(role => (
                    <TableRow 
                      key={role.id} 
                      className={cn(
                        "cursor-pointer hover:bg-slate-50",
                        selectedRole?.id === role.id && "bg-blue-50"
                      )}
                      onClick={() => setSelectedRole(role)}
                    >
                      <TableCell className="font-medium">
                        {language === 'ar' ? role.role_name_ar : role.role_name_en}
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {language === 'ar' ? role.description_ar : role.description_en}
                      </TableCell>
                      <TableCell>
                        {role.is_system_role && (
                          <Badge variant="outline">{language === 'ar' ? 'نظامي' : 'System'}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={role.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {role.is_active ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'غير نشط' : 'Inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEditRole(role); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          {!role.is_system_role && (
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setEditingItem(role); setDeleteOpen(true); }}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{language === 'ar' ? 'مصفوفة الصلاحيات' : 'Permission Matrix'}</CardTitle>
                {selectedRole && (
                  <p className="text-sm text-slate-500 mt-1">
                    {language === 'ar' ? 'الدور المحدد: ' : 'Selected Role: '}
                    <span className="font-medium">{language === 'ar' ? selectedRole.role_name_ar : selectedRole.role_name_en}</span>
                  </p>
                )}
              </div>
              {selectedRole && (
                <Button onClick={savePermissions} className="bg-green-600 hover:bg-green-700">
                  <Save className="h-4 w-4 mr-2" />
                  {language === 'ar' ? 'حفظ الصلاحيات' : 'Save Permissions'}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {!selectedRole ? (
                <div className="text-center py-8 text-slate-500">
                  {language === 'ar' ? 'الرجاء اختيار دور من قائمة الأدوار أولاً' : 'Please select a role from the Roles tab first'}
                </div>
              ) : (
                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-white z-10 min-w-[200px]">
                          <div className="flex items-center gap-2">
                            <Checkbox 
                              checked={Object.values(rolePermissions).every(v => v) && Object.keys(rolePermissions).length === MODULES.length * ACTIONS.length}
                              onCheckedChange={handleSelectAll}
                            />
                            {language === 'ar' ? 'الوحدة' : 'Module'}
                          </div>
                        </TableHead>
                        {ACTIONS.map(action => (
                          <TableHead key={action.key} className="text-center min-w-[80px]">
                            <div className="flex flex-col items-center gap-1">
                              <Checkbox 
                                checked={MODULES.every(m => rolePermissions[`${m.key}_${action.key}`])}
                                onCheckedChange={(checked) => handleSelectAllAction(action.key, checked)}
                              />
                              <span className="text-xs">{language === 'ar' ? action.ar : action.en}</span>
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {MODULES.map(module => (
                        <TableRow key={module.key}>
                          <TableCell className="sticky left-0 bg-white font-medium">
                            <div className="flex items-center gap-2">
                              <Checkbox 
                                checked={ACTIONS.every(a => rolePermissions[`${module.key}_${a.key}`])}
                                onCheckedChange={(checked) => handleSelectAllModule(module.key, checked)}
                              />
                              {language === 'ar' ? module.ar : module.en}
                            </div>
                          </TableCell>
                          {ACTIONS.map(action => (
                            <TableCell key={action.key} className="text-center">
                              <Checkbox 
                                checked={!!rolePermissions[`${module.key}_${action.key}`]}
                                onCheckedChange={(checked) => handlePermissionChange(module.key, action.key, checked)}
                              />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? (language === 'ar' ? 'تعديل الدور' : 'Edit Role') : (language === 'ar' ? 'إضافة دور جديد' : 'Add New Role')}
        onSave={handleSaveRole}
        isSaving={createRoleMutation.isPending || updateRoleMutation.isPending}
      >
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'اسم الدور (عربي)' : 'Role Name (Arabic)'} *</Label>
              <Input value={formData.role_name_ar} onChange={(e) => setFormData({ ...formData, role_name_ar: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'اسم الدور (إنجليزي)' : 'Role Name (English)'} *</Label>
              <Input value={formData.role_name_en} onChange={(e) => setFormData({ ...formData, role_name_en: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الوصف (عربي)' : 'Description (Arabic)'}</Label>
              <Input value={formData.description_ar} onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الوصف (إنجليزي)' : 'Description (English)'}</Label>
              <Input value={formData.description_en} onChange={(e) => setFormData({ ...formData, description_en: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox 
              id="is_active" 
              checked={formData.is_active} 
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} 
            />
            <Label htmlFor="is_active">{language === 'ar' ? 'نشط' : 'Active'}</Label>
          </div>
        </div>
      </FormModal>

      <DeleteConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteRoleMutation.mutate(editingItem?.id)}
        isDeleting={deleteRoleMutation.isPending}
        title={language === 'ar' ? 'حذف الدور' : 'Delete Role'}
        description={language === 'ar' ? 'هل أنت متأكد من حذف هذا الدور؟' : 'Are you sure you want to delete this role?'}
      />
    </div>
  );
}