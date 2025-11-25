import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../utils/axios';

const CACHE_DURATION = 30000; // 30초

const Dashboard = () => {
  const [clans, setClans] = useState([]);
  const [showCreateClan, setShowCreateClan] = useState(false);
  const [clanName, setClanName] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // 캐시 관리 (30초 동안 재요청 방지)
  const clansCacheRef = useRef({ data: null, timestamp: 0 });

  const fetchClans = useCallback(async (forceRefresh = false) => {
    const now = Date.now();

    // 캐시가 유효한 경우 캐시 데이터 사용 (30초 이내)
    if (!forceRefresh &&
        clansCacheRef.current.data &&
        (now - clansCacheRef.current.timestamp) < CACHE_DURATION) {
      setClans(clansCacheRef.current.data);
      return;
    }

    // 캐시가 만료되었거나 강제 새로고침
    try {
      const response = await axios.get(`/clans`);
      setClans(response.data);

      // 캐시 업데이트
      clansCacheRef.current = {
        data: response.data,
        timestamp: now
      };
    } catch (err) {
      console.error('Failed to fetch clans:', err);
    }
  }, []);

  useEffect(() => {
    fetchClans();
  }, []); // 초기 로드 시 한 번만 실행

  useEffect(() => {
    // 페이지가 포커스될 때마다 자동으로 갱신 (캐시 체크)
    const handleFocus = () => {
      fetchClans(); // 캐시 체크 후 필요시만 fetch
    };

    window.addEventListener('focus', handleFocus);

    // Cleanup
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchClans]); // focus 이벤트 리스너는 별도 관리

  // useCallback으로 최적화 (불필요한 재생성 방지)
  const handleCloseForm = useCallback(() => {
    setShowCreateClan(false);
    setError('');
    setClanName('');
  }, []);

  const handleCreateClan = useCallback(async (e) => {
    e.preventDefault();
    setError('');

    try {
      await axios.post(`/clans`, { clanName });
      setClanName('');
      setShowCreateClan(false);
      fetchClans(true); // 생성 후 강제 새로고침
    } catch (err) {
      setError(err.response?.data?.error || '하이브 생성에 실패했습니다');
    }
  }, [clanName, fetchClans]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-primary-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-3 sm:py-8 px-0 sm:px-6 lg:px-8 animate-fade-in transition-colors duration-200">
      <div className="max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-start gap-3 sm:gap-4 mb-4 sm:mb-6 md:mb-10 px-4 sm:px-0">
          <div className="space-y-1.5 sm:space-y-2 flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-display font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 dark:from-purple-400 dark:via-indigo-400 dark:to-blue-400 bg-clip-text text-transparent tracking-tight">내 하이브</h1>
            <p className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm md:text-base lg:text-lg font-medium">하이브를 관리하고 메메틱을 함께 추적하세요</p>
            <div className="flex items-center space-x-2 pt-0.5 sm:pt-1 md:pt-2">
              <div className="flex items-center space-x-1 px-2 sm:px-2.5 md:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-purple-100 via-indigo-100 to-blue-100 dark:from-purple-900/50 dark:via-indigo-900/50 dark:to-blue-900/50 rounded-lg sm:rounded-xl border-2 border-purple-200 dark:border-purple-700 shadow-sm">
                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
                <span className="text-[10px] sm:text-xs md:text-sm font-bold text-purple-700 dark:text-purple-300">{clans.length}개 하이브</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowCreateClan(true)}
            className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 dark:from-purple-500 dark:via-indigo-500 dark:to-blue-500 text-white font-bold py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl hover:from-purple-700 hover:via-indigo-700 hover:to-blue-700 dark:hover:from-purple-600 dark:hover:via-indigo-600 dark:hover:to-blue-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center space-x-2 w-full sm:w-auto text-sm sm:text-base"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>하이브 생성</span>
          </button>
        </div>

        {/* Create Clan Form */}
        {showCreateClan && (
          <div className="bg-white dark:bg-gray-800 rounded-none sm:rounded-3xl shadow-2xl border-y sm:border-2 border-purple-200 dark:border-purple-700 p-4 sm:p-6 md:p-8 mb-6 sm:mb-8 animate-slide-down transition-colors duration-200">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 via-indigo-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-display font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 dark:from-purple-400 dark:via-indigo-400 dark:to-blue-400 bg-clip-text text-transparent">새 하이브 생성</h2>
              </div>
              <button
                onClick={handleCloseForm}
                className="w-9 h-9 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-xl transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {error && (
              <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-2 border-red-500 dark:border-red-400 p-5 rounded-2xl mb-6 animate-slide-down">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="font-medium text-red-800 dark:text-red-300">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleCreateClan} className="space-y-6">
              <div>
                <label htmlFor="clanName" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  하이브 이름
                </label>
                <input
                  id="clanName"
                  type="text"
                  value={clanName}
                  onChange={(e) => setClanName(e.target.value)}
                  className="input-field"
                  placeholder="예: 하이브"
                  required
                  autoFocus
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">다른 플레이어들과 구별되는 고유한 이름을 입력하세요</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 dark:from-purple-500 dark:via-indigo-500 dark:to-blue-500 text-white font-bold py-3 px-6 rounded-xl hover:from-purple-700 hover:via-indigo-700 hover:to-blue-700 dark:hover:from-purple-600 dark:hover:via-indigo-600 dark:hover:to-blue-600 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <span className="flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>하이브 생성</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="flex-1 bg-white dark:bg-gray-700 border-2 border-purple-200 dark:border-purple-700 text-gray-700 dark:text-gray-200 font-bold py-3 px-6 rounded-xl hover:bg-gradient-to-r hover:from-purple-50 hover:via-indigo-50 hover:to-blue-50 dark:hover:from-purple-900/30 dark:hover:via-indigo-900/30 dark:hover:to-blue-900/30 transition-all duration-200"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Empty State */}
        {clans.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-none sm:rounded-3xl shadow-2xl border-y sm:border-2 border-purple-200 dark:border-purple-700 p-6 sm:p-8 md:p-12 lg:p-16 text-center animate-scale-in transition-colors duration-200">
            <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-gradient-to-br from-purple-100 via-indigo-100 to-blue-100 dark:from-purple-900/50 dark:via-indigo-900/50 dark:to-blue-900/50 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-3 sm:mb-4 md:mb-6 shadow-lg">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-purple-500 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-base sm:text-xl md:text-2xl font-display font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 dark:from-purple-400 dark:via-indigo-400 dark:to-blue-400 bg-clip-text text-transparent mb-2 sm:mb-3">아직 하이브가 없습니다</h3>
            <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400 mb-4 sm:mb-6 md:mb-8 max-w-md mx-auto leading-relaxed px-2 sm:px-4">
              아직 하이브의 멤버가 아닙니다.<br />
              하이브를 생성하거나 초대를 기다려주세요!
            </p>
            <button
              onClick={() => setShowCreateClan(true)}
              className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 dark:from-purple-500 dark:via-indigo-500 dark:to-blue-500 text-white font-bold py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl hover:from-purple-700 hover:via-indigo-700 hover:to-blue-700 dark:hover:from-purple-600 dark:hover:via-indigo-600 dark:hover:to-blue-600 transition-all duration-200 shadow-lg hover:shadow-xl inline-flex items-center justify-center space-x-2 w-full sm:w-auto text-sm sm:text-base"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>첫 하이브 만들기</span>
            </button>
          </div>
        ) : (
          <div className="grid gap-0 md:gap-4 lg:gap-6 grid-cols-1 md:grid-cols-2">
            {clans.map((clan, index) => (
              <div
                key={clan.id}
                className="bg-white dark:bg-gray-800 rounded-none md:rounded-3xl shadow-xl border-b md:border-2 last:border-b-0 md:last:border-b-2 border-purple-200 dark:border-purple-700 p-4 sm:p-4 md:p-6 group cursor-pointer hover:shadow-2xl md:hover:scale-[1.02] transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => navigate(`/clan/${clan.id}`)}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3 sm:mb-4 md:mb-5">
                  <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 flex-1 min-w-0">
                    <div className="relative flex-shrink-0">
                      <div className="w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-gradient-to-br from-purple-500 via-indigo-600 to-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center text-white font-display font-bold text-base sm:text-lg md:text-xl shadow-lg group-hover:shadow-xl transition-all duration-300">
                        {clan.clanName.charAt(0).toUpperCase()}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 bg-gradient-to-br from-green-400 to-emerald-500 border-2 border-white dark:border-gray-800 rounded-full shadow-md"></div>
                    </div>
                    <div className="space-y-0.5 sm:space-y-1 md:space-y-1.5 flex-1 min-w-0">
                      <h2 className="text-base sm:text-lg md:text-xl font-display font-bold text-gray-900 dark:text-gray-100 group-hover:bg-gradient-to-r group-hover:from-purple-600 group-hover:via-indigo-600 group-hover:to-blue-600 dark:group-hover:from-purple-400 dark:group-hover:via-indigo-400 dark:group-hover:to-blue-400 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-300 leading-tight truncate">
                        {clan.clanName}
                      </h2>
                      <span className={`inline-flex items-center px-2 sm:px-2.5 md:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold ${
                        clan.role === 'master'
                          ? 'bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/50 dark:to-amber-900/50 text-yellow-800 dark:text-yellow-200 ring-2 ring-yellow-200/50 dark:ring-yellow-700/50'
                          : 'bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 text-blue-700 dark:text-blue-200 ring-2 ring-blue-200/50 dark:ring-blue-700/50'
                      }`}>
                        {clan.role === 'master' ? (
                          <>
                            <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            마스터
                          </>
                        ) : (
                          <>
                            <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                            멤버
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 flex items-center justify-center bg-purple-50 dark:bg-purple-900/30 group-hover:bg-gradient-to-br group-hover:from-purple-100 group-hover:to-indigo-100 dark:group-hover:from-purple-800/50 dark:group-hover:to-indigo-800/50 rounded-lg sm:rounded-xl transition-all duration-300 flex-shrink-0">
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-purple-400 dark:text-purple-300 group-hover:text-purple-600 dark:group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-purple-200 dark:via-purple-700 to-transparent mb-2.5 sm:mb-3 md:mb-4"></div>

                {/* Details */}
                <div className="space-y-2 sm:space-y-2.5 md:space-y-3">
                  <div className="flex items-center text-gray-600 dark:text-gray-400 group/item hover:text-gray-900 dark:hover:text-gray-200 transition-colors">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30 group-hover/item:from-purple-100 group-hover/item:to-indigo-100 dark:group-hover/item:from-purple-800/50 dark:group-hover/item:to-indigo-800/50 rounded-lg sm:rounded-xl mr-2 sm:mr-2.5 md:mr-3 transition-all flex-shrink-0">
                      <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-purple-500 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] sm:text-[10px] md:text-xs text-gray-500 dark:text-gray-500 block font-medium">마스터</span>
                      <span className="text-[11px] sm:text-xs md:text-sm font-bold text-gray-900 dark:text-gray-100 truncate block">{clan.masterUsername}</span>
                    </div>
                  </div>
                  <div className="flex items-center text-gray-600 dark:text-gray-400 group/item hover:text-gray-900 dark:hover:text-gray-200 transition-colors">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30 group-hover/item:from-purple-100 group-hover/item:to-indigo-100 dark:group-hover/item:from-purple-800/50 dark:group-hover/item:to-indigo-800/50 rounded-lg sm:rounded-xl mr-2 sm:mr-2.5 md:mr-3 transition-all flex-shrink-0">
                      <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-purple-500 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] sm:text-[10px] md:text-xs text-gray-500 dark:text-gray-500 block font-medium">생성일</span>
                      <span className="text-[11px] sm:text-xs md:text-sm font-bold text-gray-900 dark:text-gray-100 truncate block">{new Date(clan.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
