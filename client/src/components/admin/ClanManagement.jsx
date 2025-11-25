import { useState, useEffect, useCallback } from 'react';
import axios from '../../utils/axios';

const ClanManagement = ({ showToast }) => {
  const [clans, setClans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState({ search: '', sortBy: 'created_at', sortOrder: 'desc' });
  const [selectedClan, setSelectedClan] = useState(null);
  const [showClanDetail, setShowClanDetail] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');

  const fetchClans = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/admin/clans', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          ...filters
        }
      });
      setClans(response.data?.clans || []);
      setPagination(prev => ({
        ...prev,
        total: response.data?.pagination?.total || 0,
        totalPages: response.data?.pagination?.totalPages || 0
      }));
    } catch (error) {
      console.error('Fetch clans error:', error);
      showToast(error.response?.data?.error || '하이브 목록을 불러오는데 실패했습니다', 'error');
      setClans([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters, showToast]);

  const fetchClanDetail = async (clanId) => {
    try {
      const response = await axios.get(`/admin/clans/${clanId}`);
      setSelectedClan(response.data);
      setShowClanDetail(true);
    } catch (error) {
      showToast(error.response?.data?.error || '하이브 정보를 불러오는데 실패했습니다', 'error');
    }
  };

  const handleDeleteClan = async () => {
    if (!deleteReason.trim()) {
      showToast('삭제 사유를 입력해주세요', 'warning');
      return;
    }

    try {
      await axios.delete(`/admin/clans/${selectedClan.clan.id}`, {
        data: { reason: deleteReason }
      });
      showToast('하이브가 삭제되었습니다', 'success');
      setShowDeleteModal(false);
      setShowClanDetail(false);
      setDeleteReason('');
      fetchClans();
    } catch (error) {
      showToast(error.response?.data?.error || '하이브 삭제에 실패했습니다', 'error');
    }
  };

  useEffect(() => {
    fetchClans();
  }, [fetchClans]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="하이브 검색..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          />
          <select
            value={filters.sortBy}
            onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="created_at">생성일</option>
            <option value="clan_name">하이브명</option>
            <option value="member_count">멤버 수</option>
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

      {/* Clans Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">하이브명</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">서버</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">마스터</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">멤버 수</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">메메틱 수</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">생성일</th>
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
              ) : clans.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    하이브가 없습니다
                  </td>
                </tr>
              ) : (
                clans.map((clan) => (
                  <tr key={clan.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{clan.clan_name}</div>
                      <div className="text-sm text-gray-500">ID: {clan.clan_id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {clan.server_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {clan.master_username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {clan.member_count}명
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {clan.memetic_count}개
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(clan.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button
                        onClick={() => fetchClanDetail(clan.id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        상세
                      </button>
                      <button
                        onClick={() => {
                          fetchClanDetail(clan.id);
                          setShowDeleteModal(true);
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        삭제
                      </button>
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
              전체 {pagination.total}개 중 {((pagination.page - 1) * pagination.limit) + 1}-
              {Math.min(pagination.page * pagination.limit, pagination.total)}개 표시
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

      {/* Clan Detail Modal */}
      {showClanDetail && selectedClan && !showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold">{selectedClan.clan.clan_name}</h2>
                  <p className="text-gray-600">서버: {selectedClan.clan.server_name || 'N/A'}</p>
                </div>
                <button onClick={() => setShowClanDetail(false)} className="text-gray-500 hover:text-gray-700">
                  ✕
                </button>
              </div>

              {/* Clan Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">멤버 수</div>
                  <div className="text-2xl font-bold text-blue-600">{selectedClan.clan.member_count}</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">메메틱 수</div>
                  <div className="text-2xl font-bold text-purple-600">{selectedClan.clan.memetic_count}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">마스터</div>
                  <div className="text-sm font-bold text-green-600">{selectedClan.clan.master_username}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">생성일</div>
                  <div className="text-sm font-bold text-gray-600">
                    {new Date(selectedClan.clan.created_at).toLocaleDateString('ko-KR')}
                  </div>
                </div>
              </div>

              {/* Members */}
              <div className="mb-6">
                <h3 className="font-bold mb-3">멤버 목록 ({selectedClan.members?.length})</h3>
                <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedClan.members?.map(member => (
                      <div key={member.id} className="bg-white rounded p-3 border">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{member.username}</div>
                            <div className="text-xs text-gray-500">
                              거래온도: {(member.trust_score || 36.5).toFixed(1)}°C
                            </div>
                          </div>
                          {member.role === 'master' && (
                            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                              마스터
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Memetics */}
              <div className="mb-6">
                <h3 className="font-bold mb-3">메메틱 목록 ({selectedClan.memetics?.length})</h3>
                <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {selectedClan.memetics?.map(memetic => (
                      <div key={memetic.id} className="bg-white rounded p-3 border">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{memetic.memetic_name}</div>
                            <div className="text-xs text-gray-500">Lv.{memetic.level}</div>
                          </div>
                          <span className="text-xs text-gray-400">{memetic.owner_username}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  하이브 삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedClan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4 text-red-600">하이브 삭제</h3>
            <p className="text-gray-700 mb-4">
              <strong>{selectedClan.clan.clan_name}</strong> 하이브를 삭제하시겠습니까?
              <br/>
              <span className="text-sm text-red-600">
                ⚠️ 모든 멤버와 메메틱 정보가 함께 삭제됩니다!
              </span>
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">삭제 사유 *</label>
                <textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows="3"
                  placeholder="삭제 사유를 입력하세요"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteClan}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  삭제하기
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteReason('');
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

export default ClanManagement;
