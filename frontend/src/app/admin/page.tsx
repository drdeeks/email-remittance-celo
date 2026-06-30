'use client';

import { useEffect, useState } from 'react';

interface ReviewItem {
  id: string;
  remittance_id: string;
  submitted_by: string;
  sender_email: string;
  recipient_email: string;
  amount_celo: string;
  chain: string;
  submitted_at: number;
  status: string;
}

interface Manager {
  id: string;
  email: string;
  role: string;
  status: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function AdminDashboard() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [activeTab, setActiveTab] = useState<'reviews' | 'managers'>('reviews');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'manager'>('manager');
  const [reviewerId, setReviewerId] = useState(''); // Set from auth/session

  const fetchReviews = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/review/pending`);
      const data = await res.json();
      if (data.success) setReviews(data.items);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const fetchManagers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/managers`);
      const data = await res.json();
      if (data.success) setManagers(data.managers);
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => {
    Promise.all([fetchReviews(), fetchManagers()]).finally(() => setLoading(false));
  }, []);

  const handleReviewAction = async (remittanceId: string, action: 'approve' | 'reject') => {
    setActionLoading(remittanceId);
    try {
      const res = await fetch(`${API_BASE}/api/admin/review/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remittanceId, reviewerId, action }),
      });
      const data = await res.json();
      if (data.success) {
        setReviews((prev) => prev.filter((r) => r.remittance_id !== remittanceId));
      } else {
        setError(data.error || 'Action failed');
      }
    } catch (e: any) {
      setError(e.message);
    }
    setActionLoading('');
  };

  const handleInvite = async () => {
    if (!inviteEmail || !reviewerId) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/managers/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole, invitedBy: reviewerId }),
      });
      const data = await res.json();
      if (data.success) {
        setInviteEmail('');
        fetchManagers();
      } else {
        setError(data.error || 'Invite failed');
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center text-gray-400">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-sky-400 to-teal-400 text-transparent bg-clip-text mb-2">
            Admin Dashboard
          </h1>
          <p className="text-gray-400">Review pending submissions and manage team</p>
        </div>

        {/* Reviewer ID input (session placeholder) */}
        <div className="mb-6 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
          <label className="block text-sm text-gray-400 mb-1">Your Manager ID (from session):</label>
          <input
            type="text"
            value={reviewerId}
            onChange={(e) => setReviewerId(e.target.value)}
            placeholder="e.g. manager-uuid"
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white text-sm"
          />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
            {error}
            <button onClick={() => setError('')} className="ml-2 underline">dismiss</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['reviews', 'managers'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === tab
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  : 'bg-slate-800 text-gray-400 border border-slate-700 hover:bg-slate-700'
              }`}
            >
              {tab === 'reviews' ? `Pending Reviews (${reviews.length})` : `Managers (${managers.length})`}
            </button>
          ))}
        </div>

        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <div className="p-8 bg-slate-800/50 border border-slate-700 rounded-lg text-center text-gray-500">
                No pending reviews
              </div>
            ) : (
              reviews.map((item) => (
                <div key={item.id} className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1 text-sm">
                      <p><span className="text-gray-500">From:</span> <span className="text-white">{item.sender_email}</span></p>
                      <p><span className="text-gray-500">To:</span> <span className="text-white">{item.recipient_email}</span></p>
                      <p>
                        <span className="text-gray-500">Amount:</span>{' '}
                        <span className="text-white">{item.amount_celo} CELO</span>{' '}
                        <span className="text-gray-500">on {item.chain}</span>
                      </p>
                      <p className="text-gray-500 text-xs">
                        Submitted {new Date(item.submitted_at * 1000).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReviewAction(item.remittance_id, 'approve')}
                        disabled={actionLoading === item.remittance_id || !reviewerId}
                        className="px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-sm hover:bg-green-500/30 disabled:opacity-50"
                      >
                        {actionLoading === item.remittance_id ? '...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleReviewAction(item.remittance_id, 'reject')}
                        disabled={actionLoading === item.remittance_id || !reviewerId}
                        className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-sm hover:bg-red-500/30 disabled:opacity-50"
                      >
                        {actionLoading === item.remittance_id ? '...' : 'Reject'}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Managers Tab */}
        {activeTab === 'managers' && (
          <div className="space-y-4">
            {/* Invite form */}
            <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Invite Manager</h3>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white text-sm"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'admin' | 'manager')}
                  className="px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white text-sm"
                >
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  onClick={handleInvite}
                  disabled={!inviteEmail || !reviewerId}
                  className="px-4 py-2 bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded text-sm hover:bg-sky-500/30 disabled:opacity-50"
                >
                  Invite
                </button>
              </div>
            </div>

            {/* Manager list */}
            {managers.length === 0 ? (
              <div className="p-8 bg-slate-800/50 border border-slate-700 rounded-lg text-center text-gray-500">
                No active managers
              </div>
            ) : (
              managers.map((m) => (
                <div key={m.id} className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="text-white text-sm">{m.email}</p>
                    <p className="text-gray-500 text-xs">Role: {m.role} · Status: {m.status}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    m.role === 'owner' ? 'bg-yellow-500/20 text-yellow-400' :
                    m.role === 'admin' ? 'bg-sky-500/20 text-sky-400' :
                    'bg-teal-500/20 text-teal-400'
                  }`}>
                    {m.role}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  );
}
