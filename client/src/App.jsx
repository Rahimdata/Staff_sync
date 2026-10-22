import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { roleHome } from './utils/roles';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Registerpage';
import EmployeeDashboard from './pages/EmployeeDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import HRDashboard from './pages/HRDashboard';
import AttendancePage from './pages/AttendancePage';
import LeavePage from './pages/LeavePage';
import ProfilePage from './pages/ProfilePage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import TrainingPage from './pages/TrainingPage';
import TeamPage from './pages/TeamPage';
import EmployeesPage from './pages/EmployeesPage';

/** "/" sends each person to their own dashboard. */
function RoleRedirect() {
  const { user } = useAuth();
  return <Navigate to={roleHome(user.role)} replace />;
}

function NotFound() {
  const { user } = useAuth();
  return (
    <div className="empty-state">
      <h2>Page not found</h2>
      <p>That address doesn't exist in StaffSync.</p>
      <Link className="btn btn--ghost" to={roleHome(user.role)}>
        Back to your dashboard
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Everything below requires a signed-in user */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<RoleRedirect />} />

          <Route element={<ProtectedRoute allowedRoles={['HR']} />}>
            <Route path="hr" element={<HRDashboard />} />
            <Route path="employees" element={<EmployeesPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['MANAGER']} />}>
            <Route path="manager" element={<ManagerDashboard />} />
            <Route path="team" element={<TeamPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['EMPLOYEE']} />}>
            <Route path="employee" element={<EmployeeDashboard />} />
          </Route>

          {/* Shared pages: content adapts to the role once built */}
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="leaves" element={<LeavePage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="announcements" element={<AnnouncementsPage />} />
          <Route path="training" element={<TrainingPage />} />

          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}