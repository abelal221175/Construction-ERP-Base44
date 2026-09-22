import {
  Briefcase, ShoppingCart, FileText, Banknote, Users, Shield, Wallet,
  FileStack, BarChart3, Settings, Building2, Hash, History, ClipboardList,
  Truck, Receipt, CreditCard, HardHat, FolderKanban, Boxes, TrendingDown,
} from 'lucide-react';

export const WIDGET_CATALOG = [
  // ── Projects ──
  { id: 'active_projects', category: 'projects', type: 'data', titleAr: 'المشاريع النشطة', titleEn: 'Active Projects', icon: Briefcase, link: 'Projects', valueKey: 'activeProjects' },
  { id: 'total_projects', category: 'projects', type: 'data', titleAr: 'إجمالي المشاريع', titleEn: 'All Projects', icon: FolderKanban, link: 'Projects', valueKey: 'totalProjects' },
  { id: 'contract_value', category: 'projects', type: 'data', titleAr: 'قيمة العقود', titleEn: 'Contract Value', icon: Banknote, link: 'Projects', valueKey: 'totalContractValue', isCurrency: true },
  { id: 'business_partners', category: 'projects', type: 'data', titleAr: 'شركاء الأعمال', titleEn: 'Business Partners', icon: Building2, link: 'BusinessPartners', valueKey: 'businessPartners' },
  { id: 'create_project', category: 'projects', type: 'action', titleAr: 'إنشاء مشروع', titleEn: 'Create Project', icon: Briefcase, link: 'Projects' },
  { id: 'projects_by_status', category: 'projects', type: 'chart', chartType: 'donut', titleAr: 'المشاريع حسب الحالة', titleEn: 'Projects by Status', icon: BarChart3, link: 'Projects', chartKey: 'projectsByStatus' },
  { id: 'top_projects', category: 'projects', type: 'chart', chartType: 'bar', titleAr: 'أكبر المشاريع', titleEn: 'Top Projects', icon: BarChart3, link: 'Projects', chartKey: 'topProjects' },

  // ── Procurement ──
  { id: 'open_pos', category: 'procurement', type: 'data', titleAr: 'أوامر الشراء', titleEn: 'Purchase Orders', icon: ShoppingCart, link: 'PurchaseOrders', valueKey: 'openPOs' },
  { id: 'open_prs', category: 'procurement', type: 'data', titleAr: 'طلبات الشراء', titleEn: 'Purchase Requisitions', icon: ClipboardList, link: 'PurchaseRequisitions', valueKey: 'openPRs' },
  { id: 'grns', category: 'procurement', type: 'data', titleAr: 'استلام البضائع', titleEn: 'Goods Received', icon: Truck, link: 'GoodsReceived', valueKey: 'goodsReceived' },
  { id: 'create_po', category: 'procurement', type: 'action', titleAr: 'إنشاء أمر شراء', titleEn: 'Create PO', icon: ShoppingCart, link: 'PurchaseOrders' },
  { id: 'create_pr', category: 'procurement', type: 'action', titleAr: 'إنشاء طلب شراء', titleEn: 'Create PR', icon: ClipboardList, link: 'PurchaseRequisitions' },
  { id: 'create_grn', category: 'procurement', type: 'action', titleAr: 'إنشاء استلام', titleEn: 'Create GRN', icon: Truck, link: 'GoodsReceived' },
  { id: 'pos_by_status', category: 'procurement', type: 'chart', chartType: 'donut', titleAr: 'أوامر الشراء حسب الحالة', titleEn: 'POs by Status', icon: BarChart3, link: 'PurchaseOrders', chartKey: 'posByStatus' },

  // ── Finance ──
  { id: 'client_ipcs', category: 'finance', type: 'data', titleAr: 'مستخلصات العملاء', titleEn: 'Client IPCs', icon: Receipt, link: 'ClientIPC', valueKey: 'clientIpcs' },
  { id: 'unposted_ipcs', category: 'finance', type: 'data', titleAr: 'مستخلصات غير مرحّلة', titleEn: 'Unposted IPCs', icon: FileStack, link: 'ClientIPC', valueKey: 'unpostedIpcs' },
  { id: 'pending_approvals', category: 'finance', type: 'data', titleAr: 'موافقات معلقة', titleEn: 'Pending Approvals', icon: Shield, link: 'PendingApprovals', valueKey: 'pendingApprovals' },
  { id: 'cash_position', category: 'finance', type: 'data', titleAr: 'المركز النقدي', titleEn: 'Cash Position', icon: Wallet, link: 'BankAccounts', valueKey: 'cashPosition', isCurrency: true },
  { id: 'subcontracts', category: 'finance', type: 'data', titleAr: 'عقود الباطن', titleEn: 'Subcontracts', icon: HardHat, link: 'Subcontracts', valueKey: 'subcontracts' },
  { id: 'create_ipc', category: 'finance', type: 'action', titleAr: 'إنشاء مستخلص', titleEn: 'Create IPC', icon: Receipt, link: 'ClientIPC' },
  { id: 'create_payment', category: 'finance', type: 'action', titleAr: 'إنشاء سند صرف', titleEn: 'Create Payment', icon: CreditCard, link: 'PaymentVouchers' },
  { id: 'monthly_ipcs', category: 'finance', type: 'chart', chartType: 'line', titleAr: 'المستخلصات الشهرية', titleEn: 'Monthly IPCs', icon: BarChart3, link: 'ClientIPC', chartKey: 'monthlyIpcs' },
  { id: 'cost_analysis', category: 'finance', type: 'cost', titleAr: 'تحليل التكلفة: المخطط مقابل المراجع مقابل الفعلي', titleEn: 'Cost Analysis: Planned vs Revised vs Actual', icon: TrendingDown, link: 'ProjectBudget' },

  // ── Recent transactions ──
  { id: 'recent_pos', category: 'home', type: 'recent', recentKey: 'pos', titleAr: 'أحدث أوامر الشراء', titleEn: 'Recent Purchase Orders', icon: ShoppingCart, link: 'PurchaseOrders' },
  { id: 'recent_ipcs', category: 'home', type: 'recent', recentKey: 'ipcs', titleAr: 'أحدث المستخلصات', titleEn: 'Recent Client IPCs', icon: Receipt, link: 'ClientIPC' },
  { id: 'recent_approvals', category: 'home', type: 'recent', recentKey: 'approvals', titleAr: 'الموافقات المعلقة', titleEn: 'Pending Approvals', icon: Shield, link: 'PendingApprovals' },

  // ── Analytics (report gallery) ──
  { id: 'an_projects_status', category: 'analytics', type: 'chart', chartType: 'donut', titleAr: 'تحليل المشاريع', titleEn: 'Projects Analysis', icon: BarChart3, link: 'Reports', chartKey: 'projectsByStatus' },
  { id: 'an_top_projects', category: 'analytics', type: 'chart', chartType: 'bar', titleAr: 'أكبر المشاريع بالقيمة', titleEn: 'Top Projects by Value', icon: BarChart3, link: 'Reports', chartKey: 'topProjects' },
  { id: 'an_pos_status', category: 'analytics', type: 'chart', chartType: 'donut', titleAr: 'تحليل المشتريات', titleEn: 'Procurement Analysis', icon: BarChart3, link: 'Reports', chartKey: 'posByStatus' },
  { id: 'an_monthly_ipcs', category: 'analytics', type: 'chart', chartType: 'line', titleAr: 'تدفق المستخلصات', titleEn: 'IPC Flow', icon: BarChart3, link: 'Reports', chartKey: 'monthlyIpcs' },
  { id: 'an_reports', category: 'analytics', type: 'quicklink', titleAr: 'معرض التقارير', titleEn: 'Reports Gallery', icon: FileText, link: 'Reports' },

  // ── Useful Links ──
  { id: 'link_reports', category: 'links', type: 'quicklink', titleAr: 'التقارير', titleEn: 'Reports', icon: BarChart3, link: 'Reports' },
  { id: 'link_coa', category: 'links', type: 'quicklink', titleAr: 'دليل الحسابات', titleEn: 'Chart of Accounts', icon: Banknote, link: 'ChartOfAccounts' },
  { id: 'link_costcenters', category: 'links', type: 'quicklink', titleAr: 'مراكز التكلفة', titleEn: 'Cost Centers', icon: Building2, link: 'CostCenters' },
  { id: 'link_fiscalyears', category: 'links', type: 'quicklink', titleAr: 'السنوات المالية', titleEn: 'Fiscal Years', icon: FileText, link: 'FiscalYears' },
  { id: 'link_numbering', category: 'links', type: 'quicklink', titleAr: 'تسلسل الترقيم', titleEn: 'Numbering', icon: Hash, link: 'NumberingSeries' },
  { id: 'link_audit', category: 'links', type: 'quicklink', titleAr: 'سجل المراجعة', titleEn: 'Audit Logs', icon: History, link: 'AuditLogs' },
  { id: 'link_settings', category: 'links', type: 'quicklink', titleAr: 'إعدادات النظام', titleEn: 'System Settings', icon: Settings, link: 'SystemSettings' },
  { id: 'link_users', category: 'links', type: 'quicklink', titleAr: 'المستخدمين', titleEn: 'Users', icon: Users, link: 'Users' },
  { id: 'link_products', category: 'links', type: 'quicklink', titleAr: 'المنتجات', titleEn: 'Products', icon: Boxes, link: 'Products' },
];

export const DEFAULT_HOME_WIDGETS = [
  'active_projects', 'open_pos', 'client_ipcs', 'pending_approvals', 'cash_position',
  'recent_pos', 'recent_ipcs', 'recent_approvals',
  'cost_analysis',
  'create_po', 'create_ipc', 'projects_by_status', 'top_projects', 'monthly_ipcs',
  'link_reports', 'link_coa', 'link_audit',
];

export const TABS = [
  { id: 'home', labelAr: 'صفحتي', labelEn: 'My Home' },
  { id: 'projects', labelAr: 'المشاريع', labelEn: 'Projects' },
  { id: 'procurement', labelAr: 'المشتريات', labelEn: 'Procurement' },
  { id: 'finance', labelAr: 'المالية', labelEn: 'Finance' },
  { id: 'analytics', labelAr: 'التحليلات', labelEn: 'Analytics' },
  { id: 'links', labelAr: 'روابط مفيدة', labelEn: 'Useful Links' },
];