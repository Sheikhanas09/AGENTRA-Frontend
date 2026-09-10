import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Home from "./components/pages/Home";
import Login from "./components/pages/Login";
import Signup from "./components/pages/Signup";
import SuperAdminDashboard from "./components/superAdmin/SuperAdminDashboard";
import EmployeeDashboard from "./components/employee/EmployeeDashboard";
import CeoDashboard from "./components/ceo/Dashboard";
import JobPortal from "./components/pages/JobPortal";

// ──── Protected Route ────
function ProtectedRoute({ children, allowedRole }) {
  const role = localStorage.getItem("role");
  const token = localStorage.getItem("token");

  // ⚠ `/login`, `/` nahi. `/` ab home hai; bina token wale ko wahan
  // bhejne ka matlab yeh hota ke wo landing page dekhta rahe aur usay
  // yeh pata hi na chale ke usay login karna hai.
  if (!token) return <Navigate to="/login" replace />;
  if (allowedRole && role !== allowedRole) return <Navigate to="/login" replace />;

  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        {/* ⚠ `/` ab HOME hai, login nahi.
            Pehle website khulte hi splash aati thi aur us ke baad seedha
            login — yani jo shakhs abhi tak faisla nahi kar chuka, us ke
            saamne pehla sawal "email aur password" tha. Splash ab `Home`
            ke andar hai, aur login ek raasta hai, manzil nahi. */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/jobs" element={<JobPortal />} />
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
