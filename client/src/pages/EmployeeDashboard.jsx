import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CalendarCheck, Hourglass, Loader2, LogIn, LogOut, Megaphone, Plus, UserCheck } from 'lucide-react';
import api, { getErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  LEAVE_TYPE_LABELS,
  formatDate,
  formatDateRange,
  formatDuration,
  formatTime,
  greeting,
  leaveDays,
  timeAgo,
  todayKey,
} from '../utils/format';
import Clock from '../components/Clock';
import Loader from '../components/Loader';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import LeaveRequestModal from '../components/LeaveRequestModal';

const ATTENDANCE_BADGE = { PRESENT: 'approved', ABSENT: 'rejected', LEAVE: 'pending' };
const ATTENDANCE_LABEL = { PRESENT: 'Present', ABSENT: 'Absent', LEAVE: 'On leave' };

export default function EmployeeDashboard() {
  const { user } = useAuth();

  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [acting, setActing] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);

  // Three independent requests: one failing must not blank the whole page.
  const load = useCallback(async () => {
    const [att, lv, ann] = await Promise.allSettled([
      api.get('/attendance/my-attendance', { params: { limit: 7 } }),
      api.get('/leaves/my-leaves', { params: { limit: 50 } }),
      api.get('/announcements', { params: { limit: 5 } }),
    ]);

    if (att.status === 'fulfilled') setAttendance(att.value.data.attendance);
    if (lv.status === 'fulfilled') setLeaves(lv.value.data.leaves);
    if (ann.status === 'fulfilled') setAnnouncements(ann.value.data.announcements);

    const failed = [att, lv, ann].find((r) => r.status === 'rejected');
    setLoadError(failed ? getErrorMessage(failed.reason, 'Some information could not be loaded.') : '');
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Attendance dates are calendar dates, so compare against today's date in local time.
  const todayRecord = attendance.find((a) => a.date.slice(0, 10) === todayKey());
  const checkedIn = !!todayRecord?.checkInTime;
  const checkedOut = !!todayRecord?.checkOutTime;

  const runAttendanceAction = async (path) => {
    setActing(true);
    setActionError('');
    try {
      const { data } = await api.post(path);
      setAttendance((prev) => [data.attendance, ...prev.filter((a) => a._id !== data.attendance._id)]);
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setActing(false);
    }
  };

  const pendingCount = leaves.filter((l) => l.status === 'PENDING').length;
  const approvedDays = leaves.filter((l) => l.status === 'APPROVED').reduce((sum, l) => sum + leaveDays(l.startDate, l.endDate), 0);

  let statusText = 'You haven’t checked in yet.';
  if (checkedOut) statusText = `Checked out at ${formatTime(todayRecord.checkOutTime)}. You worked ${formatDuration(todayRecord.checkInTime, todayRecord.checkOutTime)}.`;
  else if (checkedIn) statusText = `Checked in at ${formatTime(todayRecord.checkInTime)}.`;

  return (
    <div className="page">
      {loadError && (
        <div className="alert alert--error" role="alert">
          <AlertCircle size={18} />
          <span>{loadError}</span>
        </div>
      )}

      {/* ───── Greeting + check in/out ───── */}
      <section className="panel hero">
        <div className="hero__text">
          <p className="hero__date">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h2>
            {greeting()}, {user.name.split(' ')[0]}
          </h2>
          <p className="muted">{loading ? 'Loading your day…' : statusText}</p>
        </div>

        <div className="hero__action">
          <Clock />

          {!checkedIn && (
            <button type="button" className="btn btn--primary btn--lg" onClick={() => runAttendanceAction('/attendance/check-in')} disabled={acting || loading}>
              {acting ? <Loader2 size={19} className="spin" /> : <LogIn size={19} />}
              Check in
            </button>
          )}
          {checkedIn && !checkedOut && (
            <button type="button" className="btn btn--dark btn--lg" onClick={() => runAttendanceAction('/attendance/check-out')} disabled={acting}>
              {acting ? <Loader2 size={19} className="spin" /> : <LogOut size={19} />}
              Check out
            </button>
          )}
          {checkedOut && (
            <button type="button" className="btn btn--ghost btn--lg" disabled>
              Done for today
            </button>
          )}

          {actionError && (
            <div className="alert alert--error hero__alert" role="alert">
              <AlertCircle size={18} />
              <span>{actionError}</span>
            </div>
          )}
        </div>
      </section>

      {/* ───── Stats ───── */}
      <section className="grid-stats" aria-label="Summary">
        <StatCard icon={UserCheck} label="Today" value={checkedOut ? 'Day complete' : checkedIn ? 'Working' : 'Not checked in'} hint={checkedOut ? `Out at ${formatTime(todayRecord.checkOutTime)}` : checkedIn ? `Since ${formatTime(todayRecord.checkInTime)}` : 'Check in to start your day'} />
        <StatCard icon={Hourglass} label="Pending requests" value={pendingCount} hint={pendingCount ? 'Waiting on your manager' : 'Nothing waiting'} />
        <StatCard icon={CalendarCheck} label="Approved leave days" value={approvedDays} hint={approvedDays ? 'Across approved requests' : 'None yet'} />
      </section>

      <div className="grid-main">
        {/* ───── Leave requests ───── */}
        <section className="panel">
          <div className="panel__head">
            <h2>My leave requests</h2>
            <button type="button" className="btn btn--primary btn--sm" onClick={() => setLeaveOpen(true)}>
              <Plus size={16} />
              Request leave
            </button>
          </div>
          <div className="panel__body">
            {loading ? (
              <Loader label="Loading leave requests" />
            ) : leaves.length === 0 ? (
              <p className="muted empty-line">No leave requests yet. Use “Request leave” to file your first one.</p>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Dates</th>
                      <th>Days</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.slice(0, 8).map((leave) => (
                      <tr key={leave._id}>
                        <td>
                          <strong>{LEAVE_TYPE_LABELS[leave.leaveType] ?? leave.leaveType}</strong>
                          <span className="muted clamp">{leave.reason}</span>
                        </td>
                        <td>{formatDateRange(leave.startDate, leave.endDate)}</td>
                        <td>{leaveDays(leave.startDate, leave.endDate)}</td>
                        <td>
                          <StatusBadge status={leave.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* ───── Announcements ───── */}
        <section className="panel">
          <div className="panel__head">
            <h2>Announcements</h2>
            <Megaphone size={18} className="muted" />
          </div>
          <div className="panel__body">
            {loading ? (
              <Loader label="Loading announcements" />
            ) : announcements.length === 0 ? (
              <p className="muted empty-line">No announcements yet.</p>
            ) : (
              <ul className="feed">
                {announcements.map((item) => (
                  <li key={item._id}>
                    <strong>{item.title}</strong>
                    <p className="feed__text">{item.content}</p>
                    <span className="muted feed__meta">
                      {item.authorId?.name ?? 'HR'}, {timeAgo(item.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {/* ───── Recent attendance ───── */}
      <section className="panel">
        <div className="panel__head">
          <h2>Recent attendance</h2>
        </div>
        <div className="panel__body">
          {loading ? (
            <Loader label="Loading attendance" />
          ) : attendance.length === 0 ? (
            <p className="muted empty-line">No attendance recorded yet. Check in to start your first day.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>In</th>
                    <th>Out</th>
                    <th>Hours</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((a) => (
                    <tr key={a._id}>
                      <td>{formatDate(a.date, { weekday: 'short' })}</td>
                      <td>{formatTime(a.checkInTime) || '–'}</td>
                      <td>{formatTime(a.checkOutTime) || '–'}</td>
                      <td>{a.checkInTime && a.checkOutTime ? formatDuration(a.checkInTime, a.checkOutTime) : '–'}</td>
                      <td>
                        <span className={`status-badge status-badge--${ATTENDANCE_BADGE[a.status]}`}>{ATTENDANCE_LABEL[a.status] ?? a.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <LeaveRequestModal open={leaveOpen} onClose={() => setLeaveOpen(false)} onCreated={(leave) => setLeaves((prev) => [leave, ...prev])} />
    </div>
  );
}