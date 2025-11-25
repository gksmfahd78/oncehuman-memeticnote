import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css'

// Lazy load all pages for code splitting
const Login = lazy(() => import('./pages/Login'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ClanDetails = lazy(() => import('./pages/ClanDetails'));
const MyMemetics = lazy(() => import('./pages/MyMemetics'));
const InviteJoin = lazy(() => import('./pages/InviteJoin'));
const Profile = lazy(() => import('./pages/Profile'));
const PublicProfile = lazy(() => import('./pages/PublicProfile'));
const Trades = lazy(() => import('./pages/Trades'));
const NewTrade = lazy(() => import('./pages/NewTrade'));
const EditTrade = lazy(() => import('./pages/EditTrade'));
const TradeDetail = lazy(() => import('./pages/TradeDetail'));
const WriteReview = lazy(() => import('./pages/WriteReview'));
const Chats = lazy(() => import('./pages/Chats'));
const SquadRecruitments = lazy(() => import('./pages/SquadRecruitments'));
const NewSquadRecruitment = lazy(() => import('./pages/NewSquadRecruitment'));
const SquadRecruitmentDetail = lazy(() => import('./pages/SquadRecruitmentDetail'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const BugReport = lazy(() => import('./pages/BugReport'));

// Loading component
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-400 mb-4"></div>
        <p className="text-gray-600 dark:text-gray-300">로딩 중...</p>
      </div>
    </div>
  );
}

function AppContent() {
  const location = useLocation();
  const hideNavbar = location.pathname === '/login' || location.pathname === '/auth/callback';

  return (
    <ErrorBoundary>
      <div className="bg-gray-100 dark:bg-gray-900 min-h-screen flex flex-col transition-colors duration-200">
        {!hideNavbar && <Navbar />}
        <div className={`flex-1 ${hideNavbar ? '' : 'container mx-auto px-4 py-4'}`}>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/clan/:clanId"
                element={
                  <PrivateRoute>
                    <ClanDetails />
                  </PrivateRoute>
                }
              />
              <Route
                path="/my-memetics"
                element={
                  <PrivateRoute>
                    <MyMemetics />
                  </PrivateRoute>
                }
              />
              <Route
                path="/invite/:inviteCode"
                element={
                  <PrivateRoute>
                    <InviteJoin />
                  </PrivateRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <PrivateRoute>
                    <Profile />
                  </PrivateRoute>
                }
              />
              <Route path="/users/:uid" element={<PublicProfile />} />
              <Route path="/trades" element={<Trades />} />
              <Route
                path="/trades/new"
                element={
                  <PrivateRoute>
                    <NewTrade />
                  </PrivateRoute>
                }
              />
              <Route
                path="/trades/:id/edit"
                element={
                  <PrivateRoute>
                    <EditTrade />
                  </PrivateRoute>
                }
              />
              <Route path="/trades/:id" element={<TradeDetail />} />
              <Route
                path="/trades/:id/review"
                element={
                  <PrivateRoute>
                    <WriteReview />
                  </PrivateRoute>
                }
              />
              <Route
                path="/chats"
                element={
                  <PrivateRoute>
                    <Chats />
                  </PrivateRoute>
                }
              />
              <Route path="/squad-recruitments" element={<SquadRecruitments />} />
              <Route
                path="/squad-recruitments/new"
                element={
                  <PrivateRoute>
                    <NewSquadRecruitment />
                  </PrivateRoute>
                }
              />
              <Route path="/squad-recruitments/:id" element={<SquadRecruitmentDetail />} />
              <Route
                path="/admin"
                element={
                  <PrivateRoute>
                    <AdminPanel />
                  </PrivateRoute>
                }
              />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/bug-report" element={<BugReport />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </div>
      {!hideNavbar && <Footer />}
    </div>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App
