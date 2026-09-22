import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/components/shared/LanguageContext';
import { useCompany } from '@/components/shared/CompanyContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, ChevronLeft, Calendar } from 'lucide-react';
import IRStatusBadge from '@/components/site/IRStatusBadge';
import { formatDate } from '@/components/shared/formatters';
import { cn } from '@/lib/utils';

export default function ClientInspectionRequests({ mode = 'pending' }) {
  const { language, isRTL } = useLanguage();
  const { currentCompany } = useCompany();
  const [search, setSearch] = useState('');
  const cf = currentCompany ? { company_id: currentCompany.id } : {};

  const { data: irs = [], isLoading } = useQuery({
    queryKey: ['siteIRs', currentCompany?.id],
    queryFn: () =>
      currentCompany ? base44.entities.ClientInspectionRequest.filter(cf) : base44.entities.ClientInspectionRequest.list(),
    staleTime: 30_000,
  });

  const filtered = useMemo(() => {
    let list = irs;
    if (mode === 'pending') {
      list = list.filter((i) => ['Draft', 'Submitted-to-Consultant', 'Under-Review', 'Revision-Required'].includes(i.status));
    } else if (mode === 'approved') {
      list = list.filter((i) => i.status === 'Approved');
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((i) => i.ir_number?.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  }, [irs, mode, search]);

  const title = mode === 'approved'
    ? (language === 'ar' ? 'طلبات معتمدة' : 'Approved IRs')
    : (language === 'ar' ? 'طلبات المعاينة' : 'Inspection Requests');

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Link to="/site">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronLeft className={cn('h-5 w-5', isRTL && 'rotate-180')} />
          </Button>
        </Link>
        <h1 className="font-display text-[16px] font-semibold text-slate-800 flex-1">{title}</h1>
        <Link to="/site/ir/new">
          <Button size="icon" className="h-8 w-8">
            <Plus className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={language === 'ar' ? 'بحث برقم الطلب...' : 'Search by IR number...'}
          className="h-9 pl-9 text-[13px]"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center text-[12px] text-slate-400 py-10">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center border-erp-border">
          <p className="text-[13px] text-slate-400 mb-3">
            {language === 'ar' ? 'لا توجد طلبات' : 'No requests found'}
          </p>
          <Link to="/site/ir/new">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              {language === 'ar' ? 'إنشاء طلب جديد' : 'Create new IR'}
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((ir) => (
            <Link key={ir.id} to={`/site/ir/${ir.id}`}>
              <Card className="p-3 border-erp-border hover:border-erp-accent transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-[13px] font-semibold text-slate-700">{ir.ir_number}</span>
                  <IRStatusBadge status={ir.status} language={language} />
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Calendar className="h-3 w-3" />
                  {formatDate(ir.ir_date)}
                  {ir.ipc_period ? ` · IPC ${ir.ipc_period}` : ''}
                </div>
                {ir.total_items > 0 && (
                  <div className="text-[11px] text-slate-500 mt-1">
                    {ir.total_items} {language === 'ar' ? 'بند' : 'items'}
                  </div>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}