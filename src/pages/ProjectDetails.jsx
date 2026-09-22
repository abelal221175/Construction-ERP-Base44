import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/components/shared/LanguageContext.jsx';
import { useCompany } from '@/components/shared/CompanyContext.jsx';
import { formatNumber, formatCurrency, formatDate, formatPercentage, getStatusColor, getLocalizedName } from '@/components/shared/formatters';
import { cn } from "@/lib/utils";
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  Users,
  TrendingUp,
  Wallet,
  FileSpreadsheet,
  ShoppingCart,
  HardHat,
  Receipt,
  Package,
  Truck,
  AlertTriangle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { toast } from "sonner";

export default function ProjectDetails() {
  const { language, t, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');

  const [activeTab, setActiveTab] = useState('overview');

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const projects = await base44.entities.Project.filter({ id: projectId });
      return projects[0];
    },
    enabled: !!projectId,
  });

  const { data: boqItems = [] } = useQuery({
    queryKey: ['projectBOQ', projectId],
    queryFn: () => base44.entities.ProjectBOQ.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const { data: ipcs = [] } = useQuery({
    queryKey: ['clientIPCs', projectId],
    queryFn: () => base44.entities.ClientIPC.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const { data: subcontracts = [] } = useQuery({
    queryKey: ['subcontracts', projectId],
    queryFn: () => base44.entities.Subcontract.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const { data: pos = [] } = useQuery({
    queryKey: ['purchaseOrders', projectId],
    queryFn: () => base44.entities.PurchaseOrder.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const { data: bps = [] } = useQuery({
    queryKey: ['bps'],
    queryFn: () => base44.entities.BusinessPartner.list(),
  });

  const client = bps.find(bp => bp.id === project?.client_id);
  const consultant = bps.find(bp => bp.id === project?.consultant_id);

  // Calculate stats
  const boqTotal = boqItems
    .filter(i => i.level === 3)
    .reduce((sum, i) => sum + ((i.quantity || 0) * (i.unit_price || 0)), 0);

  const certifiedAmount = ipcs.reduce((sum, ipc) => sum + (ipc.cumulative_gross_amount || 0), 0);
  const paidAmount = ipcs.reduce((sum, ipc) => sum + (ipc.paid_amount || 0), 0);
  const completionPercentage = project?.current_contract_value > 0 
    ? (certifiedAmount / project.current_contract_value) * 100 
    : 0;

  const subcontractTotal = subcontracts.reduce((sum, s) => sum + (s.current_value || 0), 0);
  const poTotal = pos.reduce((sum, p) => sum + (p.total_amount || 0), 0);

  if (!project) {
    return <div className="p-8 text-center">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>;
  }

  const statusLabels = {
    active: { ar: 'نشط', en: 'Active', color: 'bg-emerald-100 text-emerald-700' },
    on_hold: { ar: 'معلق', en: 'On Hold', color: 'bg-amber-100 text-amber-700' },
    completed: { ar: 'مكتمل', en: 'Completed', color: 'bg-blue-100 text-blue-700' },
    cancelled: { ar: 'ملغي', en: 'Cancelled', color: 'bg-red-100 text-red-700' },
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={language === 'ar' ? project.project_name_ar : project.project_name_en}
        subtitle={project.project_code}
      >
        <Link to={createPageUrl('Projects')}>
          <Button variant="outline" size="sm">
            {isRTL ? <ArrowRight className="h-4 w-4 ml-1" /> : <ArrowLeft className="h-4 w-4 mr-1" />}
            {language === 'ar' ? 'العودة' : 'Back'}
          </Button>
        </Link>
        <Badge className={statusLabels[project.status]?.color}>
          {statusLabels[project.status]?.[language] || project.status}
        </Badge>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{language === 'ar' ? 'قيمة العقد' : 'Contract Value'}</p>
                <p className="text-2xl font-bold">{formatCurrency(project.current_contract_value || project.original_contract_value)}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{language === 'ar' ? 'المستخلصات' : 'Certified'}</p>
                <p className="text-2xl font-bold">{formatCurrency(certifiedAmount)}</p>
                <p className="text-xs text-slate-400">{formatPercentage(completionPercentage)}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
            <Progress value={completionPercentage} className="mt-3 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{language === 'ar' ? 'المدفوع' : 'Paid'}</p>
                <p className="text-2xl font-bold">{formatCurrency(paidAmount)}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <Receipt className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{language === 'ar' ? 'العميل' : 'Client'}</p>
                <p className="font-medium text-sm">{client ? getLocalizedName(client, language, 'bp_name_ar', 'bp_name_en') : '-'}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-amber-100 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">{language === 'ar' ? 'نظرة عامة' : 'Overview'}</TabsTrigger>
          <TabsTrigger value="boq">
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            BOQ ({boqItems.length})
          </TabsTrigger>
          <TabsTrigger value="ipc">
            <Receipt className="h-4 w-4 mr-1" />
            {language === 'ar' ? 'المستخلصات' : 'IPCs'} ({ipcs.length})
          </TabsTrigger>
          <TabsTrigger value="subcontracts">
            <HardHat className="h-4 w-4 mr-1" />
            {language === 'ar' ? 'الباطن' : 'Subcontracts'} ({subcontracts.length})
          </TabsTrigger>
          <TabsTrigger value="procurement">
            <ShoppingCart className="h-4 w-4 mr-1" />
            {language === 'ar' ? 'المشتريات' : 'Procurement'} ({pos.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{language === 'ar' ? 'تفاصيل العقد' : 'Contract Details'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">{language === 'ar' ? 'رقم العقد' : 'Contract No.'}</p>
                    <p className="font-medium">{project.contract_number || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{language === 'ar' ? 'تاريخ العقد' : 'Contract Date'}</p>
                    <p className="font-medium">{formatDate(project.contract_date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{language === 'ar' ? 'تاريخ البدء' : 'Start Date'}</p>
                    <p className="font-medium">{formatDate(project.start_date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{language === 'ar' ? 'تاريخ الانتهاء' : 'End Date'}</p>
                    <p className="font-medium">{formatDate(project.original_end_date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{language === 'ar' ? 'الاستشاري' : 'Consultant'}</p>
                    <p className="font-medium">{consultant ? getLocalizedName(consultant, language, 'bp_name_ar', 'bp_name_en') : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{language === 'ar' ? 'نوع المشروع' : 'Type'}</p>
                    <p className="font-medium">{project.project_type}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{language === 'ar' ? 'ملخص مالي' : 'Financial Summary'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-600">{language === 'ar' ? 'قيمة العقد الأصلية' : 'Original Value'}</span>
                    <span className="font-medium">{formatCurrency(project.original_contract_value)}</span>
                  </div>
                  {project.discount_percentage > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>{language === 'ar' ? 'الخصم' : 'Discount'} ({project.discount_percentage}%)</span>
                      <span>-{formatCurrency(project.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-600">{language === 'ar' ? 'أوامر التغيير' : 'Variations'}</span>
                    <span className="font-medium">{formatCurrency(project.variation_amount || 0)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-bold">
                    <span>{language === 'ar' ? 'القيمة الحالية' : 'Current Value'}</span>
                    <span className="text-blue-600">{formatCurrency(project.current_contract_value || project.net_contract_value)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">{language === 'ar' ? 'نسبة الضمان' : 'Retention'}</span>
                    <span>{project.retention_percentage}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">{language === 'ar' ? 'ضريبة القيمة المضافة' : 'VAT'}</span>
                    <span>{project.vat_percentage}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{language === 'ar' ? 'ملخص سريع' : 'Quick Summary'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-slate-50 rounded-lg">
                    <FileSpreadsheet className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold">{boqItems.filter(i => i.level === 3).length}</p>
                    <p className="text-sm text-slate-500">{language === 'ar' ? 'بنود BOQ' : 'BOQ Items'}</p>
                    <p className="text-xs text-blue-600 mt-1">{formatCurrency(boqTotal)}</p>
                  </div>
                  <div className="text-center p-4 bg-slate-50 rounded-lg">
                    <Receipt className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold">{ipcs.length}</p>
                    <p className="text-sm text-slate-500">{language === 'ar' ? 'مستخلصات' : 'IPCs'}</p>
                    <p className="text-xs text-emerald-600 mt-1">{formatCurrency(certifiedAmount)}</p>
                  </div>
                  <div className="text-center p-4 bg-slate-50 rounded-lg">
                    <HardHat className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold">{subcontracts.length}</p>
                    <p className="text-sm text-slate-500">{language === 'ar' ? 'عقود باطن' : 'Subcontracts'}</p>
                    <p className="text-xs text-purple-600 mt-1">{formatCurrency(subcontractTotal)}</p>
                  </div>
                  <div className="text-center p-4 bg-slate-50 rounded-lg">
                    <ShoppingCart className="h-8 w-8 text-amber-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold">{pos.length}</p>
                    <p className="text-sm text-slate-500">{language === 'ar' ? 'أوامر شراء' : 'POs'}</p>
                    <p className="text-xs text-amber-600 mt-1">{formatCurrency(poTotal)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="boq" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-slate-600">
                  {language === 'ar' ? 'إجمالي بنود المستوى الثالث:' : 'Level 3 Items Total:'} 
                  <span className="font-bold ml-2">{formatCurrency(boqTotal)}</span>
                </p>
                <Link to={createPageUrl('BOQ') + `?project=${projectId}`}>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <FileSpreadsheet className="h-4 w-4 mr-1" />
                    {language === 'ar' ? 'فتح جدول الكميات' : 'Open BOQ'}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ipc" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-slate-600">
                  {language === 'ar' ? 'إجمالي المستخلصات:' : 'Total Certified:'} 
                  <span className="font-bold ml-2">{formatCurrency(certifiedAmount)}</span>
                </p>
                <Link to={createPageUrl('ClientIPC') + `?project=${projectId}`}>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Receipt className="h-4 w-4 mr-1" />
                    {language === 'ar' ? 'فتح المستخلصات' : 'Open IPCs'}
                  </Button>
                </Link>
              </div>
              {ipcs.length > 0 && (
                <div className="space-y-2">
                  {ipcs.slice(0, 5).map(ipc => (
                    <div key={ipc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium">{ipc.ipc_number}</p>
                        <p className="text-sm text-slate-500">{formatDate(ipc.ipc_date)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(ipc.current_gross_amount)}</p>
                        <Badge className={getStatusColor(ipc.status)}>{ipc.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subcontracts" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-slate-600">
                  {language === 'ar' ? 'إجمالي عقود الباطن:' : 'Total Subcontracts:'} 
                  <span className="font-bold ml-2">{formatCurrency(subcontractTotal)}</span>
                </p>
                <Link to={createPageUrl('Subcontracts') + `?project=${projectId}`}>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <HardHat className="h-4 w-4 mr-1" />
                    {language === 'ar' ? 'فتح عقود الباطن' : 'Open Subcontracts'}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="procurement" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-slate-600">
                  {language === 'ar' ? 'إجمالي أوامر الشراء:' : 'Total POs:'} 
                  <span className="font-bold ml-2">{formatCurrency(poTotal)}</span>
                </p>
                <Link to={createPageUrl('PurchaseOrders') + `?project=${projectId}`}>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <ShoppingCart className="h-4 w-4 mr-1" />
                    {language === 'ar' ? 'فتح أوامر الشراء' : 'Open POs'}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}