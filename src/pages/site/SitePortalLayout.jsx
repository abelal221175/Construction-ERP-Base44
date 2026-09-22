import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Home, ListChecks, BarChart3, UserCheck, TrendingUp } from 'lucide-react';
import { useLanguage, LanguageProvider } from '@/components/shared/LanguageContext';
import { CompanyProvider } from '@/components/shared/CompanyContext';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const TABS = [
  { to: '/site', icon: Home, labelAr: 'الرئيسية', labelEn: 'Home', match: (p) => p === '/site' },
  { to: '/site/attendance', icon: UserCheck, labelAr: 'الحضور', labelEn: 'Attendance', match: (p) => p === '/site/attendance' },
  { to: '/site/progress', icon: TrendingUp, labelAr: 'التقدم', labelEn: 'Progress', match: (p) => p === '/site/progress' },
  { to: '/site/ir', icon: ListChecks, labelAr: 'المهام', labelEn: 'Tasks', match: (p) => p === '/site/ir' },
  { to: '/site/reports', icon: BarChart3, labelAr: 'التقارير', labelEn: 'Reports', match: (p) => p === '/site/reports' },
];

function SitePortalContent() {
  const { language, dir } = useLanguage();
  const location = useLocation();

  return (
    <div dir={dir} className="min-h-screen bg-slate-200 flex justify-center">
      <div className="w-full max-w-md bg-slate-50 min-h-screen flex flex-col relative shadow-xl">
        <main className="flex-1 pb-20 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Bottom tab bar */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-200 flex z-50 h-16">
          {TABS.map((tab) => {
            const active = tab.match(location.pathname);
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center gap-0.5 transition-all duration-200 relative',
                  active ? 'text-erp-accent' : 'text-slate-400 hover:text-slate-600'
                )}
              >
                <tab.icon className={cn('h-5 w-5 transition-transform', active && 'scale-110')} />
                <span className={cn('text-[10px] font-medium', active && 'font-semibold')}>{language === 'ar' ? tab.labelAr : tab.labelEn}</span>
                {active && (
                  <span className="absolute top-0 h-1 w-10 bg-erp-accent rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export default function SitePortalLayout() {
  return (
    <LanguageProvider>
      <CompanyProvider>
        <SitePortalContent />
      </CompanyProvider>
    </LanguageProvider>
  );
}