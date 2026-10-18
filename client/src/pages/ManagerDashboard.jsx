import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Check, GraduationCap, Hourglass, Plus, UserCheck, Users } from 'lucide-react';
import api, { getErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { LEAVE_TYPE_LABELS, formatTime, greeting, todayKey } from '../utils/format';
import Loader from '../components/Loader';
import StatCard from '../components/StatCard';
import LeaveQueue from '../components/LeaveQueue';
import TrainingModal from '../components/TrainingModal';

const TRAINING_BADGE = { PLANNED: 'neutral', ONGOING: 'info', COMPLETED: 'approved' };
const TRAINING_LABEL = { PLANNED: 'Planned', ONGOING: 'Ongoing', COMPLETED: 'Completed' };

export default function ManagerDashboard() {
  const { user } = useAuth();

  const [team, setTeam] = useState([]);
  const [todayRecords, setTodayRecords] = useState([]);
  const [pending, setPending] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');
  const [trainingOpen, setTrainingOpen] = useState(false);

  // Four independent requests: one failing must not blank the page.
  const load = useCallback(async () => {
    const today = todayKey();
    const [teamRes, attRes, leaveRes, trainRes] = await Promise.allSettled([
      api.get('/users/team'),
      api.get('/attendance/all', { params: { from: today, to: today, limit: 100 } }),
      api.get('/leaves/pending', { params: { limit: 50 } }),
      api.get('/training', { params: { limit: 20 } }),
    ]);

    if (teamRes.status === 'fulfilled') setTeam(teamRes.value.data.users);
    if (attRes.status === 'fulfilled') setTodayRecords(attRes.value.data.attendance);
    if (leaveRes.status === 'fulfilled') setPending(leaveRes.value.data.leaves);
    if (trainRes.status === 'fulfilled') setTrainings(trainRes.value.data.trainings);

    const failed = [teamRes, attRes, leaveRes, trainRes].find((r) => r.status === 'rejected');
    setLoadError(failed ? getErrorMessage(failed.reason, 'Some information could not be loaded.') : '');
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Success banner disappears on its own.
  useEffect(() => {
    if (!notice) return undefined;
    const id = setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(id);
  }, [notice]);

  const handleReviewed = (leave) => {
    setPending((prev) => prev.filter((l) => l._id !== leave._id));
    const verb = leave.status === 'APPROVED' ? 'Approved' : 'Rejected';
    const type = (LEAVE_TYPE_LABELS[leave.leaveType] ?? 'leave').toLowerCase();
    setNotice(`${verb} ${leave.userId?.name ?? 'the employee'}’s ${type}.`);
  };

  // The attendance endpoint only returns people who checked in, so merge with the team list
  // to also show who hasn't.
  const recordByUser = new Map(todayRecords.map((r) => [r.userId?._id, r]));
  const rows = team.map((member) => ({ member, record: recordByUser.get(member._id) }));
  const presentCount = rows.filter((r) => r.record?.checkInTime).length;
  const activeTrainings = trainings.filter((t) => t.status !== 'COMPLETED').length;

  return (
    <div className="page">
      <header className="page-head">
        <h2>
          {greeting()}, {user.name.split(' ')[0]}
        </h2>
        <p>Team overview for {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
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

      <section className="grid-stats grid-stats--4" aria-label="Summary">
        <StatCard icon={Users} label="Team size" value={loading ? '–' : team.length} hint="Direct reports" />
        <StatCard icon={Hourglass} label="Pending leaves" value={loading ? '–' : pending.length} hint={pending.length ? 'Waiting for your decision' : 'Nothing waiting'} />
        <StatCard icon={UserCheck} label="In today" value={loading ? '–' : `${presentCount} of ${team.length}`} hint="Checked in so far" />
        <StatCard icon={GraduationCap} label="Active trainings" value={loading ? '–' : activeTrainings} hint="Planned or ongoing" />
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Leave requests awaiting you</h2>
        </div>
        <div className="panel__body">
          <LeaveQueue leaves={pending} loading={loading} onReviewed={handleReviewed} />
        </div>
      </section>

      <div className="grid-main">
        <section className="panel">
          <div className="panel__head">
            <h2>Team today</h2>
          </div>
          <div className="panel__body">
            {loading ? (
              <Loader label="Loading team" />
            ) : team.length === 0 ? (
              <p className="muted empty-line">No one reports to you yet. HR can assign people to you from the employee records.</p>
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
                    {rows.map(({ member, record }) => {
                      let badge = <span className="status-badge status-badge--neutral">Not in yet</span>;
                      if (record?.checkOutTime) badge = <span className="status-badge status-badge--info">Done</span>;
                      else if (record?.checkInTime) badge = <span className="status-badge status-badge--approved">Working</span>;
                      return (
                        <tr key={member._id}>
                          <td>
                            <strong>{member.name}</strong>
                            <span className="muted clamp">{member.designation || member.department || ''}</span>
                          </td>
                          <td>{badge}</td>
                          <td>{formatTime(record?.checkInTime) || '–'}</td>
                          <td>{formatTime(record?.checkOutTime) || '–'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2>Training</h2>
            <button type="button" className="btn btn--primary btn--sm" onClick={() => setTrainingOpen(true)}>
              <Plus size={16} />
              New program
            </button>
          </div>
          <div className="panel__body">
            {loading ? (
              <Loader label="Loading training" />
            ) : trainings.length === 0 ? (
              <p className="muted empty-line">No training programs yet. Create one for your team.</p>
            ) : (
              <ul className="list">
                {trainings.map((t) => (
                  <li key={t._id}>
                    <div>
                      <strong>{t.title}</strong>
                      <span className="muted list__meta">
                        {t.isCompanyWide ? 'Whole company' : `${t.assignedEmployees?.length ?? 0} assigned`}
                        {t.managerId && t.managerId._id !== user._id ? `, by ${t.managerId.name}` : ''}
                      </span>
                    </div>
                    <span className={`status-badge status-badge--${TRAINING_BADGE[t.status] ?? 'neutral'}`}>{TRAINING_LABEL[t.status] ?? t.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <TrainingModal open={trainingOpen} onClose={() => setTrainingOpen(false)} team={team} onCreated={(training) => setTrainings((prev) => [training, ...prev])} />
    </div>
  );
}