import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../utils/axios';

const InviteJoin = () => {
  const { inviteCode } = useParams();
  const navigate = useNavigate();
  const [clan, setClan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchClanInfo();
  }, [inviteCode]);

  const fetchClanInfo = async () => {
    try {
      const response = await axios.get(`/clans/invite/${inviteCode}`);
      setClan(response.data);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || '유효하지 않은 초대 코드입니다');
      setLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      await axios.post(`/clans/join/${inviteCode}`);
      setSuccess('가입 신청이 완료되었습니다! 하이브장의 승인을 기다려주세요.');
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || '가입 신청에 실패했습니다');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-200">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-200 dark:border-primary-700 mx-auto mb-4"></div>
            <div className="absolute inset-0 animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-primary-600 dark:border-t-primary-400 mx-auto"></div>
          </div>
          <p className="text-gray-700 dark:text-gray-300 font-medium">초대 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error && !clan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 transition-colors duration-200">
        <div className="max-w-md w-full">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center border border-gray-100 dark:border-gray-700 transition-colors duration-200">
            <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/50 dark:to-red-800/50 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">초대 코드를 찾을 수 없습니다</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">{error}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full bg-gradient-to-r from-primary-600 to-primary-700 dark:from-primary-500 dark:to-primary-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-primary-700 hover:to-primary-800 dark:hover:from-primary-600 dark:hover:to-primary-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              대시보드로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-2 sm:px-4 py-4 sm:py-8 transition-colors duration-200">
      <div className="max-w-2xl w-full">
        {/* Main Card */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 transition-colors duration-200">
          {/* Header with gradient */}
          <div className="relative bg-gradient-to-br from-primary-500 via-indigo-600 to-purple-600 px-4 sm:px-8 py-8 sm:py-12 text-white overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
              <div className="absolute bottom-0 right-0 w-60 h-60 bg-white rounded-full translate-x-1/3 translate-y-1/3"></div>
            </div>

            {/* Content */}
            <div className="relative text-center">
              <div className="inline-block mb-4">
                <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-white font-bold text-4xl shadow-2xl border-4 border-white/30 transform hover:scale-105 transition-transform duration-200">
                  {clan?.clanName?.charAt(0).toUpperCase()}
                </div>
              </div>
              <h1 className="text-4xl font-bold mb-2 drop-shadow-lg">
                {clan?.clanName}
              </h1>
              <p className="text-white/90 text-lg font-medium">하이브 가입 초대장</p>

              {/* Decorative line */}
              <div className="mt-6 flex items-center justify-center gap-2">
                <div className="h-px bg-white/30 w-20"></div>
                <svg className="w-5 h-5 text-white/50" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <div className="h-px bg-white/30 w-20"></div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-8">
            {/* Clan Details Cards */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-2xl p-5 border border-blue-200 dark:border-blue-700 transform hover:scale-105 transition-all duration-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-blue-500 dark:bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium block">하이브장</span>
                    <span className="font-bold text-blue-900 dark:text-blue-100">{clan?.masterUsername}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-2xl p-5 border border-purple-200 dark:border-purple-700 transform hover:scale-105 transition-all duration-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-purple-500 dark:bg-purple-600 rounded-xl flex items-center justify-center shadow-md">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-xs text-purple-600 dark:text-purple-400 font-medium block">멤버 수</span>
                    <span className="font-bold text-purple-900 dark:text-purple-100">{clan?.memberCount}명</span>
                  </div>
                </div>
              </div>

              <div className="col-span-2 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-2xl p-5 border border-green-200 dark:border-green-700 transform hover:scale-105 transition-all duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 dark:bg-green-600 rounded-xl flex items-center justify-center shadow-md">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium block">생성일</span>
                    <span className="font-bold text-green-900 dark:text-green-100">
                      {clan?.createdAt && new Date(clan.createdAt).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Join Form */}
            {success ? (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-500 dark:border-green-400 p-6 rounded-2xl animate-fade-in transition-colors duration-200">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-500 dark:bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg animate-bounce">
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-green-900 dark:text-green-100 text-lg mb-1">가입 신청 완료!</h3>
                    <p className="text-green-700 dark:text-green-300">{success}</p>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleJoin} className="space-y-6">
                {error && (
                  <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-2 border-red-500 dark:border-red-400 p-5 rounded-2xl transition-colors duration-200">
                    <div className="flex items-start gap-3">
                      <svg className="w-6 h-6 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <p className="font-medium text-red-800 dark:text-red-300">{error}</p>
                    </div>
                  </div>
                )}

                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-2 border-amber-300 dark:border-amber-600 p-5 rounded-2xl transition-colors duration-200">
                  <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h4 className="font-bold text-amber-900 dark:text-amber-100 mb-1">안내사항</h4>
                      <p className="text-sm text-amber-800 dark:text-amber-300">
                        가입 후 "내 메메틱" 페이지에서 하이브에 등록할 캐릭터를 선택할 수 있습니다.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-gradient-to-r from-primary-600 via-indigo-600 to-purple-600 dark:from-primary-500 dark:via-indigo-500 dark:to-purple-500 text-white font-bold py-4 px-6 rounded-xl hover:from-primary-700 hover:via-indigo-700 hover:to-purple-700 dark:hover:from-primary-600 dark:hover:via-indigo-600 dark:hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2 group"
                  >
                    {submitting ? (
                      <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        신청 중...
                      </>
                    ) : (
                      <>
                        가입 신청하기
                        <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard')}
                    className="px-8 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold py-4 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 border-2 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                  >
                    취소
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Footer hint */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            초대 코드를 통해 안전하게 하이브에 가입할 수 있습니다
          </p>
        </div>
      </div>
    </div>
  );
};

export default InviteJoin;
