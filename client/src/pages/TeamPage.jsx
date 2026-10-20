import { useEffect, useState } from 'react';
import { AlertCircle, Users } from 'lucide-react';
import api, { getErrorMessage } from '../services/api';
import { formatDate } from '../utils/format';
import Loader from '../components/Loader';

/** A manager's direct reports. Attendance and leave detail live on their own pages. */
export default function TeamPage() {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .get('/users/team')
      .then(({ data }) => {
        if (!cancelled) setTeam(data.users);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, 'Could not load your team.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page">
      <header className="page-head">
        <h2>My team</h2>
        <p>The people who report to you. HR assigns them from the Employees page.</p>
      </header>

      {error && (
        <div className="alert alert--error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <section className="panel">
        <div className="panel__body">
          {loading ? (
            <Loader label="Loading team" />
          ) : team.length === 0 ? (
            <div className="empty-inline">
              <Users size={20} />
              <p className="muted">No one reports to you yet.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Designation</th>
                    <th>Department</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {team.map((m) => (
                    <tr key={m._id}>
                      <td>
                        <strong>{m.name}</strong>
                        <span className="muted clamp">{m.email}</span>
                      </td>
                      <td>{m.designation || '–'}</td>
                      <td>{m.department || '–'}</td>
                      <td>{m.dateOfJoining ? formatDate(m.dateOfJoining) : '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}