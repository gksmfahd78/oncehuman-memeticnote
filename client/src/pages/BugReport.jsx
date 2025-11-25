import { useState } from 'react';
import axios from '../utils/axios';
import { useAuth } from '../contexts/AuthContext';

const BugReport = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    type: 'bug',
    title: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');
    setError('');

    try {
      await axios.post('/bug-reports', formData);
      setSuccess('제보해주셔서 감사합니다! 관리자가 확인 후 채팅으로 답변드리겠습니다.');
      setFormData({
        type: 'bug',
        title: '',
        description: ''
      });
    } catch (err) {
      setError(err.response?.data?.error || '제보 전송에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Require login to submit bug reports
  if (!user) {
    return (
      <div className="min-h-[calc(100vh-4rem)] py-8 px-4 sm:px-6 lg:px-8 animate-fade-in">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-gray-900 dark:text-gray-100 mb-3">
              버그 제보 및 문의
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              버그를 발견하셨거나 문의사항이 있으신가요? 알려주시면 빠르게 확인하고 개선하겠습니다.
            </p>
          </div>

          {/* Login Required Message */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center transition-colors duration-200">
            <svg className="w-16 h-16 text-primary-600 dark:text-primary-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">로그인이 필요합니다</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              버그 제보 및 문의는 로그인한 사용자만 이용할 수 있습니다.<br />
              관리자가 채팅을 통해 답변을 드리기 위해 로그인이 필요합니다.
            </p>
            <a
              href="/login"
              className="inline-block px-6 py-3 bg-primary-600 dark:bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors"
            >
              로그인하기
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] py-8 px-4 sm:px-6 lg:px-8 animate-fade-in">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-gray-900 dark:text-gray-100 mb-3">
            버그 제보 및 문의
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            버그를 발견하셨거나 문의사항이 있으신가요? 알려주시면 빠르게 확인하고 개선하겠습니다.
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg transition-colors duration-200">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="ml-3 text-sm text-green-700 dark:text-green-300">{success}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg transition-colors duration-200">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="ml-3 text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sm:p-8 transition-colors duration-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Type Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                유형 <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'bug' })}
                  className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
                    formData.type === 'bug'
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-2 border-red-300 dark:border-red-600'
                      : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  🐛 버그
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'feature' })}
                  className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
                    formData.type === 'feature'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-2 border-blue-300 dark:border-blue-600'
                      : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  💡 기능 제안
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'question' })}
                  className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
                    formData.type === 'question'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-2 border-green-300 dark:border-green-600'
                      : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  ❓ 문의
                </button>
              </div>
            </div>

            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                제목 <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-primary-500 dark:focus:border-primary-400 transition-all"
                placeholder="간단하게 요약해주세요"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                상세 내용 <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={8}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-primary-500 dark:focus:border-primary-400 transition-all resize-none"
                placeholder={
                  formData.type === 'bug'
                    ? '- 어떤 상황에서 발생했나요?\n- 어떤 동작을 했나요?\n- 예상 결과와 실제 결과가 어떻게 다른가요?\n- 스크린샷이 있다면 설명에 포함해주세요'
                    : formData.type === 'feature'
                    ? '- 어떤 기능이 필요한가요?\n- 왜 필요한가요?\n- 어떻게 동작하면 좋을까요?'
                    : '궁금하신 점을 자세히 적어주세요'
                }
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-primary-600 dark:bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    전송 중...
                  </span>
                ) : (
                  '제보하기'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Info Box */}
        <div className="mt-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-xl shadow-sm transition-colors duration-200">
          {/* Title with icon */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-500 dark:bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <h4 className="font-bold text-blue-900 dark:text-blue-100 text-base">제보 시 유의사항</h4>
          </div>

          {/* List */}
          <ul className="space-y-2.5 pl-13">
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full mt-2 flex-shrink-0"></span>
              <span className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">제보해주신 내용은 서비스 개선을 위해 사용됩니다</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full mt-2 flex-shrink-0"></span>
              <span className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">로그인한 경우 관리자가 채팅으로 답변을 드립니다</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full mt-2 flex-shrink-0"></span>
              <span className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">긴급한 문제는 제목에 [긴급]을 표시해주세요</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BugReport;
