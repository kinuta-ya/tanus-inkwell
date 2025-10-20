import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginScreen } from './components/auth/LoginScreen';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { RepositoriesPage } from './pages/RepositoriesPage';
import { EditorPage } from './pages/EditorPage';
import { DebugPanel } from './components/DebugPanel';

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          <Route
            path="/repositories"
            element={
              <ProtectedRoute>
                <RepositoriesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/editor/:repoId"
            element={
              <ProtectedRoute>
                <EditorPage />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/repositories" replace />} />
          <Route path="*" element={<Navigate to="/repositories" replace />} />
        </Routes>
      </BrowserRouter>
      <DebugPanel />
    </>
  );
}

export default App;
