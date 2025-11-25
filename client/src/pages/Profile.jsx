import { useState, useEffect } from 'react';
import axios from '../utils/axios';
import { useAuth } from '../contexts/AuthContext';
import { getImageUrl } from '../utils/imageUrl';
import { getTrustScoreColor } from '../utils/trustScore';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userStats, setUserStats] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    bio: ''
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageTimestamp, setImageTimestamp] = useState(Date.now());

  // useEffect cleanup 추가 (메모리 누수 방지)
  useEffect(() => {
    let isMounted = true;

    if (user) {
      setFormData({
        username: user.username || '',
        bio: user.bio || ''
      });

      // 사용자 통계 가져오기
      const fetchStats = async () => {
        try {
          const response = await axios.get(`/reviews/user/${user.id}/stats`);
          if (isMounted) {
            setUserStats(response.data);
          }
        } catch (err) {
          if (isMounted) {
            console.error('Failed to fetch user stats:', err);
          }
        }
      };

      fetchStats();
    }

    return () => {
      isMounted = false;
    };
  }, [user]);

  const fetchUserStats = async () => {
    if (!user) return;
    try {
      const response = await axios.get(`/reviews/user/${user.id}/stats`);
      setUserStats(response.data);
    } catch (err) {
      console.error('Failed to fetch user stats:', err);
    }
  };


  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('이미지 크기는 5MB 이하여야 합니다');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('이미지 파일만 업로드 가능합니다');
        return;
      }

      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Upload image first if there's a new image
      let profileImage = user.profileImage;
      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);

        const uploadRes = await axios.post(
          '/auth/upload-profile-image',
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          }
        );
        profileImage = uploadRes.data.profileImage;
      }

      // Update profile
      const response = await axios.put(
        '/auth/profile',
        {
          username: formData.username,
          bio: formData.bio,
          profileImage: profileImage
        }
      );

      updateUser(response.data);
      setSuccess('프로필이 업데이트되었습니다');
      setIsEditing(false);
      setImageFile(null);
      setImagePreview(null);
      // Force image refresh
      setImageTimestamp(Date.now());
    } catch (err) {
      setError(err.response?.data?.error || '프로필 업데이트에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      username: user.username || '',
      bio: user.bio || ''
    });
    setImageFile(null);
    setImagePreview(null);
    setIsEditing(false);
    setError('');
    setSuccess('');
  };

  const handleDeleteImage = async () => {
    if (!window.confirm('프로필 이미지를 삭제하시겠습니까?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await axios.put('/auth/profile', {
        username: user.username,
        bio: user.bio,
        profileImage: null
      });
      updateUser(response.data);
      setSuccess('프로필 이미지가 삭제되었습니다');
      // Force image refresh
      setImageTimestamp(Date.now());
    } catch (err) {
      setError(err.response?.data?.error || '이미지 삭제에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const copyUidToClipboard = () => {
    navigator.clipboard.writeText(user.uid);
    setCopySuccess(true);
    setSuccess('UID가 클립보드에 복사되었습니다');
    setTimeout(() => {
      setCopySuccess(false);
      setSuccess('');
    }, 3000);
  };

  // 로딩 상태 - user가 없거나 필수 데이터가 없으면 로딩 표시
  if (!user || !user.username || !user.uid) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="card p-8">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 dark:border-primary-400 mb-4"></div>
            <p className="text-lg text-gray-600 dark:text-gray-300">프로필 로딩 중...</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">잠시만 기다려주세요</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-0 sm:px-4 pt-16 sm:pt-20 md:pt-24 pb-8 transition-colors duration-200">
      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-400 p-4 rounded-r-lg transition-colors duration-200">
          <p className="text-sm font-medium text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 dark:border-green-400 p-4 rounded-r-lg transition-colors duration-200">
          <p className="text-sm font-medium text-green-800 dark:text-green-300">{success}</p>
        </div>
      )}

      {isEditing ? (
        <div className="bg-white dark:bg-gray-800 rounded-none sm:rounded-xl border-y sm:border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
          <div className="flex items-start justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">프로필 수정</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Image */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 border-4 border-primary-500 dark:border-primary-400 transition-colors duration-200">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : user.profileImage ? (
                    <img
                      src={getImageUrl(user.profileImage, true)}
                      alt={user.username}
                      className="w-full h-full object-cover"
                      key={imageTimestamp}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary-100 dark:bg-primary-900/50 transition-colors duration-200">
                      <svg
                        className="w-16 h-16 text-primary-600 dark:text-primary-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <label className="btn-secondary cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  이미지 변경
                </label>
                {user.profileImage && (
                  <button
                    type="button"
                    onClick={handleDeleteImage}
                    className="btn-secondary text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 border-red-300 dark:border-red-700"
                    disabled={loading}
                  >
                    이미지 삭제
                  </button>
                )}
              </div>
            </div>

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                사용자 이름 *
              </label>
              <input
                id="username"
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="input-field"
                required
              />
            </div>

            {/* Bio */}
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                소개
              </label>
              <textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="input-field"
                rows="4"
                placeholder="자신을 소개해주세요..."
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {loading ? '저장 중...' : '저장'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                className="btn-secondary flex-1 disabled:opacity-50"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="space-y-6">
            {/* Profile Header Card */}
            <div className="relative bg-white dark:bg-gray-800 rounded-none sm:rounded-2xl shadow-xl border-y sm:border border-gray-100 dark:border-gray-700 transition-colors duration-200">
              {/* Header Background with Gradient */}
              <div className="relative h-32 bg-gradient-to-r from-primary-500 via-indigo-600 to-purple-600 dark:from-primary-600 dark:via-indigo-700 dark:to-purple-700 overflow-hidden transition-colors duration-200">
                {/* Decorative circles */}
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute -top-10 -left-10 w-40 h-40 bg-white rounded-full"></div>
                  <div className="absolute -bottom-10 -right-10 w-60 h-60 bg-white rounded-full"></div>
                </div>

                {/* Edit Button */}
                <button
                  onClick={() => setIsEditing(true)}
                  className="absolute top-4 right-4 px-4 py-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-800 border border-white/20 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  프로필 수정
                </button>
              </div>

              <div className="px-6 pb-6 pt-20">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                  {/* Profile Image */}
                  <div className="relative flex-shrink-0 -mt-20 sm:-mt-24 md:-mt-28">
                    {user.profileImage ? (
                      <img
                        src={getImageUrl(user.profileImage, true)}
                        alt={user.username}
                        className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-2xl border-4 border-white shadow-2xl object-cover relative z-10"
                        key={imageTimestamp}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextElementSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className={`w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-2xl border-4 border-white shadow-2xl bg-gradient-to-br from-primary-400 via-primary-500 to-primary-600 flex items-center justify-center relative z-10 ${user.profileImage ? 'hidden' : 'flex'}`}
                    >
                      <span className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">
                        {user.username?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    {/* Online indicator */}
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 border-4 border-white rounded-full shadow-lg z-20"></div>
                  </div>

                  {/* User Info */}
                  <div className="flex-1 text-center md:text-left">
                    <h2 className="text-2xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{user.username}</h2>

                    {/* UID with Copy Button */}
                    <div className="inline-flex items-center gap-2 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 px-4 py-2 rounded-xl mb-3 border border-gray-200 dark:border-gray-600 transition-colors duration-200">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">@{user.uid}</span>
                      <button
                        onClick={copyUidToClipboard}
                        className="p-1.5 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-all"
                        title="UID 복사"
                      >
                        {copySuccess ? (
                          <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                    </div>

                    {user.bio && (
                      <p className="text-gray-600 dark:text-gray-400 mb-4 italic text-sm">&ldquo;{user.bio}&rdquo;</p>
                    )}

                    <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                      <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 px-3 py-2 rounded-lg border border-blue-100 dark:border-blue-800 transition-colors duration-200">
                        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs font-medium text-blue-700 dark:text-blue-300">가입: {new Date(user.createdAt).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}</span>
                      </div>
                      {user.discordCreatedAt && (
                        <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-2 rounded-lg border border-indigo-100 dark:border-indigo-800 transition-colors duration-200">
                          <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                          </svg>
                          <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">Discord: {new Date(user.discordCreatedAt).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Trust Score Card */}
            {userStats && (
              <div className="bg-white dark:bg-gray-800 rounded-none sm:rounded-2xl shadow-xl border-y sm:border border-gray-100 dark:border-gray-700 p-6 overflow-hidden transition-colors duration-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
                    userStats.trust_score >= 70 ? 'bg-gradient-to-br from-green-400 to-emerald-600 dark:from-green-500 dark:to-emerald-700' :
                    userStats.trust_score >= 50 ? 'bg-gradient-to-br from-yellow-400 to-amber-600 dark:from-yellow-500 dark:to-amber-700' :
                    userStats.trust_score >= 30 ? 'bg-gradient-to-br from-orange-400 to-red-600 dark:from-orange-500 dark:to-red-700' :
                    'bg-gradient-to-br from-red-400 to-pink-600 dark:from-red-500 dark:to-pink-700'
                  }`}>
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">신뢰 점수</h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Main Score */}
                  <div className={`col-span-2 md:col-span-1 bg-gradient-to-br ${
                    userStats.trust_score >= 70 ? 'from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 border-green-200 dark:border-green-700' :
                    userStats.trust_score >= 50 ? 'from-yellow-50 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 border-yellow-200 dark:border-yellow-700' :
                    userStats.trust_score >= 30 ? 'from-orange-50 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 border-orange-200 dark:border-orange-700' :
                    'from-red-50 to-pink-100 dark:from-red-900/30 dark:to-pink-900/30 border-red-200 dark:border-red-700'
                  } p-6 rounded-2xl border-2 transform hover:scale-105 transition-all duration-200`}>
                    <div className="text-center">
                      <div className={`text-5xl font-bold mb-2 ${getTrustScoreColor(userStats.trust_score || 36.5)}`}>
                        {(userStats.trust_score || 36.5).toFixed(1)}°C
                      </div>
                      <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">전체 온도</div>
                    </div>
                  </div>

                  {/* Positive */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 p-5 rounded-2xl border-2 border-green-200 dark:border-green-700 transform hover:scale-105 transition-all duration-200">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                      </svg>
                      <div className="text-3xl font-bold text-green-600 dark:text-green-400">{userStats.positive_reviews || 0}</div>
                    </div>
                    <div className="text-xs font-semibold text-green-700 dark:text-green-300 text-center">긍정 평가</div>
                  </div>

                  {/* Neutral */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 p-5 rounded-2xl border-2 border-gray-200 dark:border-gray-600 transform hover:scale-105 transition-all duration-200">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-3xl font-bold text-gray-600 dark:text-gray-400">{userStats.neutral_reviews || 0}</div>
                    </div>
                    <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 text-center">중립 평가</div>
                  </div>

                  {/* Negative */}
                  <div className="bg-gradient-to-br from-red-50 to-pink-100 dark:from-red-900/30 dark:to-pink-900/30 p-5 rounded-2xl border-2 border-red-200 dark:border-red-700 transform hover:scale-105 transition-all duration-200">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                      </svg>
                      <div className="text-3xl font-bold text-red-600 dark:text-red-400">{userStats.negative_reviews || 0}</div>
                    </div>
                    <div className="text-xs font-semibold text-red-700 dark:text-red-300 text-center">부정 평가</div>
                  </div>
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  );
};

export default Profile;
