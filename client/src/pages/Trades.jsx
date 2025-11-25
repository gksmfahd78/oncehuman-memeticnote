import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from '../utils/axios';
import { useAuth } from '../contexts/AuthContext';
import { getImageUrl } from '../utils/imageUrl';
import { getTradeTypeLabel, getStatusLabel, getStatusColor } from '../utils/tradeUtils';

const Trades = () => {
  const { user } = useAuth();
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState({ status: '', listing_type: '', trade_type: '', myTrades: false });
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  // AbortController for request cancellation (중복 요청 방지)
  const abortControllerRef = useRef(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1 on search
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchTrades = useCallback(async () => {
    // 이전 요청 취소 (중복 요청 방지)
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 새로운 AbortController 생성
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.status) params.append('status', filter.status);
      if (filter.listing_type) params.append('listing_type', filter.listing_type);
      if (filter.trade_type) params.append('trade_type', filter.trade_type);
      if (filter.myTrades && user) params.append('user_id', user.id);
      if (debouncedSearchQuery.trim()) params.append('search', debouncedSearchQuery);
      params.append('page', pagination.page);
      params.append('limit', pagination.limit);

      const response = await axios.get(`/trades?${params}`, {
        signal: abortControllerRef.current.signal
      });
      setTrades(response.data.trades);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination.total,
        totalPages: response.data.pagination.totalPages
      }));
      setError('');
    } catch (err) {
      // AbortError는 무시 (의도적 취소)
      if (err.name === 'CanceledError' || err.name === 'AbortError') {
        return;
      }
      console.error('Fetch trades error:', err);
      setError('거래 목록을 불러오는 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  }, [filter.status, filter.trade_type, filter.myTrades, debouncedSearchQuery, pagination.page, pagination.limit, user]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);


  const formatDate = useCallback((dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Seoul',
      hour12: false
    });
  }, []);

  // Pagination 페이지 번호 계산 (useMemo로 최적화)
  const pageNumbers = useMemo(() => {
    return Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
      .filter(page =>
        page === 1 ||
        page === pagination.totalPages ||
        Math.abs(page - pagination.page) <= 1
      );
  }, [pagination.totalPages, pagination.page]);


  return (
    <div className="max-w-6xl mx-auto py-4 md:py-8 px-0 sm:px-4">
      <div className="flex justify-between items-center mb-4 md:mb-6 px-4 sm:px-0">
        <h1 className="text-2xl md:text-3xl font-bold">거래 게시판</h1>
        {user && (
          <Link to="/trades/new" className="btn-primary text-sm md:text-base px-3 md:px-4 py-2">
            거래 등록
          </Link>
        )}
      </div>

      {!user && (
        <div className="mb-4 md:mb-6 bg-blue-50 border-l-4 border-blue-500 p-3 md:p-4 rounded-r-lg mx-4 sm:mx-0">
          <p className="text-sm text-blue-800">
            거래를 등록하려면 <Link to="/login" className="font-semibold underline">로그인</Link>이 필요합니다.
          </p>
        </div>
      )}

      {/* Search and Filters */}
      <div className="card p-4 mb-4 md:mb-6 rounded-none sm:rounded-lg border-y sm:border">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              검색
            </label>
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-10 w-full"
                placeholder="아이템명, 제목, 판매자 검색..."
              />
            </div>
          </div>

          {/* My Trades Filter */}
          {user && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                내 게시글
              </label>
              <button
                onClick={() => {
                  setFilter({ ...filter, myTrades: !filter.myTrades });
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className={`w-full h-[42px] px-4 py-2 rounded-lg font-medium transition-all ${
                  filter.myTrades
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filter.myTrades ? '전체 보기' : '내 게시글만'}
              </button>
            </div>
          )}

          {/* Listing Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              거래 타입
            </label>
            <select
              value={filter.listing_type}
              onChange={(e) => {
                setFilter({ ...filter, listing_type: e.target.value });
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="input-field w-full"
            >
              <option value="">전체</option>
              <option value="sell">판매</option>
              <option value="buy">구매</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              거래 상태
            </label>
            <select
              value={filter.status}
              onChange={(e) => {
                setFilter({ ...filter, status: e.target.value });
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="input-field w-full"
            >
              <option value="">전체</option>
              <option value="active">거래중</option>
              <option value="completed">거래완료</option>
              <option value="cancelled">취소됨</option>
            </select>
          </div>

          {/* Trade Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              거래 방법
            </label>
            <select
              value={filter.trade_type}
              onChange={(e) => {
                setFilter({ ...filter, trade_type: e.target.value });
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="input-field w-full"
            >
              <option value="">전체</option>
              <option value="server">서버 직거래</option>
              <option value="eternalland">이터널랜드</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-3 md:p-4 rounded-r-lg mx-4 md:mx-0">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-10 w-10 md:h-8 md:w-8 border-b-2 border-primary-600"></div>
          <p className="mt-3 text-base md:text-sm text-gray-600">로딩 중...</p>
        </div>
      )}

      {/* Trade List */}
      {!loading && trades.length === 0 && (
        <div className="text-center py-12">
          <p className="text-base md:text-sm text-gray-500">등록된 거래가 없습니다.</p>
        </div>
      )}

      {!loading && trades.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 md:gap-4 px-0 md:px-0">
            {trades.map((trade) => (
              <Link
                key={trade.id}
                to={`/trades/${trade.id}`}
                className="group bg-white rounded-none md:rounded-xl border-b md:border last:border-b-0 md:last:border-b border-gray-200 hover:border-primary-300 hover:shadow-lg transition-all duration-200 overflow-hidden"
              >
                {/* Card Header */}
                <div className={`p-4 border-b ${
                  trade.status === 'active' ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-100 dark:border-green-700' :
                  trade.status === 'completed' ? 'bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-700 dark:to-gray-600 border-gray-100 dark:border-gray-600' :
                  'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-red-100 dark:border-red-700'
                }`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${getStatusColor(trade.status)}`}>
                        {getStatusLabel(trade.status)}
                      </span>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                        trade.listing_type === 'buy'
                          ? 'bg-orange-100 text-orange-700 border border-orange-200'
                          : 'bg-green-100 text-green-700 border border-green-200'
                      }`}>
                        {trade.listing_type === 'buy' ? '구매' : '판매'}
                      </span>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                      trade.trade_type === 'eternalland'
                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                        : 'bg-blue-100 text-blue-700 border border-blue-200'
                    }`}>
                      {getTradeTypeLabel(trade.trade_type)}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-base line-clamp-2 mb-1 group-hover:text-primary-600 transition-colors">
                    {trade.item_name}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-1">
                    {trade.title}
                  </p>
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-3">
                  {/* Price */}
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-lg font-bold text-primary-600">
                      {trade.price || '가격협의'}
                    </span>
                  </div>

                  {/* Server */}
                  {trade.trade_type === 'server' && trade.server_name && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                      </svg>
                      <span className="truncate">{trade.server_name}</span>
                    </div>
                  )}

                  {/* Seller */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                      {trade.seller_discord_avatar ? (
                        <img
                          src={getImageUrl(trade.seller_discord_avatar)}
                          alt={trade.seller_username}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary-500 text-white text-sm font-bold">
                          {trade.seller_username?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{trade.seller_username}</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(trade.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-4 md:mt-6 flex items-center justify-center gap-1.5 md:gap-2 px-4 md:px-0">
            {/* Previous Button */}
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              disabled={pagination.page === 1}
              className="px-3 md:px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              이전
            </button>

            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {pageNumbers.map((page, idx, arr) => {
                  // Add ellipsis if there's a gap
                  const prevPage = arr[idx - 1];
                  const showEllipsis = prevPage && page - prevPage > 1;

                  return (
                    <div key={page} className="flex items-center gap-1">
                      {showEllipsis && (
                        <span className="px-1 md:px-2 text-gray-400 text-sm">...</span>
                      )}
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, page }))}
                        className={`min-w-[36px] md:min-w-[40px] px-2 md:px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          pagination.page === page
                            ? 'bg-primary-600 text-white shadow-sm'
                            : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    </div>
                  );
                })}
            </div>

            {/* Next Button */}
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
              disabled={pagination.page === pagination.totalPages}
              className="px-3 md:px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              다음
            </button>
          </div>
        )}
      </>
      )}
    </div>
  );
};

export default Trades;
