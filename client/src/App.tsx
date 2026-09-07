import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { RequireAuth, GuestOnly } from '@/components/auth/Guards';
import AppShell from '@/components/layout/AppShell';
import { ToastHost } from '@/lib/toast';
import { useRealtime } from '@/hooks/useRealtime';
import { useAuthStore } from '@/stores/authStore';
import { applyAccent, getLocalAccent, isAccentId, normalizeAccent } from '@/lib/accent';
import LoaderHelix from '@/components/ui/LoaderHelix';

import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import ForgotPassword from '@/pages/auth/ForgotPassword';
import ResetPassword from '@/pages/auth/ResetPassword';
import NotFound from '@/pages/NotFound';

// Lazy chunks keep the initial bundle lean — analytics / charts are heavy,
// and route pages only pull in their deps when first opened.
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Projects = lazy(() => import('@/pages/Projects'));
const ProjectLayout = lazy(() => import('@/pages/project/ProjectLayout'));
const BoardPage = lazy(() => import('@/pages/project/BoardPage'));
const Members = lazy(() => import('@/pages/project/Members'));
const Activity = lazy(() => import('@/pages/project/Activity'));
const Analytics = lazy(() => import('@/pages/project/Analytics'));
const Calendar = lazy(() => import('@/pages/Calendar'));
const Search = lazy(() => import('@/pages/Search'));
const Settings = lazy(() => import('@/pages/Settings'));
const MyTasks = lazy(() => import('@/pages/MyTasks'));
const Notifications = lazy(() => import('@/pages/Notifications'));

const PageLoader = () => (
  <div className="h-full flex items-center justify-center py-16">
    <LoaderHelix speed={900} />
  </div>
);

const lazyPage = (el: ReactNode) => <Suspense fallback={<PageLoader />}>{el}</Suspense>;

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

  // Restore the user's appearance: the DB value wins, with the device value as
  // a fallback for accounts that haven't picked a color yet.
  useEffect(() => {
    applyAccent(normalizeAccent(isAccentId(user?.accentColor) ? user.accentColor : getLocalAccent()));
  }, [user?.accentColor, user?.id]);

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
          <Route index element={lazyPage(<Dashboard />)} />
          <Route path="projects" element={lazyPage(<Projects />)} />
          <Route path="tasks" element={lazyPage(<MyTasks />)} />
          <Route path="notifications" element={lazyPage(<Notifications />)} />
          <Route path="projects/:id" element={lazyPage(<ProjectLayout />)}>
            <Route index element={<Navigate to="board" replace />} />
            <Route path="board" element={lazyPage(<BoardPage />)} />
            <Route path="members" element={lazyPage(<Members />)} />
            <Route path="activity" element={lazyPage(<Activity />)} />
            <Route path="analytics" element={lazyPage(<Analytics />)} />
          </Route>
          <Route path="calendar" element={lazyPage(<Calendar />)} />
          <Route path="search" element={lazyPage(<Search />)} />
          <Route path="settings" element={lazyPage(<Settings />)} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {user && <ToastHost />}
    </>
  );
}
