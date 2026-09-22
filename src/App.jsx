import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import SitePortalLayout from '@/pages/site/SitePortalLayout';
import SiteHome from '@/pages/site/SiteHome';
import ClientInspectionRequests from '@/pages/site/ClientInspectionRequests';
import ClientIRCreate from '@/pages/site/ClientIRCreate';
import ClientIRDetail from '@/pages/site/ClientIRDetail';
import SiteAttendance from '@/pages/site/SiteAttendance';
import SiteProgress from '@/pages/site/SiteProgress';
import SiteProgressDetail from '@/pages/site/SiteProgressDetail';
import SiteAttendanceDetail from '@/pages/site/SiteAttendanceDetail';
import TeamAttendance from '@/pages/site/TeamAttendance';
import SiteProduction from '@/pages/site/SiteProduction';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      {/* Site Portal (mobile shell, no main layout) */}
      <Route element={<SitePortalLayout />}>
        <Route path="/site" element={<SiteHome />} />
        <Route path="/site/ir" element={<ClientInspectionRequests mode="pending" />} />
        <Route path="/site/ir/new" element={<ClientIRCreate />} />
        <Route path="/site/ir/:id" element={<ClientIRDetail />} />
        <Route path="/site/attendance" element={<SiteAttendance />} />
        <Route path="/site/attendance/team" element={<TeamAttendance />} />
        <Route path="/site/attendance/:id" element={<SiteAttendanceDetail />} />
        <Route path="/site/progress" element={<SiteProgress />} />
        <Route path="/site/progress/:id" element={<SiteProgressDetail />} />
        <Route path="/site/production" element={<SiteProduction />} />
        <Route path="/site/reports" element={<ClientInspectionRequests mode="approved" />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <VisualEditAgent />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App