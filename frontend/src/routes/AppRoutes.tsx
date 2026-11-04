import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../modules/auth/AuthContext';
import Login from '../modules/auth/Login';
import Register from '../modules/auth/Register';
import PortalPage from '../modules/portal/PortalPage';
import Resume from '../modules/resume/Resume';
import AccountsPage from '../modules/accounts/AccountsPage';
import CardsPage from '../modules/cards/CardsPage';
import CardDetailsPage from '../modules/cards/CardDetailsPage';
import TransactionsPage from '../modules/transactions/TransactionsPage';
import CategoriesPage from '../modules/categories/CategoriesPage';
import BudgetsPage from '../modules/budgets/BudgetsPage';
import FocusedAccountsScreen from '../modules/accounts/FocusedAccountsScreen';
import FocusedCardsScreen from '../modules/cards/FocusedCardsScreen';
import Layout from '../components/Layout';
import DetailLayer from '../components/DetailLayer';
import { PageScrollContext } from '../hooks/usePageScrollRestoration';
import type { Location } from 'react-router-dom';
import MaintenancePage from '../components/MaintenancePage';
import { CircularProgress, Box } from '@mui/material';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const detailRoutes = [
  <Route key="card" path="/detalhe/cartao/:cardId" element={<ProtectedRoute><CardDetailsPage /></ProtectedRoute>} />,
  <Route key="accounts" path="/detalhe/contas" element={<ProtectedRoute><FocusedAccountsScreen /></ProtectedRoute>} />,
  <Route key="cards" path="/detalhe/faturas" element={<ProtectedRoute><FocusedCardsScreen /></ProtectedRoute>} />,
  <Route key="transactions" path="/detalhe/:tipo" element={<ProtectedRoute><TransactionsPage /></ProtectedRoute>} />,
];

const AppRoutes: React.FC = () => {
  const location = useLocation();
  const background = location.pathname.startsWith('/detalhe/')
    ? (location.state?.backgroundLocation as Location | undefined)
    : undefined;
  return (
    <>
    <PageScrollContext.Provider value={{ suspended: Boolean(background) }}>
    <Routes location={background}>
      <Route path="/portal" element={<PortalPage />} />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />

      {detailRoutes}

      {/* Protected Layout Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Resume />} />
        <Route path="contas" element={<AccountsPage />} />
        <Route path="transacoes" element={<TransactionsPage />} />
        <Route path="cartoes" element={<CardsPage />} />
        <Route path="investimentos" element={<MaintenancePage />} />
        <Route path="relatorios" element={<MaintenancePage />} />
        <Route path="categorias" element={<CategoriesPage />} />
        <Route path="orcamentos" element={<BudgetsPage />} />
        <Route path="objetivos" element={<MaintenancePage />} />
        <Route path="mia" element={<MaintenancePage />} />
        <Route path="ferramentas" element={<MaintenancePage />} />
        <Route path="configuracoes" element={<MaintenancePage />} />
        <Route path="planos" element={<MaintenancePage />} />
        <Route path="ajuda" element={<MaintenancePage />} />
        <Route path="sobre" element={<MaintenancePage />} />
        <Route path="graficos" element={<MaintenancePage />} />
        <Route path="tags" element={<MaintenancePage />} />
        <Route path="calendario" element={<MaintenancePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </PageScrollContext.Provider>
    <DetailLayer location={background ? location : null}>{detailRoutes}</DetailLayer>
    </>
  );
};

export default AppRoutes;
