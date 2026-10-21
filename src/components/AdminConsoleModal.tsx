import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Ban,
  UserX,
  CheckCircle,
  AlertTriangle,
  Search,
  X,
  Mail,
  User,
  Users,
  RefreshCw,
  Crown,
  Key,
  Shield,
  Loader2,
  Clock,
  Filter,
} from 'lucide-react';
import { UserProfileData, UserStatus } from '../types';
import { fetchAllUsersForAdmin, updateUserAdminStatus } from '../lib/supabase';
import { isOwnerEmail } from '../lib/accountRules';

interface AdminConsoleModalProps {
  onClose: () => void;
  currentOwnerEmail: string;
}

export const AdminConsoleModal: React.FC<AdminConsoleModalProps> = ({
  onClose,
  currentOwnerEmail,
}) => {
  const [users, setUsers] = useState<UserProfileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | UserStatus>('all');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Load all signed-in users
  const loadUsers = async () => {
    try {
      const data = await fetchAllUsersForAdmin();
      setUsers(data);
    } catch (e) {
      console.error('Failed to load users for admin:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  const handleUpdateStatus = async (
    targetUser: UserProfileData,
    newStatus: UserStatus,
    isVerified?: boolean
  ) => {
    // Prevent banning or suspending the application owner
    if (isOwnerEmail(targetUser.email)) {
      setFeedbackMsg({
        type: 'error',
        text: 'Action Denied: You cannot suspend or ban the application owner account.',
      });
      setTimeout(() => setFeedbackMsg(null), 3000);
      return;
    }

    setActionLoadingId(targetUser.id);
    try {
      await updateUserAdminStatus(targetUser.id, newStatus, isVerified);
      // Update local state immediately for instant feedback
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id === targetUser.id) {
            return {
              ...u,
              status: newStatus,
              isVerified: isVerified !== undefined ? isVerified : newStatus === 'verified',
            };
          }
          return u;
        })
      );

      const statusLabels: Record<UserStatus, string> = {
        active: 'restored to Active',
        verified: 'marked as Officially Verified',
        suspended: 'Suspended',
        banned: 'Banned permanently',
        restricted: 'Restricted',
      };

      setFeedbackMsg({
        type: 'success',
        text: `User ${targetUser.displayName} (${targetUser.email}) has been ${statusLabels[newStatus]}.`,
      });
      setTimeout(() => setFeedbackMsg(null), 3500);
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || 'Failed to update user status.',
      });
      setTimeout(() => setFeedbackMsg(null), 3500);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filter users based on search and status
  const filteredUsers = users.filter((u) => {
    if (statusFilter !== 'all') {
      const curStatus = u.status || 'active';
      if (curStatus !== statusFilter) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = u.displayName.toLowerCase().includes(q);
      const matchEmail = (u.email || '').toLowerCase().includes(q);
      const matchId = (u.kempoId || '').toLowerCase().includes(q);
      return matchName || matchEmail || matchId;
    }

    return true;
  });

  const countTotal = users.length;
  const countVerified = users.filter((u) => u.status === 'verified' || u.isVerified).length;
  const countSuspended = users.filter((u) => u.status === 'suspended').length;
  const countBanned = users.filter((u) => u.status === 'banned').length;
  const countRestricted = users.filter((u) => u.status === 'restricted').length;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between text-white animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="p-4 pt-[max(env(safe-area-inset-top),16px)] border-b border-neutral-800 bg-[#121215] shrink-0">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-600 to-amber-500 p-0.5 shadow-lg shadow-red-950 flex items-center justify-center">
              <div className="w-full h-full rounded-[14px] bg-[#141417] flex items-center justify-center">
                <Crown className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-tight">Owner & Admin Console</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-950 text-red-300 border border-red-700">
                  MASTER CONTROL
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Manage registered user emails, accounts, verification & security
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-9 h-9 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition active:scale-95 cursor-pointer"
              title="Refresh Users"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-red-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center transition active:scale-95 cursor-pointer"
              title="Close Console"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-5 gap-2 mt-3.5 max-w-4xl mx-auto">
          <div
            onClick={() => setStatusFilter('all')}
            className={`p-2 rounded-xl text-center cursor-pointer transition border ${
              statusFilter === 'all'
                ? 'bg-neutral-800 border-neutral-600'
                : 'bg-[#18181c] border-neutral-800/80 hover:border-neutral-700'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
              Total Signed In
            </span>
            <span className="text-lg font-black text-white">{countTotal}</span>
          </div>

          <div
            onClick={() => setStatusFilter('verified')}
            className={`p-2 rounded-xl text-center cursor-pointer transition border ${
              statusFilter === 'verified'
                ? 'bg-blue-950/60 border-blue-500'
                : 'bg-[#18181c] border-neutral-800/80 hover:border-blue-900'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block">
              Verified
            </span>
            <span className="text-lg font-black text-blue-300">{countVerified}</span>
          </div>

          <div
            onClick={() => setStatusFilter('suspended')}
            className={`p-2 rounded-xl text-center cursor-pointer transition border ${
              statusFilter === 'suspended'
                ? 'bg-amber-950/60 border-amber-500'
                : 'bg-[#18181c] border-neutral-800/80 hover:border-amber-900'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
              Suspended
            </span>
            <span className="text-lg font-black text-amber-300">{countSuspended}</span>
          </div>

          <div
            onClick={() => setStatusFilter('banned')}
            className={`p-2 rounded-xl text-center cursor-pointer transition border ${
              statusFilter === 'banned'
                ? 'bg-red-950/60 border-red-500'
                : 'bg-[#18181c] border-neutral-800/80 hover:border-red-900'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 block">
              Banned
            </span>
            <span className="text-lg font-black text-red-300">{countBanned}</span>
          </div>

          <div
            onClick={() => setStatusFilter('restricted')}
            className={`p-2 rounded-xl text-center cursor-pointer transition border ${
              statusFilter === 'restricted'
                ? 'bg-purple-950/60 border-purple-500'
                : 'bg-[#18181c] border-neutral-800/80 hover:border-purple-900'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block">
              Restricted
            </span>
            <span className="text-lg font-black text-purple-300">{countRestricted}</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mt-3 max-w-4xl mx-auto">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users by Name, Email address, or KEMPO ID..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-[#0c0c0e] border border-neutral-700/80 text-white placeholder-neutral-500 text-xs focus:outline-none focus:border-red-500 transition font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Action Toast Feedback */}
      {feedbackMsg && (
        <div className="px-4 py-2 bg-black/60 shrink-0">
          <div
            className={`max-w-4xl mx-auto p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border animate-in slide-in-from-top-2 ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-700'
                : 'bg-red-950/90 text-red-200 border-red-700'
            }`}
          >
            {feedbackMsg.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        </div>
      )}

      {/* Main Users List Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-w-4xl mx-auto w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
            <Loader2 className="w-8 h-8 text-red-500 animate-spin mb-3" />
            <p className="text-xs font-medium">Fetching registered user accounts from database...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-16 text-neutral-500">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-bold text-neutral-300">No users match your search criteria</p>
            <p className="text-xs text-neutral-500 mt-1">Try another search keyword or clear the status filter.</p>
          </div>
        ) : (
          filteredUsers.map((u) => {
            const isUserOwner = isOwnerEmail(u.email);
            const status = u.status || (isUserOwner ? 'verified' : 'active');
            const isUpdating = actionLoadingId === u.id;

            return (
              <div
                key={u.id || u.email}
                className="p-4 rounded-2xl bg-[#151518] border border-neutral-800/90 hover:border-neutral-700/80 transition shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                {/* User Info Section */}
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* User Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-neutral-800 flex items-center justify-center ring-2 ring-neutral-700">
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt={u.displayName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-base font-black text-neutral-300">
                          {u.displayName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    {isUserOwner && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-black flex items-center justify-center text-[10px] font-black shadow-md">
                        👑
                      </span>
                    )}
                  </div>

                  {/* Name, Email, and ID */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-[15px] font-black text-white truncate">{u.displayName}</h4>
                      {isUserOwner ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-red-600 to-amber-500 text-white uppercase tracking-wider">
                          Owner
                        </span>
                      ) : (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            status === 'verified'
                              ? 'bg-blue-950 text-blue-300 border border-blue-700'
                              : status === 'suspended'
                              ? 'bg-amber-950 text-amber-300 border border-amber-700'
                              : status === 'banned'
                              ? 'bg-red-950 text-red-300 border border-red-700'
                              : status === 'restricted'
                              ? 'bg-purple-950 text-purple-300 border border-purple-700'
                              : 'bg-neutral-800 text-neutral-300'
                          }`}
                        >
                          {status}
                        </span>
                      )}
                    </div>

                    {/* Show User Email prominently to the owner as requested */}
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-neutral-300 font-mono">
                      <Mail className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span className="truncate">{u.email || 'No email registered'}</span>
                    </div>

                    {/* KEMPO ID & Account Type */}
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-400">
                      <span className="font-mono text-red-400 font-bold">{u.kempoId}</span>
                      <span>&bull;</span>
                      <span className="capitalize">{u.accountType.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>

                {/* Owner Actions */}
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-800/80">
                  {isUserOwner ? (
                    <span className="text-xs text-amber-400/90 font-semibold px-3 py-1.5 rounded-xl bg-amber-950/40 border border-amber-800/50">
                      System Owner (Immutable)
                    </span>
                  ) : (
                    <>
                      {/* 1. Toggle Verify */}
                      <button
                        onClick={() =>
                          handleUpdateStatus(u, status === 'verified' ? 'active' : 'verified', status !== 'verified')
                        }
                        disabled={isUpdating}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition active:scale-95 cursor-pointer ${
                          status === 'verified'
                            ? 'bg-blue-900/60 hover:bg-blue-800 text-blue-200 border border-blue-600'
                            : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                        }`}
                        title="Toggle Verified Checkmark"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                        <span>{status === 'verified' ? 'Verified' : 'Verify'}</span>
                      </button>

                      {/* 2. Suspend / Restore */}
                      {status === 'suspended' ? (
                        <button
                          onClick={() => handleUpdateStatus(u, 'active', false)}
                          disabled={isUpdating}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 text-xs font-semibold flex items-center gap-1 transition active:scale-95 cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Unsuspend</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateStatus(u, 'suspended', false)}
                          disabled={isUpdating}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-800/60 text-xs font-semibold flex items-center gap-1 transition active:scale-95 cursor-pointer"
                          title="Suspend User Account"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          <span>Suspend</span>
                        </button>
                      )}

                      {/* 3. Restrict Account */}
                      {status === 'restricted' ? (
                        <button
                          onClick={() => handleUpdateStatus(u, 'active', false)}
                          disabled={isUpdating}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 text-xs font-semibold flex items-center gap-1 transition active:scale-95 cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Unrestrict</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateStatus(u, 'restricted', false)}
                          disabled={isUpdating}
                          className="px-2.5 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-800/60 text-xs font-semibold flex items-center gap-1 transition active:scale-95 cursor-pointer"
                          title="Restrict User Calling & Mini-apps"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Restrict</span>
                        </button>
                      )}

                      {/* 4. Ban User */}
                      {status === 'banned' ? (
                        <button
                          onClick={() => handleUpdateStatus(u, 'active', false)}
                          disabled={isUpdating}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 text-xs font-semibold flex items-center gap-1 transition active:scale-95 cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Unban</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to BAN ${u.displayName} (${u.email})?`)) {
                              handleUpdateStatus(u, 'banned', false);
                            }
                          }}
                          disabled={isUpdating}
                          className="px-2.5 py-1.5 rounded-xl bg-red-950 hover:bg-red-900 text-red-300 border border-red-800/80 text-xs font-semibold flex items-center gap-1 transition active:scale-95 cursor-pointer"
                          title="Ban User Permanently"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Ban</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-neutral-800 bg-[#121215] text-center text-[11px] text-neutral-400 shrink-0">
        <p>
          Logged in as Application Owner: <strong className="text-white">{currentOwnerEmail}</strong> &bull; All changes persist immediately to database
        </p>
      </div>
    </div>
  );
};
