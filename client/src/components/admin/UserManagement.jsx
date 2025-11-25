import { useState, useEffect, useCallback } from 'react';
import axios from '../../utils/axios';
import { getTrustScoreColor, getTrustScoreEmoji } from '../../utils/trustScore';

const UserManagement = ({ showToast }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState({ search: '', sortBy: 'created_at', sortOrder: 'desc', filter: 'all' });
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDetail, setShowUserDetail] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [banForm, setBanForm] = useState({ reason: '', duration: 'permanent' });

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/admin/users', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          ...filters
        }
      });
      setUsers(response.data?.users || []);
      setPagination(prev => ({
        ...prev,
        total: response.data?.pagination?.total || 0,
        totalPages: response.data?.pagination?.totalPages || 0
      }));
    } catch (error) {
      console.error('Fetch users error:', error);
      showToast(error.response?.data?.error || '사용자 목록을 불러오는데 실패했습니다', 'error');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters, showToast]);

  const fetchUserDetail = async (userId) => {
    try {
      const response = await axios.get(`/admin/users/${userId}`);
      setSelectedUser(response.data);
      setShowUserDetail(true);
    } catch (error) {
      showToast(error.response?.data?.error || '사용자 정보를 불러오는데 실패했습니다', 'error');
    }
  };

  const handleBanUser = async () => {
    if (!banForm.reason.trim()) {
      showToast('차단 사유를 입력해주세요', 'warning');
      return;
    }

    try {
      await axios.post(`/admin/users/${selectedUser.user.id}/ban`, banForm);
      showToast('사용자를 차단했습니다', 'success');
      setShowBanModal(false);
      setBanForm({ reason: '', duration: 'permanent' });
      fetchUsers();
      if (showUserDetail) {
        fetchUserDetail(selectedUser.user.id);
      }
    } catch (error) {
      showToast(error.response?.data?.error || '사용자 차단에 실패했습니다', 'error');
    }
  };

  const handleUnbanUser = async (userId) => {
    try {
      await axios.post(`/admin/users/${userId}/unban`);
      showToast('사용자 차단을 해제했습니다', 'success');
      fetchUsers();
      if (showUserDetail && selectedUser.user.id === userId) {
        fetchUserDetail(userId);
      }
    } catch (error) {
      showToast(error.response?.data?.error || '차단 해제에 실패했습니다', 'error');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="사용자 검색..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          />
          <select
            value={filters.filter}
            onChange={(e) => setFilters({ ...filters, filter: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="all">전체 사용자</option>
            <option value="banned">차단된 사용자</option>
            <option value="inactive">비활성 사용자 (30일+)</option>
          </select>
          <select
            value={filters.sortBy}
            onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="created_at">가입일</option>
            <option value="username">닉네임</option>
            <option value="trust_score">거래온도</option>
            <option value="completed_trades_count">완료 거래</option>
          </select>
          <select
            value={filters.sortOrder}
            onChange={(e) => setFilters({ ...filters, sortOrder: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="desc">내림차순</option>
            <option value="asc">오름차순</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">사용자</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">이메일</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">거래온도</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">완료 거래</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">가입일</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">작업</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    로딩 중...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    사용자가 없습니다
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <img
                          className="h-10 w-10 rounded-full"
                          src={user.discord_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}`}
                          alt={user.username}
                        />
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{user.username}</div>
                          <div className="text-sm text-gray-500">@{user.uid}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="max-w-[200px] truncate" title={user.email}>
                        {user.email?.includes('@discord.user') ? 'Discord 계정' : user.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-bold ${getTrustScoreColor(user.trust_score || 36.5)}`}>
                        {getTrustScoreEmoji(user.trust_score || 36.5)} {(user.trust_score || 36.5).toFixed(1)}°C
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.completed_trades_count || 0}회
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.is_banned ? (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          차단됨
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          활성
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button
                        onClick={() => fetchUserDetail(user.id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        상세
                      </button>
                      {!user.is_banned ? (
                        <button
                          onClick={() => {
                            setSelectedUser({ user });
                            setShowBanModal(true);
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          차단
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUnbanUser(user.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          해제
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t">
            <div className="text-sm text-gray-700">
              전체 {pagination.total}명 중 {((pagination.page - 1) * pagination.limit) + 1}-
              {Math.min(pagination.page * pagination.limit, pagination.total)}명 표시
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                이전
              </button>
              <span className="px-3 py-1">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                다음
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {showUserDetail && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold">사용자 상세 정보</h2>
                <button onClick={() => setShowUserDetail(false)} className="text-gray-500 hover:text-gray-700">
                  ✕
                </button>
              </div>

              {/* User Info */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-bold mb-2">기본 정보</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>닉네임:</strong> {selectedUser.user.username}</p>
                    <p><strong>이메일:</strong> {selectedUser.user.email?.includes('@discord.user') ? 'Discord 계정' : selectedUser.user.email}</p>
                    <p><strong>UID:</strong> {selectedUser.user.uid}</p>
                    <p><strong>Discord:</strong> {selectedUser.user.discord_username || selectedUser.user.discord_id || 'N/A'}</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold mb-2">활동 통계</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>전체 거래:</strong> {selectedUser.user.total_trades}건</p>
                    <p><strong>완료 거래:</strong> {selectedUser.user.completed_trades}건</p>
                    <p><strong>취소 거래:</strong> {selectedUser.user.cancelled_trades}건</p>
                    <p><strong>거래온도:</strong> <span className={getTrustScoreColor(selectedUser.user.trust_score || 36.5)}>
                      {(selectedUser.user.trust_score || 36.5).toFixed(1)}°C
                    </span></p>
                  </div>
                </div>
              </div>

              {selectedUser.user.is_banned && (
                <div className="bg-red-50 border border-red-200 rounded p-4 mb-6">
                  <h3 className="font-bold text-red-800 mb-2">차단 정보</h3>
                  <p className="text-sm text-red-700"><strong>사유:</strong> {selectedUser.user.ban_reason}</p>
                  <p className="text-sm text-red-700">
                    <strong>기간:</strong> {selectedUser.user.ban_until ? `${new Date(selectedUser.user.ban_until).toLocaleString('ko-KR')}까지` : '영구'}
                  </p>
                </div>
              )}

              {/* Recent Trades */}
              <div className="mb-6">
                <h3 className="font-bold mb-3">최근 거래</h3>
                <div className="space-y-2">
                  {selectedUser.recentTrades?.map(trade => (
                    <div key={trade.id} className="border rounded p-3 text-sm">
                      <p className="font-medium">{trade.title}</p>
                      <div className="flex justify-between text-gray-600 mt-1">
                        <span>{trade.status === 'completed' ? '완료' : trade.status === 'active' ? '진행중' : '취소'}</span>
                        <span>{new Date(trade.created_at).toLocaleDateString('ko-KR')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {!selectedUser.user.is_banned ? (
                  <button
                    onClick={() => {
                      setShowBanModal(true);
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    사용자 차단
                  </button>
                ) : (
                  <button
                    onClick={() => handleUnbanUser(selectedUser.user.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    차단 해제
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ban Modal */}
      {showBanModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">사용자 차단</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">차단 사유 *</label>
                <textarea
                  value={banForm.reason}
                  onChange={(e) => setBanForm({ ...banForm, reason: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows="3"
                  placeholder="차단 사유를 입력하세요"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">차단 기간</label>
                <select
                  value={banForm.duration}
                  onChange={(e) => setBanForm({ ...banForm, duration: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="permanent">영구</option>
                  <option value="1">1일</option>
                  <option value="3">3일</option>
                  <option value="7">7일</option>
                  <option value="30">30일</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleBanUser}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  차단하기
                </button>
                <button
                  onClick={() => {
                    setShowBanModal(false);
                    setBanForm({ reason: '', duration: 'permanent' });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
