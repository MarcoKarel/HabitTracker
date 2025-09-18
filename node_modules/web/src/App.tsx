import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AuthForm } from './components/auth/AuthForm';
import { AuthCallback } from './components/auth/AuthCallback';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Dashboard } from './components';
import { GlobalStyles } from './styles';
import { registerServiceWorker } from './services/notificationService';

function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  
  return <AuthForm mode={mode} onModeChange={setMode} />;
}

function App() {
  useEffect(() => {
    // Register service worker for notifications
    registerServiceWorker();
  }, []);

  return (
    <AuthProvider>
      <GlobalStyles />
      <Router>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
