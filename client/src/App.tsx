import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { RequireAuth, GuestOnly } from '@/components/auth/Guards';
import AppShell from '@/components/layout/AppShell';
import { ToastHost } from '@/lib/toast';
import { useRealtime } from '@/hooks/useRealtime';
import { useAuthStore } from '@/stores/authStore';
import Spinner from '@/components/ui/Spinner';

import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import ForgotPassword from '@/pages/auth/ForgotPassword';
import ResetPassword from '@/pages/auth/ResetPassword';
import Dashboard from '@/pages/Dashboard';
import Projects from '@/pages/Projects';
import ProjectLayout from '@/pages/project/ProjectLayout';
import BoardPage from '@/pages/project/BoardPage';
import Members from '@/pages/project/Members';
import Activity from '@/pages/project/Activity';
import Calendar from '@/pages/Calendar';
import Search from '@/pages/Search';
import Settings from '@/pages/Settings';
import MyTasks from '@/pages/MyTasks';
import Notifications from '@/pages/Notifications';

// Recharts is heavy — load analytics on demand.
const Analytics = lazy(() => import('@/pages/project/Analytics'));

const PageLoader = () => (
  <div className="flex justify-center py-16">
    <Spinner size={24} />
  </div>
);

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-slate-400">
      <h1 className="text-3xl font-bold text-slate-200 mb-2">404</h1>
      <p className="mb-4">Page not found</p>
      <Link to="/" className="text-brand-400 hover:text-brand-300">Back to dashboard</Link>
    </div>
  );
}

export default function App() {
  const user = useAuthStore((s) => s.user);
  useRealtime();

  // Keep the browser tab title in sync with the signed-in workspace owner.
  useEffect(() => {
    const base = 'ProjectFlow';
    if (user?.name) {
      document.title = `${user.name} — ${base}`;
    } else {
      document.title = base;
    }
  }, [user?.name]);

  return (
    <>
      <Routes>
        <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
        <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route
          path="/"
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="projects" element={<Projects />} />
          <Route path="tasks" element={<MyTasks />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="projects/:id" element={<ProjectLayout />}>
            <Route index element={<Navigate to="board" replace />} />
            <Route path="board" element={<BoardPage />} />
            <Route path="members" element={<Members />} />
            <Route path="activity" element={<Activity />} />
            <Route path="analytics" element={<Suspense fallback={<PageLoader />}><Analytics /></Suspense>} />
          </Route>
          <Route path="calendar" element={<Calendar />} />
          <Route path="search" element={<Search />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {user && <ToastHost />}
    </>
  );
}
