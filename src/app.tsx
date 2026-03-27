// App.tsx
import { AppProviders } from './components/app-providers.tsx'
import { AppLayout } from './components/app-layout.tsx'
import { RouteObject, useRoutes } from 'react-router'
import { lazy } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WalletProvider } from './contexts/WalletContext'

// Create a client for React Query
const queryClient = new QueryClient()

const links = [
  { label: 'Leaderboard', path: '/leaderboard', icon: '/leaderboard.png' },
  { label: 'Home', path: '/home', icon: '/home.png' },
  { label: 'Account', path: '/account', icon: '/profile.png' },
]

const LazyWelcome = lazy(() => import('./components/welcome/welcome-feature'))
const LazyLeaderboard = lazy(() => import('./components/leaderboard/leaderboard-feature'))
const LazyAccountIndex = lazy(() => import('./components/account/account-index-feature'))
const LazyAccountDetail = lazy(() => import('./components/account/account-detail-feature'))
const LazyDashboard = lazy(() => import('./components/dashboard/dashboard-feature'))
const LazyGamePage = lazy(() => import('./pages/GamePage').then(mod => ({ default: mod.GamePage })))

const routes: RouteObject[] = [
  { path: '/', element: <LazyWelcome /> },
  { path: 'home', element: <LazyDashboard /> },
  {
    path: 'account',
    children: [
      { index: true, element: <LazyAccountIndex /> },
      { path: ':address', element: <LazyAccountDetail /> },
    ],
  },
  { path: 'leaderboard', element: <LazyLeaderboard /> },
  { path: 'game/:level', element: <LazyGamePage /> },
]

export function App() {
  const router = useRoutes(routes)
  
  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <AppProviders>
          <AppLayout links={links}>{router}</AppLayout>
        </AppProviders>
      </WalletProvider>
    </QueryClientProvider>
  )
}