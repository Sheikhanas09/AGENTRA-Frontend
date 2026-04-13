import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./components/pages/Login";
import Signup from "./components/pages/Signup";
import SuperAdminDashboard from "./components/superAdmin/SuperAdminDashboard";
import EmployeeDashboard from "./components/employee/EmployeeDashboard";
import CeoDashboard from "./components/ceo/Dashboard";
import JobPortal from "./components/pages/JobPortal"; // ← naya

// ──── Protected Route ────
function ProtectedRoute({ children, allowedRole }) {
  const role = localStorage.getItem("role");
  const token = localStorage.getItem("token");

  if (!token) return <Navigate to="/" />;
  if (allowedRole && role !== allowedRole) return <Navigate to="/" />;

  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/jobs" element={<JobPortal />} /> {/* ← naya */}
        {/* Super Admin Routes */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRole="superadmin">
              <SuperAdminDashboard />
            </ProtectedRoute>
          }
        />
        {/* CEO Routes */}
        <Route
          path="/ceo/dashboard"
          element={
            <ProtectedRoute allowedRole="ceo">
              <CeoDashboard />
            </ProtectedRoute>
          }
        />
        {/* Employee Routes */}
        <Route
          path="/employee/dashboard"
          element={
            <ProtectedRoute allowedRole="employee">
              <EmployeeDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
