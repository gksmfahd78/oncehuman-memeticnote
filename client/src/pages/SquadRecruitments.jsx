import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { getImageUrl } from '../utils/imageUrl';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function SquadRecruitments() {
  const { user } = useAuth();
  const [recruitments, setRecruitments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    squad_type: '',
    server_name: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0
  });

  useEffect(() => {
    fetchRecruitments();
  }, [filters, pagination.page]);

  const fetchRecruitments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(filters.status && { status: filters.status }),
        ...(filters.squad_type && { squad_type: filters.squad_type }),
        ...(filters.server_name && { server_name: filters.server_name })
      });

      const response = await axios.get(`${API_BASE_URL}/api/squad-recruitments?${params}`);
      setRecruitments(response.data.recruitments);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination.total,
        totalPages: response.data.pagination.totalPages
      }));
    } catch (error) {
      console.error('Failed to fetch recruitments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const getSquadTypeLabel = (type) => {
    const labels = {
      pvp: 'PvP',
      pve: 'PvE',
      mixed: '혼합'
    };
    return labels[type] || type;
  };

  const getSquadTypeColor = (type) => {
    const colors = {
      pvp: 'bg-red-100 text-red-700 border-red-200',
      pve: 'bg-blue-100 text-blue-700 border-blue-200',
      mixed: 'bg-gray-100 text-gray-700 border-gray-200'
    };
    return colors[type] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getStatusColor = (status) => {
    return status === 'recruiting'
      ? 'bg-green-100 text-green-700'
      : 'bg-gray-100 text-gray-700';
  };

  const getStatusLabel = (status) => {
    return status === 'recruiting' ? '모집중' : '모집마감';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      timeZone: 'Asia/Seoul',
      month: 'short',
      day: 'numeric'
    });
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, pagination.page - Math.floor(maxVisible / 2));
    let end = Math.min(pagination.totalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">스쿼드 모집</h1>
          <p className="text-gray-600 mt-1">함께 플레이할 스쿼드원을 찾아보세요</p>
        </div>
        {user && (
          <Link
            to="/squad-recruitments/new"
            className="btn-primary flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            스쿼드 모집하기
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">모집 상태</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">전체</option>
              <option value="recruiting">모집중</option>
              <option value="closed">모집마감</option>
            </select>
          </div>

          {/* Squad Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">스쿼드 유형</label>
            <select
              value={filters.squad_type}
              onChange={(e) => handleFilterChange('squad_type', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">전체</option>
              <option value="pvp">PvP</option>
              <option value="pve">PvE</option>
              <option value="mixed">혼합</option>
            </select>
          </div>

          {/* Server Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">서버</label>
            <input
              type="text"
              value={filters.server_name}
              onChange={(e) => handleFilterChange('server_name', e.target.value)}
              placeholder="서버 이름 검색"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      )}

      {/* Empty State */}
      {!loading && recruitments.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p className="text-lg text-gray-600 font-medium mb-2">등록된 스쿼드 모집이 없습니다</p>
          <p className="text-gray-500">첫 번째로 스쿼드를 모집해보세요!</p>
        </div>
      )}

      {/* Recruitment Grid */}
      {!loading && recruitments.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recruitments.map((recruitment) => (
              <Link
                key={recruitment.id}
                to={`/squad-recruitments/${recruitment.id}`}
                className="group bg-white rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-lg transition-all duration-200 overflow-hidden"
              >
                {/* Card Header */}
                <div className={`p-4 border-b ${
                  recruitment.status === 'recruiting'
                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-100 dark:border-green-700'
                    : 'bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-700 dark:to-gray-600 border-gray-100 dark:border-gray-600'
                }`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${getStatusColor(recruitment.status)}`}>
                      {getStatusLabel(recruitment.status)}
                    </span>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${getSquadTypeColor(recruitment.squad_type)}`}>
                      {getSquadTypeLabel(recruitment.squad_type)}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-base line-clamp-2 group-hover:text-primary-600 transition-colors">
                    {recruitment.title}
                  </h3>
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-3">
                  {/* Description */}
                  <p className="text-sm text-gray-600 line-clamp-2">{recruitment.description}</p>

                  {/* Server */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                    </svg>
                    <span className="truncate">{recruitment.server_name}</span>
                  </div>

                  {/* Members */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span>{recruitment.required_members}명 모집</span>
                  </div>

                  {/* Recruiter */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                      {recruitment.recruiter_discord_avatar ? (
                        <img
                          src={getImageUrl(recruitment.recruiter_discord_avatar)}
                          alt={recruitment.recruiter_username}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary-500 text-white text-sm font-bold">
                          {recruitment.recruiter_username?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{recruitment.recruiter_username}</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(recruitment.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                disabled={pagination.page === 1}
                className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                이전
              </button>

              <div className="flex items-center gap-1">
                {pageNumbers.map((page) => (
                  <button
                    key={page}
                    onClick={() => setPagination(prev => ({ ...prev, page }))}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      pagination.page === page
                        ? 'bg-primary-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default SquadRecruitments;
