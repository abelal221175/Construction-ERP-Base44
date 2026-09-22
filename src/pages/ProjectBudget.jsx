import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/components/shared/LanguageContext';
import { useCompany } from '@/components/shared/CompanyContext';
import PageHeader from '@/components/shared/PageHeader';
import ExportButton from '@/components/shared/ExportButton';
import { formatNumber, formatCurrency, formatDate } from '@/components/shared/formatters';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  BarChart3,
  FileText,
  Plus,
  Calculator,
  Target,
  Sparkles,
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import BudgetFormModal from '@/components/budget/BudgetFormModal';
import BudgetVarianceChart from '@/components/budget/BudgetVarianceChart';
import BudgetVsActualTable from '@/components/budget/BudgetVsActualTable';
import BudgetAIAssistant from '@/components/budget/BudgetAIAssistant';

export default function ProjectBudget() {
  const { t, language, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();

  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', currentCompany?.id],
    queryFn: () => base44.entities.Project.filter({ company_id: currentCompany?.id }),
    enabled: !!currentCompany?.id,
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ['projectBudgets', selectedProject?.id],
    queryFn: () => selectedProject ? base44.entities.ProjectBudget.filter({ project_id: selectedProject.id }, '-version_number') : [],
    enabled: !!selectedProject,
  });

  const currentBudget = budgets.find(b => b.is_current_version) || budgets[0];

  const { data: budgetLines = [] } = useQuery({
    queryKey: ['budgetLines', currentBudget?.id],
    queryFn: () => currentBudget ? base44.entities.BudgetLine.filter({ budget_id: currentBudget.id }, 'line_number') : [],
    enabled: !!currentBudget,
  });

  const { data: boqItems = [] } = useQuery({
    queryKey: ['projectBOQ', selectedProject?.id],
    queryFn: () => selectedProject ? base44.entities.ProjectBOQ.filter({ project_id: selectedProject.id, level: 3 }) : [],
    enabled: !!selectedProject,
  });

  // Calculate metrics
  const totalBudget = currentBudget?.total_budget_amount || 0;
  const totalCommitted = currentBudget?.total_committed_amount || 0;
  const totalActual = currentBudget?.total_actual_amount || 0;
  const variance = totalBudget - totalActual;
  const variancePercentage = totalBudget > 0 ? ((variance / totalBudget) * 100) : 0;
  const consumedPercentage = totalBudget > 0 ? ((totalActual / totalBudget) * 100) : 0;

  const MetricCard = ({ title, value, subtitle, icon: Icon, trend, trendValue }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-slate-600">{title}</CardTitle>
        <Icon className="h-4 w-4 text-slate-400" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        {trend && (
          <div className={cn("flex items-center gap-1 text-xs mt-2", 
            trend === 'up' ? 'text-red-600' : 'text-emerald-600'
          )}>
            {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trendValue}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <PageHeader
        title={language === 'ar' ? 'ميزانية المشروع' : 'Project Budget'}
        subtitle={language === 'ar' ? 'إدارة وتتبع ميزانية المشروع' : 'Manage and track project budget'}
        onAdd={selectedProject ? () => setShowBudgetModal(true) : null}
        addLabel={language === 'ar' ? 'إنشاء ميزانية' : 'Create Budget'}
      >
        {currentBudget && (
          <ExportButton
            data={budgetLines}
            columns={[
              { header: language === 'ar' ? 'رقم البند' : 'Line No', accessor: 'line_number' },
              { header: language === 'ar' ? 'الوصف' : 'Description', accessor: 'description_en',
                render: (_, row) => language === 'ar' ? row.description_ar : row.description_en },
              { header: language === 'ar' ? 'نوع التكلفة' : 'Cost Type', accessor: 'cost_element_type' },
              { header: language === 'ar' ? 'الكمية' : 'Budget Qty', accessor: 'budget_quantity' },
              { header: language === 'ar' ? 'الميزانية' : 'Budget Amount', accessor: 'budget_amount' },
              { header: language === 'ar' ? 'الملتزم' : 'Committed', accessor: 'committed_amount' },
              { header: language === 'ar' ? 'الفعلي' : 'Actual', accessor: 'actual_amount' },
              { header: language === 'ar' ? 'الانحراف' : 'Variance', accessor: 'variance_amount' },
              { header: language === 'ar' ? 'الانحراف %' : 'Variance %', accessor: 'variance_percentage' },
            ]}
            filename={language === 'ar' ? 'تقرير_الميزانية' : 'Budget_Report'}
          />
        )}
      </PageHeader>

      {/* Project Selector */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm text-slate-600 mb-2 block">
                {language === 'ar' ? 'اختر المشروع' : 'Select Project'}
              </label>
              <Select value={selectedProject?.id || ''} onValueChange={(id) => {
                const project = projects.find(p => p.id === id);
                setSelectedProject(project);
                setSelectedBudget(null);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'اختر مشروع' : 'Select a project'} />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.project_code} - {language === 'ar' ? p.project_name_ar : p.project_name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {budgets.length > 0 && (
              <div className="flex-1">
                <label className="text-sm text-slate-600 mb-2 block">
                  {language === 'ar' ? 'الميزانية' : 'Budget'}
                </label>
                <Select value={currentBudget?.id || ''} onValueChange={(id) => {
                  const budget = budgets.find(b => b.id === id);
                  setSelectedBudget(budget);
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {budgets.map(b => (
                      <SelectItem key={b.id} value={b.id}>
                        {language === 'ar' ? b.budget_name_ar : b.budget_name_en} (v{b.version_number})
                        <Badge className="ml-2" variant={b.status === 'approved' ? 'default' : 'secondary'}>
                          {b.status}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Budget Overview */}
      {currentBudget && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MetricCard
              title={language === 'ar' ? 'إجمالي الميزانية' : 'Total Budget'}
              value={formatCurrency(totalBudget, 'EGP', 0)}
              icon={Target}
            />
            <MetricCard
              title={language === 'ar' ? 'الملتزم به' : 'Committed'}
              value={formatCurrency(totalCommitted, 'EGP', 0)}
              subtitle={`${formatNumber((totalCommitted / totalBudget) * 100, 1)}% ${language === 'ar' ? 'من الميزانية' : 'of budget'}`}
              icon={FileText}
            />
            <MetricCard
              title={language === 'ar' ? 'الفعلي المصروف' : 'Actual Spent'}
              value={formatCurrency(totalActual, 'EGP', 0)}
              subtitle={`${formatNumber(consumedPercentage, 1)}% ${language === 'ar' ? 'مستهلك' : 'consumed'}`}
              icon={DollarSign}
              trend={variancePercentage < 0 ? 'up' : 'down'}
              trendValue={`${Math.abs(variancePercentage).toFixed(1)}%`}
            />
            <MetricCard
              title={language === 'ar' ? 'الانحراف' : 'Variance'}
              value={formatCurrency(variance, 'EGP', 0)}
              subtitle={variance >= 0 ? (language === 'ar' ? 'تحت الميزانية' : 'Under budget') : (language === 'ar' ? 'فوق الميزانية' : 'Over budget')}
              icon={variance >= 0 ? CheckCircle : AlertTriangle}
            />
          </div>

          {/* Main Content + AI Panel */}
          <div className="flex gap-6">
            {/* Left: Tabs */}
            <div className="flex-1 min-w-0">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="overview">
                    <BarChart3 className="h-4 w-4 mr-1" />
                    {language === 'ar' ? 'نظرة عامة' : 'Overview'}
                  </TabsTrigger>
                  <TabsTrigger value="details">
                    <FileText className="h-4 w-4 mr-1" />
                    {language === 'ar' ? 'التفاصيل' : 'Details'}
                  </TabsTrigger>
                  <TabsTrigger value="variance">
                    <Calculator className="h-4 w-4 mr-1" />
                    {language === 'ar' ? 'تحليل الانحراف' : 'Variance Analysis'}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4">
                  <BudgetVarianceChart 
                    budgetLines={budgetLines}
                    language={language}
                  />
                </TabsContent>

                <TabsContent value="details" className="mt-4">
                  <BudgetVsActualTable
                    budgetLines={budgetLines}
                    boqItems={boqItems}
                    language={language}
                    isRTL={isRTL}
                  />
                </TabsContent>

                <TabsContent value="variance" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>{language === 'ar' ? 'تحليل الانحراف حسب نوع التكلفة' : 'Variance Analysis by Cost Type'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {['material', 'subcontractor', 'labor', 'equipment', 'service', 'indirect'].map(type => {
                          const typeLines = budgetLines.filter(l => l.cost_element_type === type);
                          const typeBudget = typeLines.reduce((sum, l) => sum + (l.budget_amount || 0), 0);
                          const typeActual = typeLines.reduce((sum, l) => sum + (l.actual_amount || 0), 0);
                          const typeVariance = typeBudget - typeActual;
                          const typeVariancePct = typeBudget > 0 ? ((typeVariance / typeBudget) * 100) : 0;
                          const typeLabels = {
                            material: { ar: 'المواد', en: 'Materials' },
                            subcontractor: { ar: 'مقاولي الباطن', en: 'Subcontractors' },
                            labor: { ar: 'العمالة', en: 'Labor' },
                            equipment: { ar: 'المعدات', en: 'Equipment' },
                            service: { ar: 'الخدمات', en: 'Services' },
                            indirect: { ar: 'تكاليف غير مباشرة', en: 'Indirect Costs' },
                          };
                          if (typeBudget === 0) return null;
                          return (
                            <div key={type} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                              <div className="flex-1">
                                <div className="font-medium">{language === 'ar' ? typeLabels[type].ar : typeLabels[type].en}</div>
                                <div className="text-sm text-slate-500">
                                  {language === 'ar' ? 'ميزانية:' : 'Budget:'} {formatCurrency(typeBudget, 'EGP', 0)} | 
                                  {language === 'ar' ? ' فعلي:' : ' Actual:'} {formatCurrency(typeActual, 'EGP', 0)}
                                </div>
                              </div>
                              <div className={cn("text-right", typeVariance >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                                <div className="font-bold">{formatCurrency(typeVariance, 'EGP', 0)}</div>
                                <div className="text-sm">{formatNumber(typeVariancePct, 1)}%</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Right: AI Assistant Panel */}
            <div className="w-80 flex-shrink-0">
              <BudgetAIAssistant
                project={selectedProject}
                budget={currentBudget}
                budgetLines={budgetLines}
                boqItems={boqItems}
                language={language}
                isRTL={isRTL}
              />
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {!selectedProject && (
        <Card className="p-12">
          <div className="text-center">
            <Target className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              {language === 'ar' ? 'لم يتم تحديد مشروع' : 'No Project Selected'}
            </h3>
            <p className="text-slate-500">
              {language === 'ar' ? 'الرجاء تحديد مشروع لعرض الميزانية' : 'Please select a project to view budget'}
            </p>
          </div>
        </Card>
      )}

      {/* Budget Modal */}
      {showBudgetModal && (
        <BudgetFormModal
          open={showBudgetModal}
          onClose={() => setShowBudgetModal(false)}
          project={selectedProject}
          boqItems={boqItems}
        />
      )}
    </div>
  );
}