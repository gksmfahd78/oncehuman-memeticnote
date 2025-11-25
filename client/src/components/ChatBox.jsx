import { useState, useEffect, useRef, memo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from '../utils/axios';
import Toast from './Toast';
import ConfirmModal from './ConfirmModal';
import './ChatBox.css';

const ChatBox = memo(function ChatBox({ tradeId, tradeTitle, tradeStatus: initialTradeStatus, sellerId, sellerUsername, otherUserId, currentUserId, myRole, buyerId: initialBuyerId, onClose, isTelegramStyle = false, otherUserUid }) {
  const receiverId = otherUserId || sellerId;
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [tradeStatus, setTradeStatus] = useState(initialTradeStatus);
  const [buyerId, setBuyerId] = useState(initialBuyerId);
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [reportModal, setReportModal] = useState(null);
  const [hasReviewed, setHasReviewed] = useState(false);
  const messagesContainerRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const previousTradeStatusRef = useRef(initialTradeStatus);
  const reviewCheckDoneRef = useRef(false);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  const showConfirm = useCallback((message, onConfirm, options = {}) => {
    return new Promise((resolve) => {
      setConfirmModal({
        message,
        onConfirm: () => {
          onConfirm();
          setConfirmModal(null);
          resolve(true);
        },
        onCancel: () => {
          setConfirmModal(null);
          resolve(false);
        },
        ...options
      });
    });
  }, []);

  const scrollToBottom = () => {
    // 메시지 컨테이너만 스크롤 (페이지 전체 스크롤 방지)
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  const checkReviewStatus = useCallback(async () => {
    try {
      const response = await axios.get(`/reviews/check/${tradeId}`);
      const reviewed = response.data.hasReviewed;

      // 후기 상태 업데이트 (한 번 true가 되면 다시 false로 바뀌지 않도록)
      setHasReviewed(prev => {
        // 이미 true면 그대로 유지
        if (prev) return true;
        // false였는데 reviewed가 true면 업데이트
        return reviewed;
      });

      // 후기 작성 완료하면 더 이상 체크하지 않음
      if (reviewed) {
        reviewCheckDoneRef.current = true;
      }
    } catch (err) {
      console.error('Failed to check review status:', err);
    }
  }, [tradeId]);

  const loadMessages = async () => {
    try {
      const url = otherUserId
        ? `/chat/trade/${tradeId}/user/${otherUserId}`
        : `/chat/trade/${tradeId}`;

      const response = await axios.get(url);
      setMessages(response.data.messages);

      // Update trade info if available
      if (response.data.trade) {
        const newStatus = response.data.trade.status;

        setTradeStatus(newStatus);
        setBuyerId(response.data.trade.buyer_id);

        // Check review status when completed
        // Keep checking until user has written a review
        if (newStatus === 'completed' && !reviewCheckDoneRef.current) {
          checkReviewStatus();
        }

        // Update ref with new status
        previousTradeStatusRef.current = newStatus;
      }

      setLoading(false);
      scrollToBottom();
    } catch (err) {
      console.error('Failed to load messages:', err);
      setError(err.response?.data?.error || '메시지를 불러오는데 실패했습니다');
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim()) return;

    setSending(true);
    setError(null);

    try {
      const response = await axios.post(
        `/chat/trade/${tradeId}/message`,
        {
          message: newMessage,
          receiverId: receiverId
        }
      );

      if (response.data.filtered) {
        showToast(`메시지가 필터링되었습니다. 사유: ${response.data.reasons.join(', ')}. 전화번호, 이메일, 계좌번호 등의 개인정보 공유는 금지됩니다.`, 'warning');
      }

      setMessages([...messages, response.data.message]);
      setNewMessage('');
      scrollToBottom();
    } catch (err) {
      console.error('Failed to send message:', err);
      if (err.response?.data?.code === 'SPAM_DETECTED') {
        setError('동일한 메시지를 반복해서 보낼 수 없습니다');
      } else {
        setError(err.response?.data?.error || '메시지 전송에 실패했습니다');
      }
    } finally {
      setSending(false);
    }
  };

  const reportMessage = (messageId) => {
    setReportModal({
      messageId,
      reportType: '',
      description: '',
      onSubmit: async (reportType, description) => {
        try {
          await axios.post(
            `/chat/report`,
            {
              messageId,
              reportType,
              description
            }
          );

          showToast('신고가 접수되었습니다. 관리자가 검토할 예정입니다.', 'success');
          setReportModal(null);
        } catch (err) {
          showToast(err.response?.data?.error || '신고 처리에 실패했습니다', 'error');
        }
      },
      onCancel: () => setReportModal(null)
    });
  };

  const blockUser = async () => {
    showConfirm(
      '이 사용자를 차단하시겠습니까?\n차단하면 서로 메시지를 주고받을 수 없습니다.',
      async () => {
        try {
          await axios.post(
            `/chat/block`,
            { blockedId: receiverId }
          );

          showToast('사용자를 차단했습니다', 'success');
          onClose();
        } catch (err) {
          showToast(err.response?.data?.error || '차단에 실패했습니다', 'error');
        }
      },
      { type: 'danger' }
    );
  };

  // 거래 예약 (판매자가 구매자 선택)
  const selectBuyer = async () => {
    showConfirm(
      '이 사용자를 구매자로 예약하시겠습니까?',
      async () => {
        try {
          await axios.post(`/trades/${tradeId}/select-buyer/${otherUserId}`);
          showToast('거래가 예약되었습니다!', 'success');
          loadMessages();
          onClose();
        } catch (err) {
          showToast(err.response?.data?.error || '거래 예약에 실패했습니다', 'error');
        }
      },
      { type: 'info' }
    );
  };

  // 구매자 변경
  const changeBuyer = async () => {
    showConfirm(
      '구매자를 변경하시겠습니까?\n현재 구매자와의 거래 확인 내역이 모두 초기화됩니다.',
      async () => {
        try {
          await axios.post(`/trades/${tradeId}/change-buyer`);
          showToast('구매자가 변경되었습니다. 다른 사용자를 선택해주세요.', 'info');
          loadMessages();
          onClose();
        } catch (err) {
          showToast(err.response?.data?.error || '구매자 변경에 실패했습니다', 'error');
        }
      },
      { type: 'warning' }
    );
  };

  // 거래 취소
  const cancelTrade = async () => {
    showConfirm(
      '거래를 취소하시겠습니까?\n이 작업은 되돌릴 수 없습니다.',
      async () => {
        try {
          await axios.put(`/trades/${tradeId}`, { status: 'cancelled' });
          showToast('거래가 취소되었습니다.', 'info');
          setTradeStatus('cancelled');
          loadMessages();
        } catch (err) {
          showToast(err.response?.data?.error || '거래 취소에 실패했습니다', 'error');
        }
      },
      { type: 'danger' }
    );
  };

  const completeTrade = async () => {
    showConfirm(
      '거래 완료를 확인하시겠습니까?\n양측이 모두 확인하면 거래가 최종 완료됩니다.',
      async () => {
        try {
          const response = await axios.post(`/trades/${tradeId}/confirm`);

          if (response.data.status === 'completed') {
            showToast('거래가 최종 완료되었습니다! 후기를 작성해주세요.', 'success');
            setTradeStatus('completed');
            // 후기 작성 여부 확인
            checkReviewStatus();
          } else {
            showToast('거래 완료 확인이 등록되었습니다.\n상대방도 확인하면 거래가 최종 완료됩니다.', 'info');
            setTradeStatus('active');
          }
        } catch (err) {
          showToast(err.response?.data?.error || '거래 완료 처리에 실패했습니다', 'error');
        }
      },
      { type: 'success' }
    );
  };

  useEffect(() => {
    loadMessages();

    // 초기 로드 시 거래 상태가 완료면 후기 상태 확인
    if (initialTradeStatus === 'completed') {
      checkReviewStatus();
    }

    pollingIntervalRef.current = setInterval(() => {
      loadMessages();
    }, 3000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [tradeId, initialTradeStatus, checkReviewStatus]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (loading) {
    return (
      <div className={`${isTelegramStyle ? "telegram-chat-box" : "chat-box"} dark:bg-gray-800 transition-colors duration-200`}>
        <div className={`${isTelegramStyle ? "telegram-chat-header dark:bg-gray-800 dark:border-gray-700" : "chat-header"} transition-colors duration-200`}>
          {isTelegramStyle && (
            <button onClick={onClose} className="telegram-back-btn dark:text-primary-400 dark:hover:bg-gray-700 transition-colors duration-200">
              ←
            </button>
          )}
          <h3 className="dark:text-gray-100">{sellerUsername}님과의 채팅</h3>
          {!isTelegramStyle && (
            <button onClick={onClose} className="close-btn dark:text-gray-300 dark:hover:text-gray-100">×</button>
          )}
        </div>
        <div className="chat-loading dark:text-gray-400 dark:bg-gray-900 transition-colors duration-200">메시지를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className={`${isTelegramStyle ? "telegram-chat-box" : "chat-box"} dark:bg-gray-800 transition-colors duration-200`}>
      {/* Header */}
      <div className={`${isTelegramStyle ? "telegram-chat-header dark:bg-gray-800 dark:border-gray-700" : "chat-header"} transition-colors duration-200`}>
        {isTelegramStyle && (
          <button onClick={onClose} className="telegram-back-btn md:hidden dark:text-primary-400 dark:hover:bg-gray-700 transition-colors duration-200">
            ←
          </button>
        )}

        <div className="chat-header-content">
          <div className="flex items-center gap-3">
            {otherUserUid ? (
              <Link
                to={`/users/${otherUserUid}`}
                className="chat-header-title hover:text-primary-600 dark:hover:text-primary-400 dark:text-gray-100 transition-colors duration-200"
              >
                {sellerUsername}님과의 채팅
              </Link>
            ) : (
              <h3 className="chat-header-title dark:text-gray-100">{sellerUsername}님과의 채팅</h3>
            )}
            {tradeStatus && (
              <span className={`chat-status-badge chat-status-${tradeStatus} transition-colors duration-200`}>
                {tradeStatus === 'active' && '거래중'}
                {tradeStatus === 'completed' && '완료'}
                {tradeStatus === 'cancelled' && '취소'}
              </span>
            )}
          </div>

          {tradeTitle && (
            <Link
              to={`/trades/${tradeId}`}
              className="chat-trade-subtitle dark:text-primary-400 dark:hover:text-primary-300 transition-colors duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              📦 {tradeTitle}
            </Link>
          )}
        </div>

        <div className="chat-header-actions">
          {/* 판매자 전용 버튼들 */}
          {myRole === 'seller' && tradeStatus === 'active' && (
            <>
              {!buyerId ? (
                // 구매자가 없을 때: 거래 예약 버튼
                <button
                  onClick={selectBuyer}
                  className="telegram-action-btn telegram-reserve-btn dark:bg-blue-600 dark:hover:bg-blue-700 transition-colors duration-200"
                  title="이 사용자를 구매자로 예약"
                >
                  🤝 거래 예약
                </button>
              ) : otherUserId === buyerId ? (
                // 구매자와 채팅 중일 때: 거래 완료, 구매자 변경, 취소 버튼
                <>
                  <button
                    onClick={completeTrade}
                    className="telegram-action-btn telegram-complete-btn dark:bg-green-600 dark:hover:bg-green-700 transition-colors duration-200"
                  >
                    ✓ 거래 완료
                  </button>
                  <button
                    onClick={changeBuyer}
                    className="telegram-action-btn telegram-warning-btn dark:bg-yellow-600 dark:hover:bg-yellow-700 transition-colors duration-200"
                    title="다른 구매자로 변경"
                  >
                    🔄 구매자 변경
                  </button>
                  <button
                    onClick={cancelTrade}
                    className="telegram-action-btn telegram-danger-btn dark:bg-red-600 dark:hover:bg-red-700 transition-colors duration-200"
                    title="거래 취소"
                  >
                    ✕ 거래 취소
                  </button>
                </>
              ) : (
                // 다른 사람과 채팅 중일 때
                <span className="text-xs text-gray-500 dark:text-gray-400">구매 예약됨</span>
              )}
            </>
          )}

          {/* 구매자 전용 버튼 */}
          {myRole === 'buyer' && tradeStatus === 'active' && buyerId && (
            <button
              onClick={completeTrade}
              className="telegram-action-btn telegram-complete-btn dark:bg-green-600 dark:hover:bg-green-700 transition-colors duration-200"
            >
              ✓ 거래 완료
            </button>
          )}

          {/* 공통 버튼 */}
          <button
            onClick={blockUser}
            className="telegram-action-btn dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
            title="사용자 차단"
          >
            차단
          </button>

          {!isTelegramStyle && (
            <button onClick={onClose} className="close-btn dark:text-gray-300 dark:hover:text-gray-100">×</button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className={`${isTelegramStyle ? "telegram-chat-messages dark:bg-gray-900" : "chat-messages dark:bg-gray-900"} transition-colors duration-200`}
      >
        {messages.length === 0 ? (
          <div className="no-messages dark:text-gray-400">
            <p>아직 메시지가 없습니다</p>
            <p>거래에 대해 문의해보세요!</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const isSent = msg.sender_id === currentUserId;

              return (
                <div
                  key={msg.id}
                  className={`message ${isSent ? 'sent' : 'received'}`}
                >
                  {!isSent && (
                    <div className="message-header">
                      <span className="message-sender dark:text-gray-400">
                        {msg.sender_username}
                      </span>
                    </div>
                  )}

                  <div className="message-bubble-wrapper">
                    <div className={`message-content ${isSent ? 'dark:bg-primary-600' : 'dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600'} transition-colors duration-200`}>
                      {msg.is_filtered ? (
                        <>
                          <span className="filtered-badge dark:bg-gradient-to-r dark:from-yellow-600 dark:to-yellow-700">필터링됨</span>
                          <p>{msg.filtered_message}</p>
                        </>
                      ) : (
                        <p>{msg.message}</p>
                      )}
                    </div>

                    <div className="message-meta dark:text-gray-500">
                      <span className="message-time dark:text-gray-500">
                        {new Date(msg.created_at + 'Z').toLocaleTimeString('ko-KR', {
                          timeZone: 'Asia/Seoul',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false
                        })}
                      </span>
                      {isSent && (
                        <span className={`read-status ${msg.is_read ? 'read dark:text-primary-400' : 'unread dark:text-gray-500'}`}>
                          {msg.is_read ? '읽음' : '안읽음'}
                        </span>
                      )}
                    </div>
                  </div>

                  {!isSent && (
                    <button
                      onClick={() => reportMessage(msg.id)}
                      className="report-btn dark:bg-red-900/20 dark:border-red-800/30 dark:hover:bg-red-900/30 transition-colors duration-200"
                      title="신고하기"
                    >
                      🚨
                    </button>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="chat-error dark:bg-red-900/30 dark:text-red-300 dark:border-red-800 transition-colors duration-200">
          {error}
        </div>
      )}

      {/* 후기 작성 알림 (입력창 위에 고정) */}
      {tradeStatus === 'completed' && !hasReviewed && (
        <div className="review-notice-fixed dark:bg-gray-800 dark:border-gray-700 transition-colors duration-200">
          <div className="review-notice dark:from-yellow-900/50 dark:to-yellow-800/50 dark:border-yellow-700 transition-colors duration-200">
            <div className="review-notice-content">
              <div className="review-notice-icon">✍️</div>
              <div className="review-notice-text">
                <p className="review-notice-title dark:text-yellow-300">거래가 완료되었습니다!</p>
                <p className="review-notice-subtitle dark:text-yellow-400">거래 상대방에 대한 후기를 작성해주세요</p>
              </div>
            </div>
            <Link
              to={`/trades/${tradeId}/review?userId=${otherUserId}`}
              className="review-notice-btn dark:from-yellow-600 dark:to-yellow-700 dark:hover:from-yellow-700 dark:hover:to-yellow-800 transition-colors duration-200"
            >
              후기 작성하기 →
            </Link>
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={sendMessage} className="chat-input-form dark:bg-gray-800 dark:border-gray-700 transition-colors duration-200">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="메시지를 입력하세요..."
          disabled={sending}
          maxLength={500}
          className="dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 dark:placeholder:text-gray-500 dark:focus:border-primary-500 dark:focus:bg-gray-600 dark:disabled:bg-gray-800 dark:disabled:text-gray-500 transition-colors duration-200"
        />
        <button type="submit" disabled={sending || !newMessage.trim()} className="dark:bg-gradient-to-r dark:from-primary-600 dark:to-primary-700 dark:hover:from-primary-700 dark:hover:to-primary-800 dark:disabled:bg-gray-700 transition-colors duration-200">
          {sending ? '전송중...' : '전송'}
        </button>
      </form>

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
          type={confirmModal.type}
        />
      )}

      {/* Report Modal */}
      {reportModal && (
        <ReportModal
          onSubmit={reportModal.onSubmit}
          onCancel={reportModal.onCancel}
        />
      )}
    </div>
  );
});

// Report Modal Component
function ReportModal({ onSubmit, onCancel }) {
  const [reportType, setReportType] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reportTypes = [
    { value: 'spam', label: '스팸', icon: '🚫', description: '반복적이거나 의미없는 메시지' },
    { value: 'contact_sharing', label: '연락처 공유', icon: '📞', description: '전화번호, 이메일, SNS 계정 등' },
    { value: 'harassment', label: '욕설/괴롭힘', icon: '😡', description: '비방, 욕설, 협박 등' },
    { value: 'rmt', label: '현금거래', icon: '💰', description: '게임 내 아이템/재화를 현금으로 거래' },
    { value: 'other', label: '기타', icon: '📝', description: '기타 부적절한 내용' }
  ];

  const handleSubmit = async () => {
    if (!reportType) {
      return;
    }

    setSubmitting(true);
    await onSubmit(reportType, description);
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4 transition-colors duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto transition-colors duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 transition-colors duration-200">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">메시지 신고</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">부적절한 메시지를 신고해주세요</p>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Report Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">신고 사유</label>
            <div className="space-y-2">
              {reportTypes.map((type) => (
                <label
                  key={type.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                    reportType === type.value
                      ? 'border-red-500 dark:border-red-600 bg-red-50 dark:bg-red-900/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="reportType"
                    value={type.value}
                    checked={reportType === type.value}
                    onChange={(e) => setReportType(e.target.value)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{type.icon}</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{type.label}</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{type.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              상세 내용 (선택사항)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="추가로 설명할 내용이 있다면 입력해주세요..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:focus:ring-red-600 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 transition-colors duration-200"
              rows="3"
              maxLength={500}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description.length}/500</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3 transition-colors duration-200">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg transition-colors duration-200 disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!reportType || submitting}
            className="flex-1 px-4 py-2.5 bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-800 text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? '신고 중...' : '신고하기'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatBox;
