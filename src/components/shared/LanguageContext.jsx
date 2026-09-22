import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const LanguageContext = createContext();

export const translations = {
  ar: {
    // Navigation
    dashboard: 'لوحة التحكم',
    projects: 'المشاريع',
    boq: 'جدول الكميات',
    tendering: 'المناقصات',
    procurement: 'المشتريات',
    purchaseRequisitions: 'طلبات الشراء',
    purchaseOrders: 'أوامر الشراء',
    goodsReceived: 'استلام البضائع',
    finance: 'المالية',
    chartOfAccounts: 'دليل الحسابات',
    costCenters: 'مراكز التكلفة',
    ipc: 'مستخلصات العملاء',
    subcontractors: 'مقاولي الباطن',
    subcontracts: 'عقود الباطن',
    subcontractorIPC: 'مستخلصات المقاولين',
    masterData: 'البيانات الرئيسية',
    businessPartners: 'الشركاء التجاريين',
    products: 'المنتجات',
    equipment: 'المعدات',
    employees: 'الموظفين',
    warehouses: 'المخازن',
    reports: 'التقارير',
    settings: 'الإعدادات',
    companies: 'الشركات',
    departments: 'الأقسام',
    users: 'المستخدمين',
    lettersOfGuarantee: 'خطابات الضمان',
    
    // Common Actions
    add: 'إضافة',
    edit: 'تعديل',
    delete: 'حذف',
    save: 'حفظ',
    cancel: 'إلغاء',
    search: 'بحث',
    filter: 'تصفية',
    export: 'تصدير',
    import: 'استيراد',
    print: 'طباعة',
    approve: 'اعتماد',
    reject: 'رفض',
    submit: 'إرسال',
    close: 'إغلاق',
    view: 'عرض',
    download: 'تحميل',
    upload: 'رفع',
    refresh: 'تحديث',
    back: 'رجوع',
    next: 'التالي',
    previous: 'السابق',
    
    // Status
    status: 'الحالة',
    active: 'نشط',
    inactive: 'غير نشط',
    draft: 'مسودة',
    submitted: 'مقدم',
    approved: 'معتمد',
    rejected: 'مرفوض',
    pending: 'معلق',
    completed: 'مكتمل',
    cancelled: 'ملغي',
    
    // Common Fields
    code: 'الكود',
    name: 'الاسم',
    nameAr: 'الاسم بالعربية',
    nameEn: 'الاسم بالإنجليزية',
    description: 'الوصف',
    date: 'التاريخ',
    amount: 'المبلغ',
    quantity: 'الكمية',
    unitPrice: 'سعر الوحدة',
    total: 'الإجمالي',
    subtotal: 'المجموع الفرعي',
    grandTotal: 'المجموع الكلي',
    uom: 'وحدة القياس',
    notes: 'ملاحظات',
    phone: 'الهاتف',
    email: 'البريد الإلكتروني',
    address: 'العنوان',
    
    // Project specific
    project: 'المشروع',
    projectCode: 'كود المشروع',
    projectName: 'اسم المشروع',
    client: 'العميل',
    consultant: 'الاستشاري',
    contractValue: 'قيمة العقد',
    contractDate: 'تاريخ العقد',
    startDate: 'تاريخ البدء',
    endDate: 'تاريخ الانتهاء',
    retention: 'الضمان',
    advance: 'الدفعة المقدمة',
    vat: 'ضريبة القيمة المضافة',
    
    // BOQ specific
    boqItem: 'بند جدول الكميات',
    level1: 'المستوى الأول',
    level2: 'المستوى الثاني',
    level3: 'المستوى الثالث',
    costBreakdown: 'تحليل التكلفة',
    dryCost: 'التكلفة الجافة',
    markup: 'هامش الربح',
    sellingPrice: 'سعر البيع',
    
    // IPC specific
    ipcNumber: 'رقم المستخلص',
    periodFrom: 'من تاريخ',
    periodTo: 'إلى تاريخ',
    cumulativeQty: 'الكمية التراكمية',
    previousQty: 'الكمية السابقة',
    currentQty: 'الكمية الحالية',
    completionPercentage: 'نسبة الإنجاز',
    cumulativeAmount: 'المبلغ التراكمي',
    previousAmount: 'المبلغ السابق',
    currentAmount: 'المبلغ الحالي',
    deductions: 'الخصومات',
    additions: 'الإضافات',
    netPayable: 'صافي المستحق',
    
    // Procurement
    prNumber: 'رقم طلب الشراء',
    poNumber: 'رقم أمر الشراء',
    grnNumber: 'رقم استلام البضائع',
    supplier: 'المورد',
    deliveryDate: 'تاريخ التسليم',
    paymentTerms: 'شروط الدفع',
    
    // Messages
    confirmDelete: 'هل أنت متأكد من الحذف؟',
    savedSuccessfully: 'تم الحفظ بنجاح',
    deletedSuccessfully: 'تم الحذف بنجاح',
    error: 'خطأ',
    loading: 'جاري التحميل...',
    noData: 'لا توجد بيانات',
    selectAll: 'تحديد الكل',
    
    // Welcome
    welcome: 'مرحباً',
    selectCompany: 'اختر الشركة',
    logout: 'تسجيل الخروج',
  },
  en: {
    // Navigation
    dashboard: 'Dashboard',
    projects: 'Projects',
    boq: 'BOQ',
    tendering: 'Tendering',
    procurement: 'Procurement',
    purchaseRequisitions: 'Purchase Requisitions',
    purchaseOrders: 'Purchase Orders',
    goodsReceived: 'Goods Received',
    finance: 'Finance',
    chartOfAccounts: 'Chart of Accounts',
    costCenters: 'Cost Centers',
    ipc: 'Client IPC',
    subcontractors: 'Subcontractors',
    subcontracts: 'Subcontracts',
    subcontractorIPC: 'Subcontractor IPC',
    masterData: 'Master Data',
    businessPartners: 'Business Partners',
    products: 'Products',
    equipment: 'Equipment',
    employees: 'Employees',
    warehouses: 'Warehouses',
    reports: 'Reports',
    settings: 'Settings',
    companies: 'Companies',
    departments: 'Departments',
    users: 'Users',
    lettersOfGuarantee: 'Letters of Guarantee',
    
    // Common Actions
    add: 'Add',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    cancel: 'Cancel',
    search: 'Search',
    filter: 'Filter',
    export: 'Export',
    import: 'Import',
    print: 'Print',
    approve: 'Approve',
    reject: 'Reject',
    submit: 'Submit',
    close: 'Close',
    view: 'View',
    download: 'Download',
    upload: 'Upload',
    refresh: 'Refresh',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    
    // Status
    status: 'Status',
    active: 'Active',
    inactive: 'Inactive',
    draft: 'Draft',
    submitted: 'Submitted',
    approved: 'Approved',
    rejected: 'Rejected',
    pending: 'Pending',
    completed: 'Completed',
    cancelled: 'Cancelled',
    
    // Common Fields
    code: 'Code',
    name: 'Name',
    nameAr: 'Name (Arabic)',
    nameEn: 'Name (English)',
    description: 'Description',
    date: 'Date',
    amount: 'Amount',
    quantity: 'Quantity',
    unitPrice: 'Unit Price',
    total: 'Total',
    subtotal: 'Subtotal',
    grandTotal: 'Grand Total',
    uom: 'UOM',
    notes: 'Notes',
    phone: 'Phone',
    email: 'Email',
    address: 'Address',
    
    // Project specific
    project: 'Project',
    projectCode: 'Project Code',
    projectName: 'Project Name',
    client: 'Client',
    consultant: 'Consultant',
    contractValue: 'Contract Value',
    contractDate: 'Contract Date',
    startDate: 'Start Date',
    endDate: 'End Date',
    retention: 'Retention',
    advance: 'Advance Payment',
    vat: 'VAT',
    
    // BOQ specific
    boqItem: 'BOQ Item',
    level1: 'Level 1',
    level2: 'Level 2',
    level3: 'Level 3',
    costBreakdown: 'Cost Breakdown',
    dryCost: 'Dry Cost',
    markup: 'Markup',
    sellingPrice: 'Selling Price',
    
    // IPC specific
    ipcNumber: 'IPC Number',
    periodFrom: 'Period From',
    periodTo: 'Period To',
    cumulativeQty: 'Cumulative Qty',
    previousQty: 'Previous Qty',
    currentQty: 'Current Qty',
    completionPercentage: 'Completion %',
    cumulativeAmount: 'Cumulative Amount',
    previousAmount: 'Previous Amount',
    currentAmount: 'Current Amount',
    deductions: 'Deductions',
    additions: 'Additions',
    netPayable: 'Net Payable',
    
    // Procurement
    prNumber: 'PR Number',
    poNumber: 'PO Number',
    grnNumber: 'GRN Number',
    supplier: 'Supplier',
    deliveryDate: 'Delivery Date',
    paymentTerms: 'Payment Terms',
    
    // Messages
    confirmDelete: 'Are you sure you want to delete?',
    savedSuccessfully: 'Saved successfully',
    deletedSuccessfully: 'Deleted successfully',
    error: 'Error',
    loading: 'Loading...',
    noData: 'No data available',
    selectAll: 'Select All',
    
    // Welcome
    welcome: 'Welcome',
    selectCompany: 'Select Company',
    logout: 'Logout',
  }
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('ar');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const user = await base44.auth.me();
        const settings = await base44.entities.AppSettings.filter({ user_id: user.id });
        if (settings.length > 0 && settings[0].language) {
          setLanguage(settings[0].language);
        }
      } catch (error) {
        console.log('Using default language');
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  const toggleLanguage = async () => {
    const newLang = language === 'ar' ? 'en' : 'ar';
    setLanguage(newLang);
    try {
      const user = await base44.auth.me();
      const settings = await base44.entities.AppSettings.filter({ user_id: user.id });
      if (settings.length > 0) {
        await base44.entities.AppSettings.update(settings[0].id, { language: newLang });
      } else {
        await base44.entities.AppSettings.create({ user_id: user.id, language: newLang });
      }
    } catch (error) {
      console.error('Error saving language preference');
    }
  };

  const t = (key) => translations[language][key] || key;
  const isRTL = language === 'ar';
  const dir = isRTL ? 'rtl' : 'ltr';

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t, isRTL, dir, isLoading }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;