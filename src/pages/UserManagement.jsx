import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/components/shared/LanguageContext';
import { useCompany } from '@/components/shared/CompanyContext';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import FormModal from '@/components/shared/FormModal';
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDate } from '@/components/shared/formatters';
import { Users, UserCheck, UserX, Shield, Mail, Phone, Building, Key } from 'lucide-react';

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

export default function UserManagement() {
  const { language, t, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userPermissions, setUserPermissions] = useState({});
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: 'user',
    status: 'active'
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => base44.entities.Role.list(),
  });

  const { data: userRoles = [] } = useQuery({
    queryKey: ['userRoles', selectedUser?.id],
    queryFn: () => selectedUser ? base44.entities.UserRole.filter({ user_id: selectedUser.id }) : [],
    enabled: !!selectedUser,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.list(),
  });

  const { data: userPermissionsList = [] } = useQuery({
    queryKey: ['userPermissions', selectedUser?.id],
    queryFn: () => selectedUser ? base44.entities.UserPermission.filter({ user_id: selectedUser.id }) : [],
    enabled: !!selectedUser,
  });

  const { data: permissions = [] } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => base44.entities.Permission.list(),
  });

  const filteredUsers = users.filter(user => {
    if (activeTab === 'pending') return user.status === 'pending_approval';
    if (activeTab === 'active') return user.status === 'active';
    if (activeTab === 'suspended') return user.status === 'suspended';
    return true;
  });

  const getStatusBadge = (status) => {
    const configs = {
      active: { className: 'bg-green-100 text-green-700', label: language === 'ar' ? 'نشط' : 'Active' },
      pending_approval: { className: 'bg-amber-100 text-amber-700', label: language === 'ar' ? 'في انتظار الموافقة' : 'Pending Approval' },
      suspended: { className: 'bg-red-100 text-red-700', label: language === 'ar' ? 'معلق' : 'Suspended' },
      inactive: { className: 'bg-slate-100 text-slate-700', label: language === 'ar' ? 'غير نشط' : 'Inactive' },
    };
    const config = configs[status] || configs.inactive;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const handleViewPermissions = (user) => {
    setSelectedUser(user);
    setPermissionsModalOpen(true);
  };

  const handleApproveUser = async (user) => {
    try {
      await base44.entities.User.update(user.id, { status: 'active' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(language === 'ar' ? 'تم تفعيل المستخدم بنجاح' : 'User activated successfully');
    } catch (error) {
      toast.error(language === 'ar' ? 'خطأ في تفعيل المستخدم' : 'Error activating user');
    }
  };

  const handleSuspendUser = async (user) => {
    try {
      await base44.entities.User.update(user.id, { status: 'suspended' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(language === 'ar' ? 'تم تعليق المستخدم' : 'User suspended');
    } catch (error) {
      toast.error(language === 'ar' ? 'خطأ في تعليق المستخدم' : 'Error suspending user');
    }
  };

  const handlePermissionChange = (moduleKey, actionKey, checked) => {
    const key = `${moduleKey}_${actionKey}`;
    setUserPermissions(prev => ({ ...prev, [key]: checked }));
  };

  const handleApplyRole = async (roleId) => {
    const role = roles.find(r => r.id === roleId);
    if (!role) return;
    
    const rolePerms = await base44.entities.RolePermission.filter({ role_id: roleId });
    const newPerms = {};
    
    for (const rp of rolePerms) {
      const perm = permissions.find(p => p.id === rp.permission_id);
      if (perm) {
        newPerms[`${perm.module_name}_${perm.action_name}`] = true;
      }
    }
    
    setUserPermissions(newPerms);
    toast.success(language === 'ar' ? 'تم تطبيق صلاحيات الدور' : 'Role permissions applied');
  };

  const saveUserPermissions = async () => {
    if (!selectedUser) return;
    
    try {
      // Delete existing permissions
      for (const up of userPermissionsList) {
        await base44.entities.UserPermission.delete(up.id);
      }
      
      // Add new permissions
      for (const [key, value] of Object.entries(userPermissions)) {
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
          
          await base44.entities.UserPermission.create({
            user_id: selectedUser.id,
            permission_id: perm.id,
            is_active: true
          });
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['userPermissions'] });
      setPermissionsModalOpen(false);
      toast.success(language === 'ar' ? 'تم حفظ الصلاحيات' : 'Permissions saved');
    } catch (error) {
      toast.error(language === 'ar' ? 'خطأ في حفظ الصلاحيات' : 'Error saving permissions');
    }
  };

  const columns = [
    {
      header: language === 'ar' ? 'المستخدم' : 'User',
      accessorKey: 'full_name',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={row.profile_photo} />
            <AvatarFallback className="bg-blue-100 text-blue-700">
              {row.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{row.full_name}</div>
            <div className="text-xs text-slate-500">{row.email}</div>
          </div>
        </div>
      )
    },
    {
      header: language === 'ar' ? 'الدور' : 'Role',
      accessorKey: 'role',
      cell: (row) => (
        <Badge variant="outline">{row.role === 'admin' ? (language === 'ar' ? 'مدير' : 'Admin') : (language === 'ar' ? 'مستخدم' : 'User')}</Badge>
      )
    },
    {
      header: language === 'ar' ? 'الحالة' : 'Status',
      accessorKey: 'status',
      cell: (row) => getStatusBadge(row.status || 'active')
    },
    {
      header: language === 'ar' ? 'آخر دخول' : 'Last Login',
      accessorKey: 'last_login',
      cell: (row) => row.last_login ? formatDate(row.last_login) : '-'
    },
    {
      header: language === 'ar' ? 'الإجراءات' : 'Actions',
      accessorKey: 'actions',
      cell: (row) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleViewPermissions(row)}>
            <Shield className="h-4 w-4 mr-1" />
            {language === 'ar' ? 'الصلاحيات' : 'Permissions'}
          </Button>
          {row.status === 'pending_approval' && (
            <Button variant="outline" size="sm" className="text-green-600" onClick={() => handleApproveUser(row)}>
              <UserCheck className="h-4 w-4" />
            </Button>
          )}
          {row.status === 'active' && row.role !== 'admin' && (
            <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleSuspendUser(row)}>
              <UserX className="h-4 w-4" />
            </Button>
          )}
        </div>
      )
    }
  ];

  const pendingCount = users.filter(u => u.status === 'pending_approval').length;

  return (
    <div className="p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <PageHeader
        title={language === 'ar' ? 'إدارة المستخدمين' : 'User Management'}
        subtitle={language === 'ar' ? 'عرض وإدارة حسابات المستخدمين وصلاحياتهم' : 'View and manage user accounts and permissions'}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            <Users className="h-4 w-4" />
            {language === 'ar' ? 'الكل' : 'All'} ({users.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            <UserCheck className="h-4 w-4" />
            {language === 'ar' ? 'في الانتظار' : 'Pending'} 
            {pendingCount > 0 && <Badge className="ml-1 bg-amber-500">{pendingCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="active" className="gap-2">
            <UserCheck className="h-4 w-4" />
            {language === 'ar' ? 'نشط' : 'Active'}
          </TabsTrigger>
          <TabsTrigger value="suspended" className="gap-2">
            <UserX className="h-4 w-4" />
            {language === 'ar' ? 'معلق' : 'Suspended'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <DataTable
            data={filteredUsers}
            columns={columns}
            isLoading={isLoading}
            searchable
            searchPlaceholder={language === 'ar' ? 'بحث بالاسم أو البريد...' : 'Search by name or email...'}
          />
        </TabsContent>
      </Tabs>

      {/* User Permissions Modal */}
      <FormModal
        open={permissionsModalOpen}
        onClose={() => setPermissionsModalOpen(false)}
        title={language === 'ar' ? `صلاحيات المستخدم: ${selectedUser?.full_name}` : `User Permissions: ${selectedUser?.full_name}`}
        onSave={saveUserPermissions}
        size="xl"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Label>{language === 'ar' ? 'تطبيق صلاحيات دور:' : 'Apply Role Permissions:'}</Label>
            <Select onValueChange={handleApplyRole}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={language === 'ar' ? 'اختر دور' : 'Select Role'} />
              </SelectTrigger>
              <SelectContent>
                {roles.map(role => (
                  <SelectItem key={role.id} value={role.id}>
                    {language === 'ar' ? role.role_name_ar : role.role_name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="h-[500px] border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-white z-10 min-w-[200px]">
                    {language === 'ar' ? 'الوحدة' : 'Module'}
                  </TableHead>
                  {ACTIONS.map(action => (
                    <TableHead key={action.key} className="text-center min-w-[70px]">
                      <span className="text-xs">{language === 'ar' ? action.ar : action.en}</span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {MODULES.map(module => (
                  <TableRow key={module.key}>
                    <TableCell className="sticky left-0 bg-white font-medium">
                      {language === 'ar' ? module.ar : module.en}
                    </TableCell>
                    {ACTIONS.map(action => (
                      <TableCell key={action.key} className="text-center">
                        <Checkbox 
                          checked={!!userPermissions[`${module.key}_${action.key}`]}
                          onCheckedChange={(checked) => handlePermissionChange(module.key, action.key, checked)}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </FormModal>
    </div>
  );
}