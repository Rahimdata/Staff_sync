import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Check, GraduationCap, Hourglass, Megaphone, UserCheck, UserPlus, Users } from 'lucide-react';
import api, { getErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { LEAVE_TYPE_LABELS, formatTime, greeting, timeAgo, todayKey } from '../utils/format';
import Loader from '../components/Loader';
import StatCard from '../components/StatCard';
import LeaveQueue from '../components/LeaveQueue';
import EmployeeFormModal from '../components/EmployeeFormModal';
import AnnouncementModal from '../components/AnnouncementModal';
import MyDayCard from '../components/MyDayCard';

export default function HRDashboard() {
  const { user } = useAuth();

  const [staffTotal, setStaffTotal] = useState(0);
  const [managers, setManagers] = useState([]);
  const [todayRecords, setTodayRecords] = useState([]);
  const [pending, setPending] = useState([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [trainings, setTrainings] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [onLeave, setOnLeave] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');
  const [employeeOpen, setEmployeeOpen] = useState(false);
  const [announceOpen, setAnnounceOpen] = useState(false);

  // Six independent requests: one failing must not blank the page.
  const load = useCallback(async () => {
    const today = todayKey();
    const results = await Promise.allSettled([
      api.get('/users', { params: { limit: 1 } }),
      api.get('/users', { params: { role: 'MANAGER', limit: 100 } }),
      api.get('/attendance/all', { params: { from: today, to: today, limit: 100 } }),
      api.get('/leaves/pending', { params: { limit: 50 } }),
      api.get('/training', { params: { limit: 100 } }),
      api.get('/announcements', { params: { limit: 5 } }),
      api.get('/leaves/today'),
    ]);
    const [staffRes, mgrRes, attRes, leaveRes, trainRes, annRes, awayRes] = results;

    if (staffRes.status === 'fulfilled') setStaffTotal(staffRes.value.data.total);
    if (mgrRes.status === 'fulfilled') setManagers(mgrRes.value.data.users);
    if (attRes.status === 'fulfilled') setTodayRecords(attRes.value.data.attendance);
    if (leaveRes.status === 'fulfilled') {
      setPending(leaveRes.value.data.leaves);
      setPendingTotal(leaveRes.value.data.total);
    }
    if (trainRes.status === 'fulfilled') setTrainings(trainRes.value.data.trainings);
    if (annRes.status === 'fulfilled') setAnnouncements(annRes.value.data.announcements);
    if (awayRes.status === 'fulfilled') setOnLeave(awayRes.value.data.leaves);

    const failed = results.find((r) => r.status === 'rejected');
    setLoadError(failed ? getErrorMessage(failed.reason, 'Some information could not be loaded.') : '');
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!notice) return undefined;
    const id = setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(id);
  }, [notice]);

  const handleReviewed = (leave) => {
    setPending((prev) => prev.filter((l) => l._id !== leave._id));
    setPendingTotal((n) => Math.max(0, n - 1));
    const verb = leave.status === 'APPROVED' ? 'Approved' : 'Rejected';
    const type = (LEAVE_TYPE_LABELS[leave.leaveType] ?? 'leave').toLowerCase();
    setNotice(`${verb} ${leave.userId?.name ?? 'the employee'}’s ${type}.`);
  };

  const checkedIn = todayRecords.filter((r) => r.checkInTime).sort((a, b) => new Date(b.checkInTime) - new Date(a.checkInTime));
  const activeTrainings = trainings.filter((t) => t.status !== 'COMPLETED').length;

  return (
    <div className="page">
      <header className="page-head page-head--row">
        <div>
          <h2>
            {greeting()}, {user.name.split(' ')[0]}
          </h2>
          <p>Company overview for {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div className="page-head__actions">
          <button type="button" className="btn btn--ghost" onClick={() => setAnnounceOpen(true)}>
            <Megaphone size={17} />
            Post announcement
          </button>
          <button type="button" className="btn btn--primary" onClick={() => setEmployeeOpen(true)}>
            <UserPlus size={17} />
            Add employee
          </button>
        </div>
      </header>

      {loadError && (
        <div className="alert alert--error" role="alert">
          <AlertCircle size={18} />
          <span>{loadError}</span>
        </div>
      )}
      {notice && (
        <div className="alert alert--success" role="status">
          <Check size={18} />
          <span>{notice}</span>
        </div>
      )}

      <MyDayCard />

      <section className="grid-stats grid-stats--4" aria-label="Summary">
        <StatCard icon={Users} label="Total staff" value={loading ? '–' : staffTotal} hint="Active accounts" />
        <StatCard icon={Hourglass} label="Pending leaves" value={loading ? '–' : pendingTotal} hint={pendingTotal ? 'Waiting for review' : 'Nothing waiting'} />
        <StatCard icon={UserCheck} label="Present today" value={loading ? '–' : `${checkedIn.length} of ${staffTotal}`} hint={onLeave.length ? `${onLeave.length} on leave today` : 'Checked in so far'} />
        <StatCard icon={GraduationCap} label="Active trainings" value={loading ? '–' : activeTrainings} hint="Planned or ongoing" />
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Leave requests awaiting review</h2>
        </div>
        <div className="panel__body">
          <LeaveQueue leaves={pending} loading={loading} onReviewed={handleReviewed} />
        </div>
      </section>

      <div className="grid-main">
        <section className="panel">
          <div className="panel__head">
            <h2>Checked in today</h2>
          </div>
          <div className="panel__body">
            {loading ? (
              <Loader label="Loading attendance" />
            ) : checkedIn.length === 0 ? (
              <p className="muted empty-line">No one has checked in yet today.</p>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Status</th>
                      <th>In</th>
                      <th>Out</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checkedIn.map((r) => (
                      <tr key={r._id}>
                        <td>
                          <strong>{r.userId?.name ?? 'Former employee'}</strong>
                          <span className="muted clamp">{r.userId?.department ?? ''}</span>
                        </td>
                        <td>{r.checkOutTime ? <span className="status-badge status-badge--info">Done</span> : <span className="status-badge status-badge--approved">Working</span>}</td>
                        <td>{formatTime(r.checkInTime)}</td>
                        <td>{formatTime(r.checkOutTime) || '–'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2>Announcements</h2>
          </div>
          <div className="panel__body">
            {loading ? (
              <Loader label="Loading announcements" />
            ) : announcements.length === 0 ? (
              <p className="muted empty-line">Nothing posted yet. Use “Post announcement” to tell everyone something.</p>
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

      <EmployeeFormModal
        open={employeeOpen}
        employee={null}
        managers={managers}
        currentUserId={user._id}
        onClose={() => setEmployeeOpen(false)}
        onSaved={(saved) => {
          setNotice(`Added ${saved.name}.`);
          load();
        }}
      />
      <AnnouncementModal
        open={announceOpen}
        onClose={() => setAnnounceOpen(false)}
        onCreated={(announcement) => {
          setAnnouncements((prev) => [announcement, ...prev].slice(0, 5));
          setNotice('Announcement posted.');
        }}
      />
    </div>
  );
}