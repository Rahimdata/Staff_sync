import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import MyDayCard from '../components/MyDayCard';
import AttendanceHistory from '../components/AttendanceHistory';

export default function AttendancePage() {
  const { user } = useAuth();
  const isReviewer = user.role === 'HR' || user.role === 'MANAGER';
  const [people, setPeople] = useState([]);

  // Who can be picked in the employee filter: everyone for HR, direct reports for managers.
  useEffect(() => {
    if (!isReviewer) return;
    const request = user.role === 'HR' ? api.get('/users', { params: { limit: 100 } }) : api.get('/users/team');
    request.then(({ data }) => setPeople(data.users)).catch(() => {});
  }, [isReviewer, user.role]);

  return (
    <div className="page">
      <header className="page-head">
        <h2>Attendance</h2>
        <p>{isReviewer ? 'Mark your own day and review attendance records.' : 'Mark your day and look back at your records.'}</p>
      </header>

      <MyDayCard />

      <AttendanceHistory title="My attendance" endpoint="/attendance/my-attendance" />

      {isReviewer && <AttendanceHistory title={user.role === 'HR' ? 'Company attendance' : 'Team attendance'} endpoint="/attendance/all" people={people} showEmployee />}
    </div>
  );
}