import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { getImageUrl } from '../utils/imageUrl';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function SquadRecruitmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recruitment, setRecruitment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRecruitment();
  }, [id]);

  const fetchRecruitment = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/squad-recruitments/${id}`);
      setRecruitment(response.data);
    } catch (err) {
      console.error('Failed to fetch recruitment:', err);
      setError(err.response?.data?.error || '스쿼드 모집을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('정말 이 모집글을 삭제하시겠습니까?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/api/squad-recruitments/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate('/squad-recruitments');
    } catch (err) {
      alert(err.response?.data?.error || '삭제에 실패했습니다');
    }
  };

  const handleStatusToggle = async () => {
    const newStatus = recruitment.status === 'recruiting' ? 'closed' : 'recruiting';
    const confirmMessage = newStatus === 'closed'
      ? '모집을 마감하시겠습니까?'
      : '모집을 다시 시작하시겠습니까?';

    if (!confirm(confirmMessage)) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API_BASE_URL}/api/squad-recruitments/${id}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRecruitment(response.data);
    } catch (err) {
      alert(err.response?.data?.error || '상태 변경에 실패했습니다');
    }
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
      pvp: 'from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20',
      pve: 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20',
      mixed: 'from-gray-50 to-slate-50 dark:from-gray-700 dark:to-gray-600'
    };
    return colors[type] || 'from-gray-50 to-slate-50 dark:from-gray-700 dark:to-gray-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error || !recruitment) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-bold text-red-800 mb-2">모집글을 찾을 수 없습니다</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={() => navigate('/squad-recruitments')} className="btn-primary">
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const isOwner = user && user.id === recruitment.user_id;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto py-4 md:py-8 px-4">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          뒤로가기
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className={`border-b bg-gradient-to-r ${getSquadTypeColor(recruitment.squad_type)}`}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      recruitment.status === 'recruiting'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {recruitment.status === 'recruiting' ? '모집중' : '모집마감'}
                    </span>
                    <span className="px-3 py-1 rounded-full text-sm font-semibold bg-white/50 border border-gray-300">
                      {getSquadTypeLabel(recruitment.squad_type)}
                    </span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                    {recruitment.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{new Date(recruitment.created_at).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                      </svg>
                      <span>{recruitment.server_name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span>{recruitment.required_members}명 모집</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Owner Actions */}
              {isOwner && (
                <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleStatusToggle}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      recruitment.status === 'recruiting'
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {recruitment.status === 'recruiting' ? '모집 마감하기' : '모집 재개하기'}
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200"
                  >
                    삭제하기
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Description */}
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-3">상세 설명</h2>
                  <div className="prose max-w-none">
                    <p className="text-gray-700 whitespace-pre-wrap">{recruitment.description}</p>
                  </div>
                </div>

                {/* Requirements */}
                {recruitment.requirements && (
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 mb-3">지원 조건</h2>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-gray-700 whitespace-pre-wrap">{recruitment.requirements}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1">
                {/* Recruiter Info */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 mb-6 border border-blue-200 dark:border-blue-700">
                  <h3 className="text-center text-sm font-medium text-gray-700 mb-4">모집자 정보</h3>
                  <div className="flex flex-col items-center space-y-4">
                    {/* Avatar */}
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 ring-4 ring-white shadow-lg">
                      {recruitment.recruiter_discord_avatar ? (
                        <img
                          src={getImageUrl(recruitment.recruiter_discord_avatar)}
                          alt={recruitment.recruiter_username}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary-500 text-white font-bold text-2xl">
                          {recruitment.recruiter_username?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Username */}
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900">{recruitment.recruiter_username}</p>
                      {recruitment.recruiter_uid && (
                        <Link
                          to={`/users/${recruitment.recruiter_uid}`}
                          className="text-sm text-primary-600 hover:text-primary-700 hover:underline mt-1 inline-block"
                        >
                          @{recruitment.recruiter_uid}
                        </Link>
                      )}
                      {recruitment.recruiter_discord_created_at && (
                        <p className="text-xs text-gray-500 mt-1">
                          디스코드 가입일: {new Date(recruitment.recruiter_discord_created_at).toLocaleDateString('ko-KR', {
                            timeZone: 'Asia/Seoul',
                            year: 'numeric',
                            month: 'long'
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Info Card */}
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-4">모집 정보</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">스쿼드 유형</p>
                      <p className="font-medium text-gray-900">{getSquadTypeLabel(recruitment.squad_type)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">서버</p>
                      <p className="font-medium text-gray-900">{recruitment.server_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">모집 인원</p>
                      <p className="font-medium text-gray-900">{recruitment.required_members}명</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">모집 상태</p>
                      <p className={`font-medium ${
                        recruitment.status === 'recruiting' ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {recruitment.status === 'recruiting' ? '모집중' : '모집마감'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SquadRecruitmentDetail;
