import { useState, useEffect, useCallback } from 'react';
import axios from '../utils/axios';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import UserManagement from '../components/admin/UserManagement';
import EnhancedStats from '../components/admin/EnhancedStats';
import ClanManagement from '../components/admin/ClanManagement';
import BugReportManagement from '../components/admin/BugReportManagement';

const AdminPanel = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Chat Reports
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportStatus, setReportStatus] = useState('pending');
  const [reportsPagination, setReportsPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [activeTab, setActiveTab] = useState('enhanced-stats'); // 'enhanced-stats', 'users', 'clans', 'bug-reports', 'stats', 'reports', 'trades', 'squads'
  const [expandedReport, setExpandedReport] = useState(null);
  const [banOptions, setBanOptions] = useState({});

  // Trades Management
  const [trades, setTrades] = useState([]);
  const [tradesLoading, setTradesLoading] = useState(false);
  const [tradesFilter, setTradesFilter] = useState({ status: '', search: '' });
  const [tradesPagination, setTradesPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  // Squad Recruitments Management
  const [squads, setSquads] = useState([]);
  const [squadsLoading, setSquadsLoading] = useState(false);
  const [squadsFilter, setSquadsFilter] = useState({ status: '', search: '' });
  const [squadsPagination, setSquadsPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  // Functions defined before useEffect
  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/trades/admin/stats');
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      if (err.response?.status === 403) {
        setError('관리자 권한이 없습니다');
        setTimeout(() => navigate('/dashboard'), 2000);
      } else {
        setError('통계를 불러오는데 실패했습니다');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const fetchReports = useCallback(async () => {
    try {
      setReportsLoading(true);
      setError(''); // Clear previous errors
      const response = await axios.get('/chat/admin/reports', {
        params: {
          status: reportStatus,
          page: reportsPagination.page,
          limit: reportsPagination.limit
        }
      });
      setReports(response.data.reports || []);
      setReportsPagination(prev => ({
        ...prev,
        total: response.data.pagination.total,
        totalPages: response.data.pagination.totalPages
      }));
    } catch (err) {
      console.error('[AdminPanel] Failed to fetch reports:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message
      });
      if (err.response?.status === 403) {
        setError('관리자 권한이 없습니다');
        setTimeout(() => navigate('/dashboard'), 2000);
      } else if (err.response?.status === 401) {
        setError('인증이 만료되었습니다. 다시 로그인해주세요.');
        setTimeout(() => {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }, 2000);
      } else {
        setError(err.response?.data?.error || '신고 목록을 불러오는데 실패했습니다');
      }
      setReports([]);
    } finally {
      setReportsLoading(false);
    }
  }, [reportStatus, reportsPagination.page, reportsPagination.limit, navigate]);

  const fetchTrades = useCallback(async () => {
    try {
      setTradesLoading(true);
      setError('');
      const response = await axios.get('/trades/admin/trades', {
        params: {
          status: tradesFilter.status || undefined,
          search: tradesFilter.search || undefined,
          page: tradesPagination.page,
          limit: tradesPagination.limit
        }
      });
      setTrades(response.data.trades || []);
      setTradesPagination(prev => ({
        ...prev,
        total: response.data.pagination.total,
        totalPages: response.data.pagination.totalPages
      }));
    } catch (err) {
      console.error('Failed to fetch trades:', err);
      setError(err.response?.data?.error || '거래 목록을 불러오는데 실패했습니다');
      setTrades([]);
    } finally {
      setTradesLoading(false);
    }
  }, [tradesFilter.status, tradesFilter.search, tradesPagination.page, tradesPagination.limit]);

  const fetchSquads = useCallback(async () => {
    try {
      setSquadsLoading(true);
      setError('');
      const response = await axios.get('/squad-recruitments/admin/squads', {
        params: {
          status: squadsFilter.status || undefined,
          search: squadsFilter.search || undefined,
          page: squadsPagination.page,
          limit: squadsPagination.limit
        }
      });
      setSquads(response.data.squads || []);
      setSquadsPagination(prev => ({
        ...prev,
        total: response.data.pagination.total,
        totalPages: response.data.pagination.totalPages
      }));
    } catch (err) {
      console.error('Failed to fetch squads:', err);
      setError(err.response?.data?.error || '스쿼드 모집 목록을 불러오는데 실패했습니다');
      setSquads([]);
    } finally {
      setSquadsLoading(false);
    }
  }, [squadsFilter.status, squadsFilter.search, squadsPagination.page, squadsPagination.limit]);

  // Effects
  useEffect(() => {
    // Check if user is admin (frontend check for UX)
    if (user && !user.isAdmin) {
      setError('관리자 권한이 필요합니다');
      setLoading(false);
      setTimeout(() => navigate('/dashboard'), 2000);
      return;
    }
    if (user) {
      fetchStats();
    }
  }, [user, navigate, fetchStats]);

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReports();
    } else if (activeTab === 'trades') {
      fetchTrades();
    } else if (activeTab === 'squads') {
      fetchSquads();
    }
  }, [activeTab, fetchReports, fetchTrades, fetchSquads]);

  const handleReviewReport = async (reportId, newStatus, adminNotes, banOptions = {}) => {
    try {
      await axios.put(`/chat/admin/reports/${reportId}`, {
        status: newStatus,
        adminNotes,
        issueWarning: banOptions.issueWarning || false,
        warningSeverity: banOptions.warningSeverity || 'low',
        banUser: banOptions.banUser || false,
        banDuration: banOptions.banDuration || 'permanent'
      });
      setSuccess('신고 검토가 완료되었습니다');
      fetchReports();
    } catch (err) {
      console.error('Failed to review report:', err);
      setError(err.response?.data?.error || '신고 검토에 실패했습니다');
    }
  };

  const handleBanUser = async (userId, reason, duration) => {
    try {
      await axios.post(`/chat/admin/users/${userId}/ban`, {
        reason,
        duration
      });
      setSuccess('사용자를 차단했습니다');
    } catch (err) {
      console.error('Failed to ban user:', err);
      setError(err.response?.data?.error || '사용자 차단에 실패했습니다');
    }
  };

  const handleUnbanUser = async (userId) => {
    try {
      await axios.post(`/chat/admin/users/${userId}/unban`);
      setSuccess('사용자 차단을 해제했습니다');
    } catch (err) {
      console.error('Failed to unban user:', err);
      setError(err.response?.data?.error || '차단 해제에 실패했습니다');
    }
  };

  const handleDeleteTrade = async (tradeId, reason) => {
    try {
      await axios.delete(`/trades/admin/trades/${tradeId}`, {
        data: { reason }
      });
      setSuccess('거래 게시물이 삭제되었습니다');
      fetchTrades(); // Refresh the list
    } catch (err) {
      console.error('Failed to delete trade:', err);
      setError(err.response?.data?.error || '거래 삭제에 실패했습니다');
    }
  };

  const handleDeleteSquad = async (squadId, reason) => {
    try {
      await axios.delete(`/squad-recruitments/admin/squads/${squadId}`, {
        data: { reason }
      });
      setSuccess('스쿼드 모집 게시물이 삭제되었습니다');
      fetchSquads(); // Refresh the list
    } catch (err) {
      console.error('Failed to delete squad:', err);
      setError(err.response?.data?.error || '스쿼드 모집 삭제에 실패했습니다');
    }
  };

  // Toast helper for new admin components
  const showToast = useCallback((message, type = 'info') => {
    if (type === 'error') {
      setError(message);
      setSuccess('');
    } else if (type === 'success') {
      setSuccess(message);
      setError('');
    } else {
      // Default to success for 'info' and other types
      setSuccess(message);
      setError('');
    }
    // Auto-clear after 5 seconds
    setTimeout(() => {
      setError('');
      setSuccess('');
    }, 5000);
  }, []);

  const getReportTypeLabel = (type) => {
    const labels = {
      spam: '스팸',
      contact_sharing: '연락처 공유',
      harassment: '욕설/괴롭힘',
      rmt: '현금거래',
      other: '기타'
    };
    return labels[type] || type;
  };

  const getReportTypeColor = (type) => {
    const colors = {
      spam: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      contact_sharing: 'bg-orange-100 text-orange-800 border-orange-200',
      harassment: 'bg-red-100 text-red-800 border-red-200',
      rmt: 'bg-purple-100 text-purple-800 border-purple-200',
      other: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[type] || colors.other;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">관리자 패널</h1>
        <p className="text-gray-600 mt-2">시스템 관리 및 신고 처리</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('enhanced-stats')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'enhanced-stats'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            종합 통계
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'users'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            사용자 관리
          </button>
          <button
            onClick={() => setActiveTab('clans')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'clans'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            하이브 관리
          </button>
          <button
            onClick={() => setActiveTab('bug-reports')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'bug-reports'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            버그 제보 관리
          </button>
          {/* <button
            onClick={() => setActiveTab('stats')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'stats'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            거래 통계
          </button> */}
          <button
            onClick={() => setActiveTab('reports')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'reports'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            채팅 신고 관리
            {reports.length > 0 && reportStatus === 'pending' && (
              <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {reportsPagination.total}
              </span>
            )}
          </button>
          {/* <button
            onClick={() => setActiveTab('trades')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'trades'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            거래 게시물 관리
          </button>
          <button
            onClick={() => setActiveTab('squads')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'squads'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            스쿼드 모집 관리
          </button> */}
        </nav>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
          <p className="text-sm font-medium text-green-800">{success}</p>
        </div>
      )}

      {/* Enhanced Stats Tab */}
      {activeTab === 'enhanced-stats' && (
        <EnhancedStats showToast={showToast} />
      )}

      {/* Users Management Tab */}
      {activeTab === 'users' && (
        <UserManagement showToast={showToast} />
      )}

      {/* Clans Management Tab */}
      {activeTab === 'clans' && (
        <ClanManagement showToast={showToast} />
      )}

      {/* Bug Reports Management Tab */}
      {activeTab === 'bug-reports' && (
        <BugReportManagement showToast={showToast} />
      )}

      {/* Stats Tab - TEMPORARILY DISABLED */}
      {false && activeTab === 'stats' && stats && (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">전체 거래</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalTrades}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">거래중</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.activeTrades}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">거래완료</p>
                <p className="text-3xl font-bold text-gray-600 mt-2">{stats.completedTrades}</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">취소됨</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{stats.cancelledTrades}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        </>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex gap-4 items-center">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">신고 상태</label>
              <select
                value={reportStatus}
                onChange={(e) => {
                  setReportStatus(e.target.value);
                  setReportsPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="input-field"
              >
                <option value="pending">처리 대기중</option>
                <option value="reviewing">검토중</option>
                <option value="resolved">처리 완료</option>
                <option value="dismissed">기각됨</option>
              </select>
            </div>
          </div>

          {/* Reports List */}
          {reportsLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="mt-2 text-gray-600">로딩 중...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-gray-500">신고 내역이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div key={report.id} className="card p-6 border-l-4" style={{ borderLeftColor: report.report_type === 'rmt' || report.report_type === 'contact_sharing' ? '#DC2626' : '#6B7280' }}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-3 items-start flex-1">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 text-xs font-semibold rounded border ${getReportTypeColor(report.report_type)}`}>
                            {getReportTypeLabel(report.report_type)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(report.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 font-medium mb-1">
                          신고자: {report.reporter_username}
                        </p>
                        <p className="text-sm text-gray-700 mb-1">
                          신고 대상: {report.reported_username}
                        </p>
                        {report.description && (
                          <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                            {report.description}
                          </p>
                        )}
                      </div>
                    </div>
                    {report.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setExpandedReport(expandedReport === report.id ? null : report.id)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
                        >
                          {expandedReport === report.id ? '옵션 닫기' : '제재 옵션'}
                        </button>
                        <button
                          onClick={() => handleReviewReport(report.id, 'dismissed', '정상 메시지로 확인됨')}
                          className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded transition-colors"
                        >
                          기각
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Sanction Options */}
                  {expandedReport === report.id && (
                    <div className="mt-3 bg-gray-50 border border-gray-300 rounded-lg p-4">
                      <h4 className="text-sm font-bold text-gray-800 mb-3">제재 옵션 선택</h4>

                      <div className="space-y-3">
                        {/* Warning Option */}
                        <label className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={banOptions[report.id]?.issueWarning || false}
                            onChange={(e) => setBanOptions({
                              ...banOptions,
                              [report.id]: { ...banOptions[report.id], issueWarning: e.target.checked }
                            })}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-700">경고 발급</span>
                            {banOptions[report.id]?.issueWarning && (
                              <select
                                value={banOptions[report.id]?.warningSeverity || 'low'}
                                onChange={(e) => setBanOptions({
                                  ...banOptions,
                                  [report.id]: { ...banOptions[report.id], warningSeverity: e.target.value }
                                })}
                                className="ml-2 text-xs border border-gray-300 rounded px-2 py-1"
                              >
                                <option value="low">낮음</option>
                                <option value="medium">중간</option>
                                <option value="high">높음</option>
                              </select>
                            )}
                          </div>
                        </label>

                        {/* Ban Option */}
                        <label className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={banOptions[report.id]?.banUser || false}
                            onChange={(e) => setBanOptions({
                              ...banOptions,
                              [report.id]: { ...banOptions[report.id], banUser: e.target.checked }
                            })}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-700">사용자 차단</span>
                            {banOptions[report.id]?.banUser && (
                              <select
                                value={banOptions[report.id]?.banDuration || '7'}
                                onChange={(e) => setBanOptions({
                                  ...banOptions,
                                  [report.id]: { ...banOptions[report.id], banDuration: e.target.value }
                                })}
                                className="ml-2 text-xs border border-gray-300 rounded px-2 py-1"
                              >
                                <option value="1">1일</option>
                                <option value="3">3일</option>
                                <option value="7">7일</option>
                                <option value="14">14일</option>
                                <option value="30">30일</option>
                                <option value="permanent">영구 차단</option>
                              </select>
                            )}
                          </div>
                        </label>

                        {/* Admin Notes */}
                        <div>
                          <label className="text-sm font-medium text-gray-700 block mb-1">
                            관리자 메모 (필수)
                          </label>
                          <textarea
                            value={banOptions[report.id]?.adminNotes || ''}
                            onChange={(e) => setBanOptions({
                              ...banOptions,
                              [report.id]: { ...banOptions[report.id], adminNotes: e.target.value }
                            })}
                            className="w-full text-sm border border-gray-300 rounded px-3 py-2"
                            rows="2"
                            placeholder="제재 사유를 입력하세요..."
                          />
                        </div>

                        {/* Submit Button */}
                        <button
                          onClick={() => {
                            const options = banOptions[report.id] || {};
                            if (!options.adminNotes) {
                              setError('관리자 메모를 입력해주세요');
                              return;
                            }
                            handleReviewReport(report.id, 'resolved', options.adminNotes, options);
                            setBanOptions({ ...banOptions, [report.id]: {} });
                            setExpandedReport(null);
                          }}
                          className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition-colors"
                        >
                          승인 및 제재 실행
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Message Content */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">신고된 메시지:</p>
                    <p className="text-sm text-gray-900">{report.filtered_message || report.message_content}</p>
                  </div>

                  {/* Admin Notes */}
                  {report.admin_notes && (
                    <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-xs font-medium text-blue-800 mb-1">관리자 메모:</p>
                      <p className="text-sm text-blue-900">{report.admin_notes}</p>
                      {report.reviewed_at && (
                        <p className="text-xs text-blue-600 mt-1">
                          처리일: {new Date(report.reviewed_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {reportsPagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => setReportsPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                disabled={reportsPagination.page === 1}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                이전
              </button>
              <span className="px-4 py-2 text-sm text-gray-700">
                {reportsPagination.page} / {reportsPagination.totalPages}
              </span>
              <button
                onClick={() => setReportsPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                disabled={reportsPagination.page === reportsPagination.totalPages}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음
              </button>
            </div>
          )}
        </div>
      )}

      {/* Trades Management Tab - TEMPORARILY DISABLED */}
      {false && activeTab === 'trades' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">거래 상태</label>
              <select
                value={tradesFilter.status}
                onChange={(e) => {
                  setTradesFilter({ ...tradesFilter, status: e.target.value });
                  setTradesPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="input-field"
              >
                <option value="">전체</option>
                <option value="active">거래중</option>
                <option value="completed">거래완료</option>
                <option value="cancelled">취소됨</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">검색</label>
              <input
                type="text"
                placeholder="제목, 설명, 판매자 이름으로 검색..."
                value={tradesFilter.search}
                onChange={(e) => setTradesFilter({ ...tradesFilter, search: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setTradesPagination(prev => ({ ...prev, page: 1 }));
                    fetchTrades();
                  }
                }}
                className="input-field"
              />
            </div>
            <button
              onClick={() => {
                setTradesPagination(prev => ({ ...prev, page: 1 }));
                fetchTrades();
              }}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
            >
              검색
            </button>
          </div>

          {/* Trades List */}
          {tradesLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="mt-2 text-gray-600">로딩 중...</p>
            </div>
          ) : trades.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-gray-500">거래 게시물이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-4">
              {trades.map((trade) => (
                <div key={trade.id} className="card p-6 border-l-4" style={{
                  borderLeftColor: trade.status === 'active' ? '#10B981' : trade.status === 'completed' ? '#6B7280' : '#EF4444'
                }}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">{trade.title}</h3>
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${
                          trade.status === 'active' ? 'bg-green-100 text-green-800' :
                          trade.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {trade.status === 'active' ? '거래중' : trade.status === 'completed' ? '완료' : '취소'}
                        </span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${
                          trade.trade_type === 'eternalland' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {trade.trade_type === 'eternalland' ? '이터널랜드' : '서버거래'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{trade.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>판매자: <strong>{trade.seller_username}</strong></span>
                        {trade.buyer_username && (
                          <span>구매자: <strong>{trade.buyer_username}</strong></span>
                        )}
                        <span>아이템: <strong>{trade.item_name}</strong></span>
                        {trade.price && <span>가격: <strong>{trade.price}</strong></span>}
                        <span className="text-xs">{new Date(trade.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const reason = prompt('삭제 사유를 입력하세요:');
                        if (reason) {
                          if (confirm(`정말로 "${trade.title}" 거래를 삭제하시겠습니까?`)) {
                            handleDeleteTrade(trade.id, reason);
                          }
                        }
                      }}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition-colors"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {tradesPagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => setTradesPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                disabled={tradesPagination.page === 1}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                이전
              </button>
              <span className="px-4 py-2 text-sm text-gray-700">
                {tradesPagination.page} / {tradesPagination.totalPages}
              </span>
              <button
                onClick={() => setTradesPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                disabled={tradesPagination.page === tradesPagination.totalPages}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음
              </button>
            </div>
          )}
        </div>
      )}

      {/* Squad Recruitments Management Tab - TEMPORARILY DISABLED */}
      {false && activeTab === 'squads' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">모집 상태</label>
              <select
                value={squadsFilter.status}
                onChange={(e) => {
                  setSquadsFilter({ ...squadsFilter, status: e.target.value });
                  setSquadsPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="input-field"
              >
                <option value="">전체</option>
                <option value="recruiting">모집중</option>
                <option value="closed">모집마감</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">검색</label>
              <input
                type="text"
                placeholder="제목, 설명, 모집자 이름으로 검색..."
                value={squadsFilter.search}
                onChange={(e) => setSquadsFilter({ ...squadsFilter, search: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setSquadsPagination(prev => ({ ...prev, page: 1 }));
                    fetchSquads();
                  }
                }}
                className="input-field"
              />
            </div>
            <button
              onClick={() => {
                setSquadsPagination(prev => ({ ...prev, page: 1 }));
                fetchSquads();
              }}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
            >
              검색
            </button>
          </div>

          {/* Squads List */}
          {squadsLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="mt-2 text-gray-600">로딩 중...</p>
            </div>
          ) : squads.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-gray-500">스쿼드 모집 게시물이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-4">
              {squads.map((squad) => (
                <div key={squad.id} className="card p-6 border-l-4" style={{
                  borderLeftColor: squad.status === 'recruiting' ? '#10B981' : '#6B7280'
                }}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">{squad.title}</h3>
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${
                          squad.status === 'recruiting' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {squad.status === 'recruiting' ? '모집중' : '모집마감'}
                        </span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${
                          squad.squad_type === 'pvp' ? 'bg-red-100 text-red-800' :
                          squad.squad_type === 'pve' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {squad.squad_type === 'pvp' ? 'PvP' : squad.squad_type === 'pve' ? 'PvE' : '혼합'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{squad.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>모집자: <strong>{squad.recruiter_username}</strong></span>
                        <span>서버: <strong>{squad.server_name}</strong></span>
                        <span>모집인원: <strong>{squad.required_members}명</strong></span>
                        <span className="text-xs">{new Date(squad.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</span>
                      </div>
                      {squad.requirements && (
                        <p className="text-sm text-gray-500 mt-2">요구사항: {squad.requirements}</p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        const reason = prompt('삭제 사유를 입력하세요:');
                        if (reason) {
                          if (confirm(`정말로 "${squad.title}" 스쿼드 모집을 삭제하시겠습니까?`)) {
                            handleDeleteSquad(squad.id, reason);
                          }
                        }
                      }}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition-colors"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {squadsPagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => setSquadsPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                disabled={squadsPagination.page === 1}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                이전
              </button>
              <span className="px-4 py-2 text-sm text-gray-700">
                {squadsPagination.page} / {squadsPagination.totalPages}
              </span>
              <button
                onClick={() => setSquadsPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                disabled={squadsPagination.page === squadsPagination.totalPages}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
