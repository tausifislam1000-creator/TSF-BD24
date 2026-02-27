import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import AdminLoginPage from './pages/AdminLoginPage';
import WalletPage from './pages/WalletPage';
import AdminDashboard from './pages/AdminDashboard';
import CrashGame from './pages/CrashGame';
import CoinFlip from './pages/CoinFlip';
import WingoGame from './pages/WingoGame';
import MinesGame from './pages/MinesGame';
import ProfilePage from './pages/ProfilePage';
import SupportPage from './pages/SupportPage';
import TournamentsPage from './pages/TournamentsPage';
import TournamentDetailsPage from './pages/TournamentDetailsPage';

const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) => {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" />;
  if (adminOnly && user?.role !== 'admin') return <Navigate to="/" />;
  return <>{children}</>;
};

function AppRoutes() {
  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-emerald-500 selection:text-black">
      <Navbar />
      <main className="pt-20 pb-12">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin-login" element={<AdminLoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
          <Route path="/games/crash" element={<CrashGame />} />
          <Route path="/games/coinflip" element={<CoinFlip />} />
          <Route path="/games/wingo" element={<WingoGame />} />
          <Route path="/games/mines" element={<MinesGame />} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/tournaments" element={<TournamentsPage />} />
          <Route path="/tournaments/:id" element={<TournamentDetailsPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
