import React, { lazy, Suspense } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';
import ErrorBoundary from './components/common/ErrorBoundary';
import ProtectedRoute from './components/common/ProtectedRoute';

// Lazy-loaded pages
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const BoardPage = lazy(() => import('./pages/BoardPage'));
const YourTasksPage = lazy(() => import('./pages/YourTasksPage'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetailPage'));
const TeamPage = lazy(() => import('./pages/TeamPage'));
const ActivityPage = lazy(() => import('./pages/ActivityPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

// Full-page loading skeleton
const PageSkeleton = () => (
  <div className="space-y-6 animate-pulse p-2">
    <div className="h-8 w-48 bg-zinc-800/50 rounded-lg" />
    <div className="h-4 w-64 bg-zinc-800/30 rounded" />
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-28 bg-zinc-800/30 rounded-xl border border-zinc-800" />
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="h-80 bg-zinc-800/20 rounded-xl border border-zinc-800" />
      <div className="h-80 bg-zinc-800/20 rounded-xl border border-zinc-800" />
    </div>
  </div>
);

// Wrap lazy page with ErrorBoundary + Suspense
const LazyPage = ({ children }) => (
  <ErrorBoundary>
    <Suspense fallback={<PageSkeleton />}>
      {children}
    </Suspense>
  </ErrorBoundary>
);

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
    <Router>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#111',
            color: '#fafafa',
            border: '1px solid #27272a',
          },
        }}
      />
      <ErrorBoundary>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<LazyPage><DashboardPage /></LazyPage>} />
            <Route path="your-tasks" element={<LazyPage><YourTasksPage /></LazyPage>} />
            <Route path="board" element={<LazyPage><BoardPage /></LazyPage>} />
            <Route path="projects" element={<LazyPage><ProjectsPage /></LazyPage>} />
            <Route path="projects/:id" element={<LazyPage><ProjectDetailPage /></LazyPage>} />
            <Route path="team" element={<LazyPage><TeamPage /></LazyPage>} />
            <Route path="activity" element={<LazyPage><ActivityPage /></LazyPage>} />
            <Route path="settings" element={<LazyPage><SettingsPage /></LazyPage>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    </Router>
    </QueryClientProvider>
  );
};

export default App;
