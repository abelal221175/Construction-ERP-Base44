import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { LanguageProvider, useLanguage } from '@/components/shared/LanguageContext.jsx';
import { CompanyProvider, useCompany } from '@/components/shared/CompanyContext.jsx';
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Building2,
  ChevronDown,
  Search,
  Bell,
  HelpCircle,
  LogOut,
  User,
  Home,
  Briefcase,
  FileText,
  ShoppingCart,
  Banknote,
  Users,
  Package,
  Settings,
  BarChart3,
  Shield,
  Smartphone,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';

function LayoutContent({ children }) {
  const { language, toggleLanguage, t, isRTL, dir } = useLanguage();
  const { currentCompany, companies, selectCompany } = useCompany();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openSections, setOpenSections] = useState({});

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (error) {
        console.error('Error loading user');
      }
    };
    loadUser();
  }, []);

  const { data: pendingApprovals = [] } = useQuery({
    queryKey: ['pendingApprovalsCount', currentCompany?.id],
    queryFn: () => currentCompany
      ? base44.entities.ApprovalRequest.filter({ company_id: currentCompany.id, status: 'pending' })
      : base44.entities.ApprovalRequest.filter({ status: 'pending' }),
    staleTime: 60_000,
  });
  const approvalCount = pendingApprovals.length;

  const menuItems = [
    { id: 'home', label: { ar: 'لوحة التحكم', en: 'Dashboard' }, icon: Home, page: 'Dashboard' },
    {
      id: 'projects', label: { ar: 'المشروعات', en: 'Projects' }, icon: Briefcase, submenu: [
        { label: { ar: 'جميع المشروعات', en: 'All Projects' }, page: 'Projects' },
        { label: { ar: 'جدول الكميات BOQ', en: 'BOQ' }, page: 'BOQ' },
        { label: { ar: 'أوامر التغيير', en: 'Variation Orders' }, page: 'VariationOrders' },
      ]
    },
    {
      id: 'tenders', label: { ar: 'المناقصات', en: 'Tenders' }, icon: FileText, submenu: [
        { label: { ar: 'جميع المناقصات', en: 'All Tenders' }, page: 'Tenders' },
        { label: { ar: 'التقدير والتسعير', en: 'Estimation' }, page: 'TenderEstimation' },
      ]
    },
    {
      id: 'procurement', label: { ar: 'المشتريات', en: 'Procurement' }, icon: ShoppingCart, submenu: [
        { label: { ar: 'طلبات الشراء', en: 'Purchase Requisitions' }, page: 'PurchaseRequisitions' },
        { label: { ar: 'أوامر الشراء', en: 'Purchase Orders' }, page: 'PurchaseOrders' },
        { label: { ar: 'إذن استلام', en: 'Goods Received' }, page: 'GoodsReceived' },
        { label: { ar: 'طلبات عروض الأسعار', en: 'RFQ' }, page: 'RFQList' },
      ]
    },
    {
      id: 'finance', label: { ar: 'المالية', en: 'Finance' }, icon: Banknote, submenu: [
        { label: { ar: 'المستخلصات', en: 'Client IPC' }, page: 'ClientIPC' },
        { label: { ar: 'قيود اليومية', en: 'Journal Entries' }, page: 'JournalEntries' },
        { label: { ar: 'سندات الصرف', en: 'Payment Vouchers' }, page: 'PaymentVouchers' },
        { label: { ar: 'سندات القبض', en: 'Receipt Vouchers' }, page: 'ReceiptVouchers' },
        { label: { ar: 'الحسابات البنكية', en: 'Bank Accounts' }, page: 'BankAccounts' },
        { label: { ar: 'خطابات الضمان', en: 'Letters of Guarantee' }, page: 'LettersOfGuarantee' },
        { label: { ar: 'دليل الحسابات', en: 'Chart of Accounts' }, page: 'ChartOfAccounts' },
        { label: { ar: 'مراكز التكلفة', en: 'Cost Centers' }, page: 'CostCenters' },
      ]
    },
    {
      id: 'subcontractors', label: { ar: 'مقاولي الباطن', en: 'Subcontractors' }, icon: Users, submenu: [
        { label: { ar: 'العقود', en: 'Subcontracts' }, page: 'Subcontracts' },
        { label: { ar: 'مستخلصات المقاولين', en: 'Subcontractor IPC' }, page: 'SubcontractorIPC' },
        { label: { ar: 'مدفوعات المقاولين', en: 'SC Payments' }, page: 'SubcontractorPayments' },
      ]
    },
    {
      id: 'partners', label: { ar: 'شركاء الأعمال', en: 'Business Partners' }, icon: Building2, submenu: [
        { label: { ar: 'العملاء', en: 'Clients' }, page: 'BusinessPartners', params: '?type=client' },
        { label: { ar: 'الموردين', en: 'Suppliers' }, page: 'BusinessPartners', params: '?type=supplier' },
        { label: { ar: 'المقاولين من الباطن', en: 'Subcontractors' }, page: 'BusinessPartners', params: '?type=subcontractor' },
        { label: { ar: 'الاستشاريين', en: 'Consultants' }, page: 'BusinessPartners', params: '?type=consultant' },
      ]
    },
    {
      id: 'hr', label: { ar: 'الموارد البشرية', en: 'HR' }, icon: Users, submenu: [
        { label: { ar: 'الموظفين', en: 'Employees' }, page: 'Employees' },
        { label: { ar: 'الأقسام', en: 'Departments' }, page: 'Departments' },
      ]
    },
    {
      id: 'inventory', label: { ar: 'المخزون', en: 'Inventory' }, icon: Package, submenu: [
        { label: { ar: 'المنتجات', en: 'Products' }, page: 'Products' },
        { label: { ar: 'المخازن', en: 'Warehouses' }, page: 'Warehouses' },
        { label: { ar: 'المعدات', en: 'Equipment' }, page: 'Equipment' },
      ]
    },
    {
      id: 'reports', label: { ar: 'التقارير', en: 'Reports' }, icon: BarChart3, page: 'Reports'
    },
    {
      id: 'settings', label: { ar: 'الإعدادات', en: 'Settings' }, icon: Settings, submenu: [
        { label: { ar: 'الشركات', en: 'Companies' }, page: 'Companies' },
        { label: { ar: 'المستخدمين', en: 'Users' }, page: 'Users' },
        { label: { ar: 'الأدوار والصلاحيات', en: 'Roles & Permissions' }, page: 'RolesPermissions' },
        { label: { ar: 'إدارة المستخدمين', en: 'User Management' }, page: 'UserManagement' },
        { label: { ar: 'وحدات النظام', en: 'System Modules' }, page: 'SystemModules' },
        { label: { ar: 'إعدادات النظام', en: 'System Settings' }, page: 'SystemSettings' },
        { label: { ar: 'تسلسل الترقيم', en: 'Numbering Sequences' }, page: 'SystemSequences' },
        { label: { ar: 'السنوات المالية', en: 'Fiscal Years' }, page: 'FiscalYears' },
        { label: { ar: 'الفترات المالية', en: 'Fiscal Periods' }, page: 'FiscalPeriods' },
        { label: { ar: 'أنواع عناصر التكلفة', en: 'Cost Element Types' }, page: 'CostElementTypes' },
        { label: { ar: 'سير العمل', en: 'Workflow Setup' }, page: 'WorkflowSetup' },
        { label: { ar: 'وحدات القياس', en: 'Units of Measure' }, page: 'UnitsOfMeasure' },
        { label: { ar: 'التكاليف غير المباشرة', en: 'Indirect Costs' }, page: 'IndirectCosts' },
        { label: { ar: 'سجل المراجعة', en: 'Audit Logs' }, page: 'AuditLogs' },
        { label: { ar: 'سجلات الاستيراد/التصدير', en: 'Import/Export Logs' }, page: 'ImportExportLogs' },
      ]
    },
    { id: 'approvals', label: { ar: 'الموافقات', en: 'Approvals' }, icon: Shield, page: 'PendingApprovals' },
    { id: 'siteportal', label: { ar: 'بوابة الموقع', en: 'Site Portal' }, icon: Smartphone, page: 'site' },
  ];

  const handleLogout = () => base44.auth.logout();

  const toggleSection = (id) => setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));

  const isActivePage = (page) => {
    const path = location.pathname.replace('/', '');
    return path === page;
  };

  const renderMenuItem = (item) => {
    if (item.submenu) {
      const isOpen = openSections[item.id];
      const hasActive = item.submenu.some(s => isActivePage(s.page));
      return (
        <div key={item.id}>
          <button
            onClick={() => toggleSection(item.id)}
            className={cn(
              "flex items-center justify-between w-full px-3 py-2 text-[13px] rounded transition-colors",
              hasActive ? "text-erp-accent bg-blue-50/60" : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <span className="flex items-center gap-2.5">
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label[language]}</span>
            </span>
            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-90")} />
          </button>
          {isOpen && (
            <div className="mt-0.5 mb-1 space-y-0.5">
              {item.submenu.map((sub, idx) => (
                <Link
                  key={idx}
                  to={createPageUrl(sub.page) + (sub.params || '')}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "block py-1.5 px-3 pl-9 text-[12px] rounded transition-colors",
                    isActivePage(sub.page)
                      ? "text-erp-accent font-medium bg-blue-50"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  )}
                >
                  {sub.label[language]}
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    }
    return (
      <Link
        key={item.id}
        to={createPageUrl(item.page)}
        onClick={() => setMobileMenuOpen(false)}
        className={cn(
          "flex items-center gap-2.5 px-3 py-2 text-[13px] rounded transition-colors",
          isActivePage(item.page)
            ? "text-erp-accent font-medium bg-blue-50"
            : "text-slate-600 hover:bg-slate-100"
        )}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{item.label[language]}</span>
      </Link>
    );
  };

  const currentMonth = new Date().toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-GB', { month: 'short', year: 'numeric' });

  return (
    <div className="min-h-screen bg-erp-canvas" dir={dir}>
      {/* Top bar */}
      <header className="bg-erp-header text-white h-12 flex items-center justify-between px-3 sticky top-0 z-50 border-b border-black/20">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 lg:hidden h-8 w-8"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-erp-accent" />
            <span className="font-display font-semibold text-[15px] hidden sm:inline">Construction ERP</span>
          </div>
          <div className="h-5 w-px bg-white/20 hidden md:block" />
          <span className="text-[11px] font-mono text-white/60 hidden md:inline border border-white/20 px-1.5 py-0.5 rounded">
            {currentMonth} · {language === 'ar' ? 'مفتوحة' : 'Open'}
          </span>
        </div>

        <div className="hidden md:flex items-center flex-1 max-w-sm mx-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
            <Input
              placeholder={language === 'ar' ? 'بحث...' : 'Search...'}
              className="w-full bg-white/10 border-white/15 text-white placeholder:text-white/40 pl-9 h-8 text-[12px] focus:bg-white/15"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={toggleLanguage} className="text-white hover:bg-white/10 text-[11px] px-2 h-8 font-medium">
            {language === 'ar' ? 'EN' : 'ع'}
          </Button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-8 w-8 relative">
            <Bell className="h-4 w-4" />
            {approvalCount > 0 && (
              <span className="absolute top-1 right-1 h-4 min-w-4 px-1 bg-erp-ruby rounded-full text-[9px] font-mono font-bold flex items-center justify-center">
                {approvalCount}
              </span>
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="text-white hover:bg-white/10 gap-1.5 text-[11px] px-2 h-8">
                <Building2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline max-w-28 truncate">
                  {currentCompany ? (language === 'ar' ? currentCompany.company_name_ar : currentCompany.company_name_en) : t('selectCompany')}
                </span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {companies.map((company) => (
                <DropdownMenuItem key={company.id} onClick={() => selectCompany(company)} className={cn(currentCompany?.id === company.id && "bg-blue-50")}>
                  {language === 'ar' ? company.company_name_ar : company.company_name_en}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-8 w-8">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-erp-accent text-white text-[10px] font-mono">
                    {user?.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {user?.full_name || 'User'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="h-4 w-4 mr-2" />
                {t('logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex">
        {/* Left module rail (desktop) */}
        <aside className="hidden lg:flex flex-col w-52 shrink-0 bg-erp-surface border-r border-erp-border sticky top-12 h-[calc(100vh-3rem)] overflow-y-auto py-2 px-1.5">
          {menuItems.map(renderMenuItem)}
        </aside>

        {/* Mobile drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 top-12 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/30" onClick={() => setMobileMenuOpen(false)} />
            <div className="absolute top-0 left-0 bottom-0 w-64 bg-erp-surface border-r border-erp-border overflow-y-auto py-2 px-1.5">
              {menuItems.map(renderMenuItem)}
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function Layout({ children }) {
  return (
    <LanguageProvider>
      <CompanyProvider>
        <LayoutContent>
          {children}
        </LayoutContent>
      </CompanyProvider>
    </LanguageProvider>
  );
}