import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ColorModeProvider from './theme/ColorModeProvider';
import { AuthProvider } from './modules/auth/AuthContext';
import AppRoutes from './routes/AppRoutes';
import BrandingMetadata from './components/BrandingMetadata';

const queryClient = new QueryClient();

const App: React.FC = () => {
  useEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => { window.history.scrollRestoration = previous; };
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <ColorModeProvider>
        <BrowserRouter>
          <BrandingMetadata />
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </ColorModeProvider>
    </QueryClientProvider>
  );
};

export default App;
