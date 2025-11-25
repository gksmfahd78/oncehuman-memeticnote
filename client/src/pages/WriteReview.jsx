import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from '../utils/axios';
import { useAuth } from '../contexts/AuthContext';

function WriteReview() {
  const { id: tradeId } = useParams();
  const [searchParams] = useSearchParams();
  const reviewedUserId = searchParams.get('userId');
  const navigate = useNavigate();
  const { user } = useAuth();

  const [trade, setTrade] = useState(null);
  const [reviewedUser, setReviewedUser] = useState(null);
  const [rating, setRating] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!reviewedUserId) {
        setError('후기를 작성할 사용자가 지정되지 않았습니다');
        setLoading(false);
        return;
      }

      try {
        // 거래 정보와 사용자 정보 가져오기
        const [tradeRes, userRes] = await Promise.all([
          axios.get(`/trades/${tradeId}`),
          axios.get(`/auth/users/${reviewedUserId}`)
        ]);

        setTrade(tradeRes.data);
        setReviewedUser(userRes.data);

        // 거래가 완료되지 않았으면 오류
        if (tradeRes.data.status !== 'completed') {
          setError('완료된 거래만 후기를 작성할 수 있습니다');
        }

        // 자기 자신에게 후기 작성 방지
        if (user && parseInt(reviewedUserId) === user.id) {
          setError('본인에게는 후기를 작성할 수 없습니다');
        }

        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError(err.response?.data?.error || '데이터를 불러오는데 실패했습니다');
        setLoading(false);
      }
    };

    fetchData();
  }, [tradeId, reviewedUserId, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!rating) {
      alert('평가를 선택해주세요');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await axios.post('/reviews', {
        tradeId: parseInt(tradeId),
        reviewedUserId: parseInt(reviewedUserId),
        rating,
        comment: comment.trim()
      });

      alert('후기가 작성되었습니다!');
      navigate(`/trades/${tradeId}`);
    } catch (err) {
      console.error('Failed to submit review:', err);
      setError(err.response?.data?.error || '후기 작성에 실패했습니다');
      setSubmitting(false);
    }
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

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate(`/trades/${tradeId}`)}
            className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            거래 상세로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-8">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">거래 후기 작성</h1>

        {/* 거래 정보 */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-700 mb-2">거래 정보</h3>
          <p className="text-gray-600 mb-1">{trade?.title}</p>
          <p className="text-sm text-gray-500">
            {reviewedUser?.username}님과의 거래
          </p>
        </div>

        {/* 후기 작성 폼 */}
        <form onSubmit={handleSubmit}>
          {/* 평가 선택 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              거래 평가 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setRating('positive')}
                className={`p-4 border-2 rounded-lg transition-all ${
                  rating === 'positive'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <div className="text-4xl mb-2">👍</div>
                <div className="font-semibold text-gray-700">좋아요</div>
                <div className="text-xs text-gray-500">+0.5°C</div>
              </button>

              <button
                type="button"
                onClick={() => setRating('neutral')}
                className={`p-4 border-2 rounded-lg transition-all ${
                  rating === 'neutral'
                    ? 'border-gray-500 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-4xl mb-2">😐</div>
                <div className="font-semibold text-gray-700">보통</div>
                <div className="text-xs text-gray-500">±0°C</div>
              </button>

              <button
                type="button"
                onClick={() => setRating('negative')}
                className={`p-4 border-2 rounded-lg transition-all ${
                  rating === 'negative'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-red-300'
                }`}
              >
                <div className="text-4xl mb-2">👎</div>
                <div className="font-semibold text-gray-700">별로</div>
                <div className="text-xs text-gray-500">-1.0°C</div>
              </button>
            </div>
          </div>

          {/* 코멘트 입력 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              후기 내용 (선택사항)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="거래 경험을 자세히 작성해주세요"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              rows="5"
              maxLength="500"
            />
            <div className="text-right text-sm text-gray-500 mt-1">
              {comment.length}/500
            </div>
          </div>

          {/* 제출 버튼 */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate(`/trades/${tradeId}`)}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={submitting}
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={submitting || !rating}
            >
              {submitting ? '제출 중...' : '후기 제출'}
            </button>
          </div>
        </form>

        {/* 안내 메시지 */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            💡 후기는 신뢰도 점수에 영향을 미치며, 한 번 작성하면 수정할 수 없습니다.
            신중하게 작성해주세요.
          </p>
        </div>
      </div>
    </div>
  );
}

export default WriteReview;
