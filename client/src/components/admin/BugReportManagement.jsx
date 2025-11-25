import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../utils/axios';

const BugReportManagement = ({ showToast }) => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ status: 'pending', type: '' });

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/bug-reports', {
        params: {
          status: filter.status || undefined,
          type: filter.type || undefined
        }
      });
      setReports(response.data);
    } catch (err) {
      console.error('Failed to fetch bug reports:', err);
      showToast(err.response?.data?.error || '제보 목록을 불러오는데 실패했습니다', 'error');
    } finally {
      setLoading(false);
    }
  }, [filter, showToast]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleUpdateStatus = async (reportId, newStatus) => {
    try {
      await axios.patch(`/bug-reports/${reportId}/status`, {
        status: newStatus
      });
      showToast('제보 상태가 업데이트되었습니다', 'success');
      fetchReports();
    } catch (err) {
      console.error('Failed to update report:', err);
      showToast(err.response?.data?.error || '상태 업데이트에 실패했습니다', 'error');
    }
  };

  const handleChatWithUser = (userId, username) => {
    // Navigate to chat page with this user
    navigate('/chats', { state: { targetUserId: userId, targetUsername: username } });
  };

  const getTypeLabel = (type) => {
    const labels = {
      bug: '🐛 버그',
      feature: '💡 기능 제안',
      question: '❓ 문의'
    };
    return labels[type] || type;
  };

  const getTypeColor = (type) => {
    const colors = {
      bug: 'bg-red-100 text-red-700 border-red-300',
      feature: 'bg-blue-100 text-blue-700 border-blue-300',
      question: 'bg-green-100 text-green-700 border-green-300'
    };
    return colors[type] || 'bg-gray-100 text-gray-700 border-gray-300';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: '대기 중',
      in_progress: '처리 중',
      resolved: '해결됨',
      closed: '종료됨'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      in_progress: 'bg-blue-100 text-blue-800 border-blue-300',
      resolved: 'bg-green-100 text-green-800 border-green-300',
      closed: 'bg-gray-100 text-gray-800 border-gray-300'
    };
    return colors[status] || colors.pending;
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <p className="mt-2 text-gray-600">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">상태</label>
          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">전체</option>
            <option value="pending">대기 중</option>
            <option value="in_progress">처리 중</option>
            <option value="resolved">해결됨</option>
            <option value="closed">종료됨</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">유형</label>
          <select
            value={filter.type}
            onChange={(e) => setFilter({ ...filter, type: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">전체</option>
            <option value="bug">버그</option>
            <option value="feature">기능 제안</option>
            <option value="question">문의</option>
          </select>
        </div>
      </div>

      {/* Reports List */}
      {reports.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">제보 내역이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-lg border ${getTypeColor(report.type)}`}>
                      {getTypeLabel(report.type)}
                    </span>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-lg border ${getStatusColor(report.status)}`}>
                      {getStatusLabel(report.status)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(report.created_at).toLocaleString('ko-KR')}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{report.title}</h3>
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">제보자:</span> {report.reporter_username}
                  </div>
                </div>
                <div className="flex gap-2">
                  {/* Chat button */}
                  <button
                    onClick={() => handleChatWithUser(report.user_id, report.reporter_username)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    채팅으로 답변
                  </button>
                  {/* Status change buttons */}
                  {report.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(report.id, 'in_progress')}
                        className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-semibold rounded-lg transition-colors"
                      >
                        처리 중
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(report.id, 'resolved')}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
                      >
                        해결 완료
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(report.id, 'closed')}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-semibold rounded-lg transition-colors"
                      >
                        종료
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-700 mb-1">상세 내용:</p>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{report.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BugReportManagement;
