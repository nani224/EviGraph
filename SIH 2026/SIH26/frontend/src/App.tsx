import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Shell from './components/layout/Shell';
import ErrorBoundary from './components/shared/ErrorBoundary';
import AuthGuard from './components/shared/AuthGuard';

// Authentication & Administration
import Login from './pages/Login';
import AdminDashboard from './pages/Admin';

// Primary E-Crime Graph Hero Interface
import ECrimeGraph from './pages/ECrimeGraph';

// Supporting Modules
import Dashboard from './pages/Dashboard';
import NetworkExplorer from './pages/NetworkExplorer';
import GraphAnalyticsPage from './pages/GraphAnalytics';
import EntitySearch from './pages/EntitySearch';
import Anomalies from './pages/Anomalies';
import Contradictions from './pages/Contradictions';
import AIAssistant from './pages/AIAssistant';
import DataSources from './pages/DataSources';
import ModelValidation from './pages/ModelValidation';
import DemoMode from './pages/DemoMode';
import Timeline from './pages/Timeline';
import EntityResolution from './pages/EntityResolution';
import Cases from './pages/Cases';
import Evidence from './pages/Evidence';
import VideoIntel from './pages/VideoIntel';
import LocationIntel from './pages/LocationIntel';
import FIRIntel from './pages/FIRIntel';
import Settings from './pages/Settings';

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Public Common Authentication Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected EviGraph Platform */}
          <Route
            path="/"
            element={
              <AuthGuard>
                <Shell />
              </AuthGuard>
            }
          >
            {/* Dedicated Administrative Control Center (Role-Enforced) */}
            <Route
              path="admin"
              element={
                <AuthGuard requiredRole="ADMIN">
                  <AdminDashboard />
                </AuthGuard>
              }
            />

            {/* Central E-Crime Graph Experience */}
            <Route index element={<ECrimeGraph />} />
            <Route path="discovery" element={<ECrimeGraph />} />
            
            {/* Supporting Investigation Tools */}
            <Route path="overview" element={<Dashboard />} />
            <Route path="cases" element={<Cases />} />
            <Route path="network" element={<NetworkExplorer />} />
            <Route path="analytics" element={<GraphAnalyticsPage />} />
            <Route path="search" element={<EntitySearch />} />
            <Route path="locations" element={<LocationIntel />} />
            <Route path="timeline" element={<Timeline />} />
            <Route path="anomalies" element={<Anomalies />} />
            <Route path="contradictions" element={<Contradictions />} />
            <Route path="evidence" element={<Evidence />} />
            <Route path="resolution" element={<EntityResolution />} />
            <Route path="fir" element={<FIRIntel />} />
            <Route path="datasources" element={<DataSources />} />
            <Route path="validation" element={<ModelValidation />} />
            <Route path="video" element={<VideoIntel />} />
            <Route path="assistant" element={<AIAssistant />} />
            <Route path="demo" element={<DemoMode />} />
            <Route path="settings" element={<Settings />} />

            {/* Catch-all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
