import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from '../utils/axios';
import { useAuth } from '../contexts/AuthContext';
import Toast from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import ChatBox from '../components/ChatBox';
import { getImageUrl } from '../utils/imageUrl';
import { getTradeTypeLabel, getStatusLabel, getStatusColor } from '../utils/tradeUtils';
import { getTrustScoreColor, getTrustScoreEmoji } from '../utils/trustScore';

const TradeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trade, setTrade] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sellerStats, setSellerStats] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [tradeRequests, setTradeRequests] = useState([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [showChat, setShowChat] = useState(false);

  // 채팅 모달이 열리면 페이지 스크롤 방지
  useEffect(() => {
    if (showChat) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showChat]);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  const showConfirm = useCallback((message, onConfirm, options = {}) => {
    return new Promise((resolve) => {
      setConfirmModal({
        message,
        onConfirm: () => {
          setConfirmModal(null);
          resolve(true);
          onConfirm?.();
        },
        onCancel: () => {
          setConfirmModal(null);
          resolve(false);
        },
        ...options
      });
    });
  }, []);

  const fetchSellerStats = useCallback(async (sellerId) => {
    try {
      const response = await axios.get(`/reviews/user/${sellerId}/stats`);
      setSellerStats(response.data);
    } catch (err) {
      console.error('Failed to fetch seller stats:', err);
    }
  }, []);

  const fetchTrade = useCallback(async () => {
    try {
      setLoading(true);
      const tradeRes = await axios.get(`/trades/${id}`);
      setTrade(tradeRes.data);

      // 판매자 통계와 거래 요청 병렬 호출 (성능 향상)
      const promises = [];
      if (tradeRes.data.seller_id) {
        promises.push(axios.get(`/reviews/user/${tradeRes.data.seller_id}/stats`));
      }
      if (user && tradeRes.data.user_id === user.id) {
        promises.push(axios.get(`/trades/${id}/requests`));
      }

      if (promises.length > 0) {
        const results = await Promise.all(promises);
        if (tradeRes.data.seller_id) {
          setSellerStats(results[0].data);
        }
        if (user && tradeRes.data.user_id === user.id && results.length > (tradeRes.data.seller_id ? 1 : 0)) {
          setTradeRequests(results[results.length - 1].data);
        }
      }
    } catch (err) {
      console.error('Fetch trade error:', err);
      setError('거래를 불러오는 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  const fetchTradeRequests = useCallback(async () => {
    if (!user || !trade || trade.user_id !== user.id) return;

    try {
      const response = await axios.get(`/trades/${id}/requests`);
      setTradeRequests(response.data);
    } catch (err) {
      console.error('Failed to fetch trade requests:', err);
    }
  }, [user, trade, id]);

  useEffect(() => {
    fetchTrade();
  }, [fetchTrade]);

  useEffect(() => {
    if (trade && user && trade.user_id === user.id) {
      fetchTradeRequests();
    }
  }, [trade, user, fetchTradeRequests]);

  const handleSendRequest = async () => {
    if (!user) {
      showToast('로그인이 필요합니다', 'warning');
      return;
    }

    try {
      setActionLoading(true);
      await axios.post(`/trades/${id}/request`, { message: requestMessage });
      showToast('거래 요청이 전송되었습니다! 판매자의 승인을 기다려주세요.', 'success');
      setShowRequestModal(false);
      setRequestMessage('');
      fetchTrade();
    } catch (err) {
      showToast(err.response?.data?.error || '거래 요청에 실패했습니다', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    showConfirm('이 구매자를 선택하시겠습니까?', async () => {
      try {
        setActionLoading(true);
        const response = await axios.post(`/trades/${id}/requests/${requestId}/accept`);
        setTrade(response.data);
        fetchTradeRequests();
        showToast('구매자가 확정되었습니다!', 'success');
      } catch (err) {
        showToast(err.response?.data?.error || '요청 수락에 실패했습니다', 'error');
      } finally {
        setActionLoading(false);
      }
    }, { type: 'success' });
  };

  const handleRejectRequest = async (requestId) => {
    showConfirm('이 요청을 거절하시겠습니까?', async () => {
      try {
        await axios.post(`/trades/${id}/requests/${requestId}/reject`);
        fetchTradeRequests();
        showToast('요청이 거절되었습니다', 'success');
      } catch (err) {
        showToast(err.response?.data?.error || '요청 거절에 실패했습니다', 'error');
      }
    }, { type: 'warning' });
  };

  const handleChangeBuyer = async () => {
    showConfirm(
      '구매자를 변경하시겠습니까?\n현재 구매자와의 거래 확인 내역이 모두 초기화됩니다.',
      async () => {
        try {
          setActionLoading(true);
          const response = await axios.post(`/trades/${id}/change-buyer`);
          setTrade(response.data);
          fetchTradeRequests();
          showToast('구매자가 변경되었습니다. 다시 요청 목록에서 선택해주세요.', 'success');
        } catch (err) {
          showToast(err.response?.data?.error || '구매자 변경에 실패했습니다', 'error');
        } finally {
          setActionLoading(false);
        }
      },
      { type: 'warning' }
    );
  };

  const handleConfirmTrade = async () => {
    const isSeller = user && trade.user_id === user.id;
    const isBuyer = user && trade.buyer_id === user.id;

    let confirmMessage = '거래가 완료되었습니까?';
    if (isSeller && !trade.buyer_confirmed) {
      confirmMessage = '거래 완료를 확인하시겠습니까?\n구매자도 확인해야 최종 완료됩니다.';
    } else if (isBuyer && !trade.seller_confirmed) {
      confirmMessage = '거래 완료를 확인하시겠습니까?\n판매자도 확인해야 최종 완료됩니다.';
    }

    showConfirm(confirmMessage, async () => {
      try {
        setActionLoading(true);
        const response = await axios.post(`/trades/${id}/confirm`);
        setTrade(response.data);

        if (response.data.status === 'completed') {
          showToast('거래가 최종 완료되었습니다! 후기를 작성해주세요.', 'success');

          // 1초 후 후기 작성 페이지로 이동
          setTimeout(() => {
            const otherUserId = isSeller ? trade.buyer_id : trade.user_id;
            navigate(`/trades/${id}/review?userId=${otherUserId}`);
          }, 1500);
        } else {
          showToast('거래 완료 확인이 등록되었습니다. 상대방의 확인을 기다려주세요.', 'info');
          fetchTrade(); // 최신 정보 새로고침
        }
      } catch (err) {
        showToast(err.response?.data?.error || '거래 완료 처리에 실패했습니다', 'error');
      } finally {
        setActionLoading(false);
      }
    }, { type: 'success' });
  };

  const handleStatusChange = async (newStatus) => {
    const statusLabel = getStatusLabel(newStatus);
    showConfirm(
      `거래 상태를 "${statusLabel}"(으)로 변경하시겠습니까?`,
      async () => {
        try {
          const response = await axios.put(`/trades/${id}`, {
            status: newStatus
          });
          setTrade(response.data);
          showToast('거래 상태가 변경되었습니다', 'success');
        } catch (err) {
          showToast(err.response?.data?.error || '상태 변경에 실패했습니다', 'error');
        }
      },
      { type: newStatus === 'cancelled' ? 'danger' : 'info' }
    );
  };



  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error || !trade) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
          <p className="text-sm font-medium text-red-800">{error || '거래를 찾을 수 없습니다'}</p>
        </div>
        <Link to="/trades" className="btn-secondary mt-4 inline-block">
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const isOwner = user && user.id === trade.user_id;
  const isBuyer = user && trade.buyer_id === user.id;
  const canRequest = user && !isOwner && !trade.buyer_id && trade.status === 'active';
  const canConfirm = (isOwner || isBuyer) && trade.buyer_id && trade.status === 'active';
  const hasRequested = tradeRequests.some(r => r.requester_id === user?.id && r.status === 'pending');

  // 현재 사용자가 이미 확인했는지 체크
  const hasConfirmed = (isOwner && trade.seller_confirmed) || (isBuyer && trade.buyer_confirmed);
  const waitingForOther = hasConfirmed && trade.status !== 'completed';


  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto py-4 md:py-8 px-4">
        {/* Back Button */}
        <Link to="/trades" className="inline-flex items-center text-gray-600 hover:text-primary-600 mb-6 font-medium transition-colors">
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          목록으로 돌아가기
        </Link>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header Section */}
          <div className={`border-b ${
            trade.status === 'active' ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-100 dark:border-green-700' :
            trade.status === 'completed' ? 'bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-700 dark:to-gray-600 border-gray-100 dark:border-gray-600' :
            'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-red-100 dark:border-red-700'
          }`}>
            <div className="p-6">
              {/* Title Area */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className={`text-xs px-3 py-1.5 rounded-full font-semibold border ${getStatusColor(trade.status)}`}>
                  {getStatusLabel(trade.status)}
                </span>
                <span className={`text-xs px-3 py-1.5 rounded-full font-semibold border ${
                  trade.listing_type === 'buy'
                    ? 'bg-orange-100 text-orange-700 border-orange-200'
                    : 'bg-green-100 text-green-700 border-green-200'
                }`}>
                  {trade.listing_type === 'buy' ? '구매' : '판매'}
                </span>
                <span className={`text-xs px-3 py-1.5 rounded-full font-semibold border ${
                  trade.trade_type === 'eternalland'
                    ? 'bg-purple-100 text-purple-700 border-purple-200'
                    : 'bg-blue-100 text-blue-700 border-blue-200'
                }`}>
                  {getTradeTypeLabel(trade.trade_type)}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{trade.item_name}</h1>
              <h2 className="text-lg md:text-xl text-gray-700 mb-4">{trade.title}</h2>

              {/* Action Buttons */}
              {isOwner && (
                <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
                  {trade.status === 'active' && (
                    <button
                      onClick={() => handleStatusChange('cancelled')}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-all"
                    >
                      거래 취소
                    </button>
                  )}
                  {trade.status === 'cancelled' && (
                    <button
                      onClick={() => handleStatusChange('active')}
                      className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-all"
                    >
                      거래중으로 변경
                    </button>
                  )}
                  <Link
                    to={`/trades/${id}/edit`}
                    className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-300 transition-all flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    수정
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Content Section */}
          <div className="p-6">
            {/* Price */}
            {trade.price && (
              <div className="mb-6 p-4 bg-primary-50 rounded-lg border border-primary-100">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-sm font-semibold text-gray-700">가격</h3>
                </div>
                <p className="text-2xl font-bold text-primary-600">{trade.price}</p>
              </div>
            )}

        {/* Description */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">상세 설명</h3>
          <p className="text-gray-800 whitespace-pre-wrap">{trade.description}</p>
        </div>

        {/* Server Info */}
        {trade.trade_type === 'server' && trade.server_name && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">거래 서버</h3>
            <p className="text-gray-800">{trade.server_name}</p>
          </div>
        )}

        {/* Seller Info */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 mb-6 border border-blue-200 dark:border-blue-700">
          <h3 className="text-center text-sm font-medium text-gray-700 mb-4">판매자 정보</h3>
          <div className="flex flex-col items-center space-y-4">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 ring-4 ring-white shadow-lg">
              {trade.seller_discord_avatar ? (
                <img
                  src={getImageUrl(trade.seller_discord_avatar)}
                  alt={trade.seller_username}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary-500 text-white font-bold text-2xl">
                  {trade.seller_username?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Username */}
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">{trade.seller_username}</p>
              {trade.seller_uid && (
                <Link
                  to={`/users/${trade.seller_uid}`}
                  className="text-sm text-primary-600 hover:text-primary-700 hover:underline mt-1 inline-block"
                >
                  @{trade.seller_uid}
                </Link>
              )}
              {trade.seller_discord_created_at && (
                <p className="text-xs text-gray-500 mt-1">
                  디스코드 가입일: {new Date(trade.seller_discord_created_at).toLocaleDateString('ko-KR', {
                    timeZone: 'Asia/Seoul',
                    year: 'numeric',
                    month: 'long'
                  })}
                </p>
              )}
            </div>

            {/* Trust Score */}
            {sellerStats && (
              <div className="flex items-center gap-2 md:gap-4 bg-white px-3 md:px-4 py-2 rounded-lg border border-blue-200 shadow-sm overflow-hidden">
                <div className="text-center flex-shrink-0 min-w-0">
                  <div className="flex items-center gap-0.5 md:gap-1 justify-center">
                    <span className="text-base md:text-2xl leading-none">{getTrustScoreEmoji(sellerStats.trust_score || 36.5)}</span>
                    <span className={`text-base md:text-2xl font-bold ${getTrustScoreColor(sellerStats.trust_score || 36.5)} leading-none`}>
                      {(sellerStats.trust_score || 36.5).toFixed(1)}°C
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 whitespace-nowrap">거래온도</p>
                </div>
                <div className="h-8 md:h-10 w-px bg-blue-200 flex-shrink-0"></div>
                <div className="text-center flex-shrink-0 min-w-0">
                  <p className="text-base md:text-lg font-bold text-gray-800 leading-none">{sellerStats.completed_trades_count || 0}</p>
                  <p className="text-xs text-gray-600 mt-1 whitespace-nowrap">완료거래</p>
                </div>
                <div className="h-8 md:h-10 w-px bg-blue-200 flex-shrink-0"></div>
                <div className="text-center flex-shrink-0 min-w-0">
                  <div className="flex gap-1.5 md:gap-2 justify-center">
                    <span className="text-xs text-green-600 leading-none">👍{sellerStats.positive_reviews || 0}</span>
                    <span className="text-xs text-gray-500 leading-none">😐{sellerStats.neutral_reviews || 0}</span>
                    <span className="text-xs text-red-600 leading-none">👎{sellerStats.negative_reviews || 0}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 whitespace-nowrap">받은후기</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="w-full space-y-2">
              {canRequest && !hasRequested && (
                <button
                  onClick={() => setShowRequestModal(true)}
                  className="w-full px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-lg shadow-md transition-all duration-200 hover:shadow-lg"
                >
                  거래 요청하기
                </button>
              )}

              {canRequest && hasRequested && (
                <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 font-medium">✓ 거래 요청 전송됨</p>
                  <p className="text-xs text-blue-600 mt-1">판매자의 승인을 기다려주세요</p>
                </div>
              )}

              {/* 거래 완료 확인 섹션 */}
              {canConfirm && !hasConfirmed && (
                <div className="space-y-2">
                  <button
                    onClick={handleConfirmTrade}
                    disabled={actionLoading}
                    className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-md transition-all duration-200 hover:shadow-lg disabled:opacity-50"
                  >
                    {actionLoading ? '처리 중...' : '거래 완료 확인'}
                  </button>
                  {/* 상대방 확인 상태 표시 */}
                  {isOwner && trade.buyer_confirmed && (
                    <div className="text-center p-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-700">✓ 구매자가 거래 완료를 확인했습니다</p>
                    </div>
                  )}
                  {isBuyer && trade.seller_confirmed && (
                    <div className="text-center p-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-700">✓ 판매자가 거래 완료를 확인했습니다</p>
                    </div>
                  )}
                </div>
              )}

              {/* 내가 확인했지만 상대방을 기다리는 중 */}
              {waitingForOther && (
                <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 font-medium">✓ 거래 완료 확인 완료</p>
                  <p className="text-xs text-yellow-600 mt-1">
                    {isOwner ? '구매자의 확인을 기다리는 중입니다...' : '판매자의 확인을 기다리는 중입니다...'}
                  </p>
                </div>
              )}

              {/* 양쪽 모두 확인하여 거래 완료 */}
              {trade.status === 'completed' && (isOwner || isBuyer) && (
                <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800 font-medium">✓ 거래가 완료되었습니다</p>
                  <p className="text-xs text-green-600 mt-1">후기를 작성해주세요!</p>
                </div>
              )}

              {/* Chat Button - Show for all logged in users except owner */}
              {user && !isOwner && trade.status === 'active' && (
                <button
                  onClick={() => setShowChat(true)}
                  className="w-full inline-flex items-center justify-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-md transition-all duration-200 hover:shadow-lg"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  판매자에게 메시지 보내기
                </button>
              )}
            </div>

            {trade.buyer_id && !isBuyer && !isOwner && (
              <div className="text-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg w-full">
                <p className="text-sm text-yellow-800 font-medium">⚠️ 이미 다른 구매자가 참여한 거래입니다</p>
              </div>
            )}
          </div>
        </div>

            {/* Date Info */}
            <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">
              <p>등록일: {new Date(trade.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</p>
              {trade.updated_at !== trade.created_at && (
                <p>수정일: {new Date(trade.updated_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</p>
              )}
            </div>
          </div>
        </div>

        {/* 구매자가 확정된 경우 (판매자만 보임) */}
      {isOwner && trade.buyer_id && trade.status !== 'completed' && (
        <div className="card p-6 mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">확정된 구매자</h3>
            <button
              onClick={handleChangeBuyer}
              disabled={actionLoading}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50"
            >
              구매자 변경
            </button>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-sm text-blue-700 mb-2">
              ✓ 구매자가 확정되었습니다. 거래를 진행해주세요.
            </p>
            <p className="text-xs text-blue-600">
              * 구매자를 변경하면 거래 확인 내역이 초기화되고 다시 요청 목록에서 선택할 수 있습니다.
            </p>
          </div>
        </div>
      )}

      {/* Trade Requests (판매자만 보임) */}
      {isOwner && tradeRequests.length > 0 && !trade.buyer_id && (
        <div className="card p-6 mt-6">
          <h3 className="text-xl font-bold mb-4">거래 요청 목록 ({tradeRequests.filter(r => r.status === 'pending').length})</h3>
          <div className="space-y-4">
            {tradeRequests.filter(r => r.status === 'pending').map((request) => (
              <div key={request.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200">
                      {request.requester_avatar ? (
                        <img
                          src={getImageUrl(request.requester_avatar)}
                          alt={request.requester_username}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary-500 text-white font-bold">
                          {request.requester_username?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">{request.requester_username}</p>
                      {request.stats && (
                        <div className="flex items-center gap-3 mt-1 text-xs">
                          <span className={`font-bold ${getTrustScoreColor(request.stats.trust_score || 36.5)}`}>
                            {getTrustScoreEmoji(request.stats.trust_score || 36.5)} {(request.stats.trust_score || 36.5).toFixed(1)}°C
                          </span>
                          <span className="text-gray-600">거래 {request.stats.completed_trades_count || 0}회</span>
                          <span className="text-green-600">👍{request.stats.positive_reviews || 0}</span>
                          <span className="text-red-600">👎{request.stats.negative_reviews || 0}</span>
                        </div>
                      )}
                      {request.message && (
                        <p className="text-sm text-gray-700 mt-2 bg-white p-2 rounded border border-gray-200">{request.message}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">{new Date(request.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleAcceptRequest(request.id)}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50"
                    >
                      수락
                    </button>
                    <button
                      onClick={() => handleRejectRequest(request.id)}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-all"
                    >
                      거절
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">거래 요청</h3>
            <p className="text-sm text-gray-600 mb-4">판매자에게 전달할 메시지를 작성해주세요 (선택사항)</p>
            <textarea
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows="4"
              placeholder="예: 거래 가능한 시간대를 알려주세요!"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSendRequest}
                disabled={actionLoading}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                {actionLoading ? '전송 중...' : '요청 전송'}
              </button>
              <button
                onClick={() => {
                  setShowRequestModal(false);
                  setRequestMessage('');
                }}
                className="flex-1 btn-secondary"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={confirmModal.onCancel}
          confirmText={confirmModal.confirmText}
          cancelText={confirmModal.cancelText}
          type={confirmModal.type}
        />
      )}

      {/* Chat Modal */}
      {showChat && trade && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          style={{ overflow: 'hidden' }}
          onClick={(e) => {
            // 배경 클릭 시 닫기 (ChatBox 내부 클릭은 무시)
            if (e.target === e.currentTarget) {
              setShowChat(false);
              fetchTrade();
            }
          }}
        >
          <div
            className="w-full max-w-2xl"
            style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            <ChatBox
              tradeId={trade.id}
              tradeTitle={trade.title}
              tradeStatus={trade.status}
              sellerId={trade.seller_id}
              sellerUsername={user?.id === trade.user_id ? (trade.buyer_username || '구매자') : trade.seller_username}
              otherUserId={user?.id === trade.user_id ? trade.buyer_id : trade.seller_id}
              currentUserId={user?.id}
              myRole={user?.id === trade.user_id ? 'seller' : 'buyer'}
              buyerId={trade.buyer_id}
              onClose={() => {
                setShowChat(false);
                fetchTrade(); // Refresh trade data after closing chat
              }}
            />
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default TradeDetail;
