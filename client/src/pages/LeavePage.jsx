import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import MyLeavePanel from '../components/MyLeavePanel';
import LeaveReviewPanel from '../components/LeaveReviewPanel';

export default function LeavePage() {
  const { user } = useAuth();
  const isReviewer = user.role === 'HR' || user.role === 'MANAGER';
  const [tab, setTab] = useState(isReviewer ? 'review' : 'mine');

  return (
    <div className="page">
      <header className="page-head">
        <h2>{isReviewer ? 'Leave requests' : 'My leave'}</h2>
        <p>{isReviewer ? 'Review requests from your people, and manage your own leave.' : 'File a request and follow its status.'}</p>
      </header>

      {isReviewer && (
        <div className="tabs" role="tablist" aria-label="Leave views">
          <button type="button" role="tab" className="tab" aria-selected={tab === 'review'} onClick={() => setTab('review')}>
            Requests to review
          </button>
          <button type="button" role="tab" className="tab" aria-selected={tab === 'mine'} onClick={() => setTab('mine')}>
            My leave
          </button>
        </div>
      )}

      {tab === 'review' && isReviewer ? <LeaveReviewPanel /> : <MyLeavePanel />}
    </div>
  );
}