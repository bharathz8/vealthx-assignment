import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AssetPage from './pages/assetPage';
import OAuthSuccess from './components/dashboard/oAuthSucess';

const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/assets" element={<AssetPage />} />
        <Route path='/oauth-success' element={<OAuthSuccess />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;