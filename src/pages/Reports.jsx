import React from 'react';
import { useLanguage } from '@/components/shared/LanguageContext';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  BarChart3,
  PieChart,
  TrendingUp,
  Download,
  FolderKanban,
  ShoppingCart,
  Receipt,
  Wallet,
  HardHat,
  Shield,
} from 'lucide-react';
import { cn } from "@/lib/utils";

const reportCategories = [
  {
    title_ar: 'تقارير المشاريع',
    title_en: 'Project Reports',
    icon: FolderKanban,
    color: 'bg-blue-50 text-blue-600',
    reports: [
      { name_ar: 'ملخص المشاريع', name_en: 'Projects Summary' },
      { name_ar: 'تقرير التقدم', name_en: 'Progress Report' },
      { name_ar: 'مقارنة التكلفة', name_en: 'Cost Comparison' },
      { name_ar: 'جدول الكميات', name_en: 'BOQ Report' },
    ],
  },
  {
    title_ar: 'تقارير المشتريات',
    title_en: 'Procurement Reports',
    icon: ShoppingCart,
    color: 'bg-emerald-50 text-emerald-600',
    reports: [
      { name_ar: 'طلبات الشراء', name_en: 'Purchase Requisitions' },
      { name_ar: 'أوامر الشراء', name_en: 'Purchase Orders' },
      { name_ar: 'تحليل الموردين', name_en: 'Supplier Analysis' },
      { name_ar: 'استلام البضائع', name_en: 'GRN Report' },
    ],
  },
  {
    title_ar: 'تقارير المستخلصات',
    title_en: 'IPC Reports',
    icon: Receipt,
    color: 'bg-purple-50 text-purple-600',
    reports: [
      { name_ar: 'مستخلصات العملاء', name_en: 'Client IPCs' },
      { name_ar: 'مستخلصات المقاولين', name_en: 'Subcontractor IPCs' },
      { name_ar: 'تقرير المحجوزات', name_en: 'Retention Report' },
      { name_ar: 'تقرير الدفعات', name_en: 'Payment Report' },
    ],
  },
  {
    title_ar: 'التقارير المالية',
    title_en: 'Financial Reports',
    icon: Wallet,
    color: 'bg-amber-50 text-amber-600',
    reports: [
      { name_ar: 'ميزان المراجعة', name_en: 'Trial Balance' },
      { name_ar: 'كشف حساب', name_en: 'Account Statement' },
      { name_ar: 'تحليل مراكز التكلفة', name_en: 'Cost Center Analysis' },
      { name_ar: 'تقرير الذمم', name_en: 'Receivables/Payables' },
    ],
  },
  {
    title_ar: 'تقارير مقاولي الباطن',
    title_en: 'Subcontractor Reports',
    icon: HardHat,
    color: 'bg-pink-50 text-pink-600',
    reports: [
      { name_ar: 'ملخص العقود', name_en: 'Contracts Summary' },
      { name_ar: 'أداء المقاولين', name_en: 'Performance Report' },
      { name_ar: 'تقرير المدفوعات', name_en: 'Payments Report' },
    ],
  },
  {
    title_ar: 'تقارير خطابات الضمان',
    title_en: 'LG Reports',
    icon: Shield,
    color: 'bg-slate-50 text-slate-600',
    reports: [
      { name_ar: 'خطابات الضمان النشطة', name_en: 'Active LGs' },
      { name_ar: 'تنبيهات الانتهاء', name_en: 'Expiry Alerts' },
      { name_ar: 'تقرير الهوامش', name_en: 'Margins Report' },
    ],
  },
];

export default function Reports() {
  const { t, language, isRTL } = useLanguage();

  const handleExport = (reportName) => {
    // TODO: Implement report export
    console.log('Exporting report:', reportName);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('reports')}
        subtitle={language === 'ar' ? 'التقارير والتحليلات' : 'Reports & Analytics'}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportCategories.map((category, index) => {
          const Icon = category.icon;
          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className={cn(
                  "flex items-center gap-3 text-lg",
                  isRTL && "flex-row-reverse"
                )}>
                  <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", category.color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  {language === 'ar' ? category.title_ar : category.title_en}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {category.reports.map((report, idx) => (
                    <div 
                      key={idx}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors",
                        isRTL && "flex-row-reverse"
                      )}
                    >
                      <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                        <FileText className="h-4 w-4 text-slate-400" />
                        <span className="text-sm">
                          {language === 'ar' ? report.name_ar : report.name_en}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleExport(report.name_en)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
            <BarChart3 className="h-5 w-5" />
            {language === 'ar' ? 'إحصائيات سريعة' : 'Quick Stats'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-slate-500">
            {language === 'ar' 
              ? 'سيتم إضافة الرسوم البيانية والتحليلات قريباً'
              : 'Charts and analytics coming soon'
            }
          </div>
        </CardContent>
      </Card>
    </div>
  );
}