import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { AppContent } from './components/AppContent';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Multi-tenant routes */}
            <Route path="/:accountId/:visitorId/dashboard" element={
              <ProtectedRoute>
                <AppContent />
              </ProtectedRoute>
            } />
            <Route path="/:accountId/:visitorId/reports" element={
              <ProtectedRoute>
                <AppContent />
              </ProtectedRoute>
            } />
            <Route path="/:accountId/:visitorId/ai-insights" element={
              <ProtectedRoute>
                <AppContent />
              </ProtectedRoute>
            } />
            <Route path="/:accountId/:visitorId/permissions" element={
              <ProtectedRoute>
                <AppContent />
              </ProtectedRoute>
            } />
            <Route path="/:accountId/:visitorId/settings" element={
              <ProtectedRoute>
                <AppContent />
              </ProtectedRoute>
            } />
            <Route path="/:accountId/:visitorId/privacy" element={
              <ProtectedRoute>
                <AppContent />
              </ProtectedRoute>
            } />
            <Route path="/:accountId/:visitorId/integrations" element={
              <ProtectedRoute>
                <AppContent />
              </ProtectedRoute>
            } />
            
            {/* Direct routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <AppContent />
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute>
                <AppContent />
              </ProtectedRoute>
            } />
            <Route path="/ai-insights" element={
              <ProtectedRoute>
                <AppContent />
              </ProtectedRoute>
            } />
            <Route path="/permissions" element={
              <ProtectedRoute>
                <AppContent />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <AppContent />
              </ProtectedRoute>
            } />
            <Route path="/privacy" element={
              <ProtectedRoute>
                <AppContent />
              </ProtectedRoute>
            } />
            <Route path="/integrations" element={
              <ProtectedRoute>
                <AppContent />
              </ProtectedRoute>
            } />
            
            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;