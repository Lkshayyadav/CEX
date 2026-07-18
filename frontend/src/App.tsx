import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Layout } from './components/Layout';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { WalletPage } from './pages/WalletPage';
import { AuthProvider } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';

function App() {
  return (
    <AuthProvider>
      <WebSocketProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<LandingPage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="wallet" element={<WalletPage />} />
            </Route>
          </Routes>
        </BrowserRouter>

        {/* Global toast notification container */}
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1e2129',
              color: '#e0e0e0',
              border: '1px solid #2a2d36',
              fontSize: '13px',
              borderRadius: '12px',
              fontFamily: 'inherit',
            },
            success: {
              iconTheme: { primary: '#0ecb81', secondary: '#1e2129' },
            },
            error: {
              iconTheme: { primary: '#f6465d', secondary: '#1e2129' },
            },
          }}
        />
      </WebSocketProvider>
    </AuthProvider>
  );
}

export default App;
