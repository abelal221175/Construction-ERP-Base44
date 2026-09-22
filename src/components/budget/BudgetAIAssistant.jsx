import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
  Loader2,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  Plus,
  RefreshCw,
  CheckCircle,
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { formatCurrency, formatNumber } from '@/components/shared/formatters';
import { toast } from "sonner";

const SECTIONS = [
  {
    id: 'suggestions',
    icon: Plus,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    label: { ar: 'اقتراح بنود الميزانية', en: 'Suggest Budget Items' },
    desc: { ar: 'اقتراح بنود ناقصة بناءً على وصف المشروع والمشاريع المشابهة', en: 'Suggest missing line items based on project scope and similar past projects' },
  },
  {
    id: 'forecast',
    icon: TrendingUp,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    label: { ar: 'توقع تجاوزات التكلفة', en: 'Cost Overrun Forecast' },
    desc: { ar: 'توقع التجاوزات المحتملة بناءً على الاتجاهات الحالية', en: 'Predict potential overruns based on current spending trends' },
  },
  {
    id: 'savings',
    icon: Lightbulb,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    label: { ar: 'توصيات توفير التكاليف', en: 'Cost-Saving Recommendations' },
    desc: { ar: 'فرص تقليل التكاليف والتحسين', en: 'Opportunities to reduce costs and improve efficiency' },
  },
  {
    id: 'risks',
    icon: ShieldAlert,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    label: { ar: 'الشذوذات والمخاطر', en: 'Anomalies & Risks' },
    desc: { ar: 'رصد الشذوذات في الميزانية والمخاطر المحتملة', en: 'Detect budget anomalies and flag potential risks' },
  },
];

function buildBudgetContext(project, budget, budgetLines, boqItems) {
  const projectName = project?.project_name_en || project?.project_name_ar || 'Unknown';
  const totalBudget = budget?.total_budget_amount || 0;
  const totalActual = budget?.total_actual_amount || 0;
  const totalCommitted = budget?.total_committed_amount || 0;
  const spentPct = totalBudget > 0 ? ((totalActual / totalBudget) * 100).toFixed(1) : '0';

  const linesSummary = budgetLines.map(l => ({
    desc: l.description_en || l.description_ar,
    type: l.cost_element_type,
    budget: l.budget_amount,
    actual: l.actual_amount,
    committed: l.committed_amount,
    variance: (l.budget_amount || 0) - (l.actual_amount || 0),
  }));

  const boqDescriptions = boqItems.slice(0, 20).map(b =>
    `${b.external_code || b.system_code}: ${b.item_description} (qty: ${b.quantity}, unit price: ${b.unit_price})`
  ).join('\n');

  return {
    projectName,
    totalBudget,
    totalActual,
    totalCommitted,
    spentPct,
    linesSummary,
    boqDescriptions,
    contingency: budget?.contingency_percentage || 10,
  };
}

function AIResultCard({ result, language }) {
  if (!result) return null;

  const renderList = (items) => (
    <ul className="space-y-2 mt-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
          <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );

  const renderAlerts = (items, color = 'amber') => (
    <ul className="space-y-2 mt-2">
      {items.map((item, i) => (
        <li key={i} className={cn(
          "flex items-start gap-2 text-sm p-2 rounded-lg",
          color === 'red' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'
        )}>
          <AlertTriangle className={cn("h-4 w-4 mt-0.5 flex-shrink-0", color === 'red' ? 'text-red-500' : 'text-amber-500')} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );

  if (result.suggestions) return (
    <div>
      <p className="text-sm text-slate-500 mb-3">{result.summary}</p>
      {result.suggestions.map((s, i) => (
        <div key={i} className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-sm text-blue-900">{s.item_name}</span>
            <Badge variant="outline" className="text-xs">{s.cost_element_type}</Badge>
          </div>
          <p className="text-xs text-blue-700">{s.reason}</p>
          {s.estimated_cost > 0 && (
            <p className="text-xs text-blue-600 mt-1 font-mono font-semibold">
              {language === 'ar' ? 'التكلفة المقدرة:' : 'Est. Cost:'} {formatCurrency(s.estimated_cost, 'EGP', 0)}
            </p>
          )}
        </div>
      ))}
    </div>
  );

  if (result.overrun_risk) return (
    <div>
      <div className={cn(
        "flex items-center gap-2 mb-3 p-3 rounded-lg font-medium",
        result.overrun_risk === 'High' ? 'bg-red-100 text-red-700' :
        result.overrun_risk === 'Medium' ? 'bg-amber-100 text-amber-700' :
        'bg-emerald-100 text-emerald-700'
      )}>
        <TrendingUp className="h-5 w-5" />
        {language === 'ar' ? 'مستوى خطر التجاوز:' : 'Overrun Risk Level:'} {result.overrun_risk}
        {result.estimated_overrun_percentage > 0 && (
          <span className="ml-auto font-mono">+{result.estimated_overrun_percentage}%</span>
        )}
      </div>
      <p className="text-sm text-slate-600 mb-3">{result.summary}</p>
      {result.at_risk_items?.length > 0 && (
        <>
          <p className="text-xs font-semibold text-slate-500 uppercase mb-1">
            {language === 'ar' ? 'البنود المعرضة للخطر' : 'At-Risk Items'}
          </p>
          {renderAlerts(result.at_risk_items, result.overrun_risk === 'High' ? 'red' : 'amber')}
        </>
      )}
    </div>
  );

  if (result.recommendations) return (
    <div>
      <p className="text-sm text-slate-600 mb-3">{result.summary}</p>
      {result.recommendations.map((r, i) => (
        <div key={i} className="mb-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-sm text-emerald-900">{r.action}</span>
            {r.potential_saving > 0 && (
              <span className="text-xs text-emerald-700 font-mono font-semibold">
                -{formatCurrency(r.potential_saving, 'EGP', 0)}
              </span>
            )}
          </div>
          <p className="text-xs text-emerald-700">{r.description}</p>
          <Badge variant="outline" className="mt-2 text-xs">{r.category}</Badge>
        </div>
      ))}
    </div>
  );

  if (result.anomalies !== undefined) return (
    <div>
      <p className="text-sm text-slate-600 mb-3">{result.summary}</p>
      {result.anomalies?.length > 0 ? (
        <>
          <p className="text-xs font-semibold text-slate-500 uppercase mb-1">
            {language === 'ar' ? 'الشذوذات المكتشفة' : 'Detected Anomalies'}
          </p>
          {renderAlerts(result.anomalies, 'red')}
        </>
      ) : (
        <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 p-3 rounded-lg">
          <CheckCircle className="h-5 w-5" />
          <span className="text-sm">{language === 'ar' ? 'لا توجد شذوذات' : 'No anomalies detected'}</span>
        </div>
      )}
      {result.risks?.length > 0 && (
        <>
          <p className="text-xs font-semibold text-slate-500 uppercase mt-4 mb-1">
            {language === 'ar' ? 'المخاطر المحتملة' : 'Potential Risks'}
          </p>
          {renderAlerts(result.risks, 'amber')}
        </>
      )}
    </div>
  );

  return <p className="text-sm text-slate-600">{JSON.stringify(result)}</p>;
}

export default function BudgetAIAssistant({ project, budget, budgetLines, boqItems, language, isRTL }) {
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState({});
  const [results, setResults] = useState({});

  const ctx = buildBudgetContext(project, budget, budgetLines, boqItems);

  const prompts = {
    suggestions: {
      prompt: `You are a construction ERP AI assistant. Analyze this project and suggest missing or recommended budget line items.

Project: ${ctx.projectName}
Total Budget: EGP ${ctx.totalBudget}
BOQ Items:
${ctx.boqDescriptions}

Existing budget lines: ${ctx.linesSummary.map(l => l.desc).join(', ')}

Suggest up to 6 missing budget line items that are typically required for similar construction projects but are not yet included. Consider standard construction costs like mobilization, site facilities, safety equipment, testing, commissioning, etc.`,
      schema: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          suggestions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                item_name: { type: 'string' },
                cost_element_type: { type: 'string' },
                reason: { type: 'string' },
                estimated_cost: { type: 'number' },
              }
            }
          }
        }
      }
    },
    forecast: {
      prompt: `You are a construction ERP AI assistant. Analyze spending trends and forecast cost overrun risk.

Project: ${ctx.projectName}
Total Budget: EGP ${ctx.totalBudget}
Total Actual Spent: EGP ${ctx.totalActual} (${ctx.spentPct}% consumed)
Total Committed: EGP ${ctx.totalCommitted}
Contingency: ${ctx.contingency}%

Budget Lines (desc | budget | actual | variance):
${ctx.linesSummary.map(l => `${l.desc} | ${l.budget} | ${l.actual} | ${l.variance}`).join('\n')}

Assess the risk of cost overrun: High / Medium / Low. Identify which line items are at risk of overrunning their budget. Provide estimated overrun percentage if applicable.`,
      schema: {
        type: 'object',
        properties: {
          overrun_risk: { type: 'string' },
          estimated_overrun_percentage: { type: 'number' },
          summary: { type: 'string' },
          at_risk_items: { type: 'array', items: { type: 'string' } },
        }
      }
    },
    savings: {
      prompt: `You are a construction ERP AI assistant. Identify cost-saving opportunities for this project budget.

Project: ${ctx.projectName}
Total Budget: EGP ${ctx.totalBudget}
Total Actual Spent: EGP ${ctx.totalActual}

Budget Lines (type | desc | budget | actual):
${ctx.linesSummary.map(l => `${l.type} | ${l.desc} | ${l.budget} | ${l.actual}`).join('\n')}

Provide up to 5 specific, actionable cost-saving recommendations with potential savings amounts. Focus on procurement optimization, subcontractor management, material alternatives, labor efficiency, and equipment utilization.`,
      schema: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          recommendations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                action: { type: 'string' },
                description: { type: 'string' },
                category: { type: 'string' },
                potential_saving: { type: 'number' },
              }
            }
          }
        }
      }
    },
    risks: {
      prompt: `You are a construction ERP AI assistant. Detect budget anomalies and flag financial risks.

Project: ${ctx.projectName}
Total Budget: EGP ${ctx.totalBudget}
Spent: EGP ${ctx.totalActual} (${ctx.spentPct}%)
Committed: EGP ${ctx.totalCommitted}
Contingency: ${ctx.contingency}%

Budget Lines (desc | budget | actual | committed | variance):
${ctx.linesSummary.map(l => `${l.desc} | ${l.budget} | ${l.actual} | ${l.committed} | ${l.variance}`).join('\n')}

Identify any anomalies (unusual spending patterns, items way over or under budget, items with no activity) and financial risks (insufficient contingency, high commitment ratios, etc.).`,
      schema: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          anomalies: { type: 'array', items: { type: 'string' } },
          risks: { type: 'array', items: { type: 'string' } },
        }
      }
    }
  };

  const runAnalysis = async (sectionId) => {
    if (!budget) {
      toast.error(language === 'ar' ? 'لا توجد ميزانية محددة' : 'No budget selected');
      return;
    }
    setLoading(prev => ({ ...prev, [sectionId]: true }));
    try {
      const { prompt, schema } = prompts[sectionId];
      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: schema,
      });
      setResults(prev => ({ ...prev, [sectionId]: result }));
    } catch (e) {
      toast.error(language === 'ar' ? 'خطأ في الاتصال بالذكاء الاصطناعي' : 'AI analysis failed');
    } finally {
      setLoading(prev => ({ ...prev, [sectionId]: false }));
    }
  };

  return (
    <div className="space-y-3" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">
            {language === 'ar' ? 'مساعد الذكاء الاصطناعي للميزانية' : 'AI Budget Assistant'}
          </h3>
          <p className="text-xs text-slate-500">
            {language === 'ar' ? 'تحليل وتوصيات مدعومة بالذكاء الاصطناعي' : 'AI-powered analysis & recommendations'}
          </p>
        </div>
      </div>

      {!budget && (
        <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed rounded-xl">
          <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-40" />
          {language === 'ar' ? 'يرجى تحديد مشروع وميزانية أولاً' : 'Please select a project and budget first'}
        </div>
      )}

      {SECTIONS.map((section) => {
        const Icon = section.icon;
        const isOpen = expanded === section.id;
        const isLoading = loading[section.id];
        const result = results[section.id];

        return (
          <Card key={section.id} className={cn("overflow-hidden border", isOpen && section.border)}>
            <button
              className="w-full text-left"
              onClick={() => setExpanded(isOpen ? null : section.id)}
              disabled={!budget}
            >
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", section.bg)}>
                      <Icon className={cn("h-4 w-4", section.color)} />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-sm text-slate-900">
                        {language === 'ar' ? section.label.ar : section.label.en}
                      </p>
                      <p className="text-xs text-slate-500">
                        {language === 'ar' ? section.desc.ar : section.desc.en}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {result && (
                      <Badge variant="secondary" className="text-xs">
                        {language === 'ar' ? 'مكتمل' : 'Done'}
                      </Badge>
                    )}
                    {isOpen ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                  </div>
                </div>
              </CardHeader>
            </button>

            {isOpen && (
              <CardContent className="pt-0 px-4 pb-4">
                <Separator className="mb-4" />

                {/* Run Button */}
                <Button
                  size="sm"
                  variant={result ? 'outline' : 'default'}
                  className={cn(!result && "bg-violet-600 hover:bg-violet-700")}
                  onClick={() => runAnalysis(section.id)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : result ? (
                    <RefreshCw className="h-4 w-4 mr-1" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-1" />
                  )}
                  {isLoading
                    ? (language === 'ar' ? 'جاري التحليل...' : 'Analyzing...')
                    : result
                    ? (language === 'ar' ? 'إعادة التحليل' : 'Re-analyze')
                    : (language === 'ar' ? 'تشغيل التحليل' : 'Run Analysis')}
                </Button>

                {/* Results */}
                {result && (
                  <div className="mt-4">
                    <AIResultCard result={result} language={language} />
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}