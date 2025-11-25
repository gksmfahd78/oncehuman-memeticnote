import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from '../utils/axios';
import { useAuth } from '../contexts/AuthContext';
import { getImageUrl } from '../utils/imageUrl';
import ChatBox from '../components/ChatBox';

const Chats = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedChat, setSelectedChat] = useState(null);

  useEffect(() => {
    fetchChats();
  }, []);

  const fetchChats = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/chat/my-chats');
      setChats(response.data.chats);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch chats:', err);
      setError('채팅 목록을 불러오는데 실패했습니다');
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: { text: '거래중', color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' },
      completed: { text: '완료', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
      cancelled: { text: '취소', color: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' }
    };
    return badges[status] || badges.active;
  };

  const getRoleBadge = (role) => {
    const badges = {
      seller: { text: '판매자', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300', icon: '💼' },
      buyer: { text: '구매자', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300', icon: '🛒' },
      interested: { text: '관심있음', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300', icon: '👀' }
    };
    return badges[role] || badges.interested;
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분`;
    if (hours < 24) return `${hours}시간`;
    if (days < 7) return `${days}일`;
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors duration-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-500 mx-auto"></div>
          <p className="mt-4 text-base text-gray-600 dark:text-gray-400">채팅 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors duration-200">
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4 text-center max-w-md">
          <p className="text-red-800 dark:text-red-300 text-base">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col md:flex-row overflow-hidden transition-colors duration-200">
      {/* Chat List - Telegram Style */}
      <div className={`
        ${selectedChat ? 'hidden md:flex' : 'flex'}
        flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
        w-full md:w-96 lg:w-[420px]
        transition-all duration-300
      `}>
        {/* Header */}
        <div className="flex-shrink-0 px-4 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors duration-200">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">채팅</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {chats.length}개의 대화
          </p>
        </div>

        {/* Search Bar */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-gray-100 dark:border-gray-700 transition-colors duration-200">
          <div className="relative">
            <input
              type="text"
              placeholder="채팅 검색..."
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 focus:bg-white dark:focus:bg-gray-600 transition-all text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500">
              🔍
            </div>
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-800 transition-colors duration-200">
          {chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-gray-50 dark:bg-gray-800">
              <div className="text-6xl mb-4">💬</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">채팅 내역이 없습니다</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">관리자 문의 또는 다른 사용자와 대화를 시작해보세요!</p>
              {/* <Link
                to="/trades"
                className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 dark:bg-primary-600 dark:hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
              >
                거래 둘러보기
              </Link> */}
            </div>
          ) : (
            chats.map((chat) => {
              const statusBadge = getStatusBadge(chat.trade_status);
              const roleBadge = getRoleBadge(chat.my_role);
              const isSelected = selectedChat?.trade_id === chat.trade_id && selectedChat?.other_user_id === chat.other_user_id;

              return (
                <div
                  key={`${chat.trade_id}-${chat.other_user_id}`}
                  onClick={() => setSelectedChat(chat)}
                  className={`
                    relative px-4 py-3 cursor-pointer transition-all duration-200 border-b border-gray-100 dark:border-gray-700
                    ${isSelected ? 'bg-primary-50 dark:bg-primary-900/30 border-l-4 border-l-primary-600 dark:border-l-primary-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-600'}
                  `}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <Link
                      to={`/users/${chat.other_user_uid}`}
                      onClick={(e) => e.stopPropagation()}
                      className="relative flex-shrink-0"
                    >
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 hover:ring-2 hover:ring-primary-500 dark:hover:ring-primary-600 transition-all duration-200">
                        {chat.other_discord_avatar ? (
                          <img
                            src={getImageUrl(chat.other_discord_avatar)}
                            alt={chat.other_username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-600 dark:from-primary-600 dark:to-primary-700 text-white font-bold text-lg">
                            {chat.other_username?.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      {chat.unread_count > 0 && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary-600 dark:bg-primary-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg">
                          {chat.unread_count}
                        </div>
                      )}
                    </Link>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Top Row */}
                      <div className="flex items-baseline justify-between mb-1">
                        <Link
                          to={`/users/${chat.other_user_uid}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-semibold text-base text-gray-900 dark:text-gray-100 truncate pr-2 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200"
                        >
                          {chat.other_username}
                        </Link>
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                          {chat.last_message_time ? formatTime(chat.last_message_time) : ''}
                        </span>
                      </div>

                      {/* Trade Title - Hidden for inquiry chat */}
                      {/* <p className="text-xs text-primary-600 dark:text-primary-400 mb-1 truncate">
                        📦 {chat.trade_title}
                      </p> */}

                      {/* Last Message */}
                      <p className={`text-sm truncate ${chat.unread_count > 0 ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-300'}`}>
                        {chat.last_message_filtered ? '🔒 [필터링됨]' : chat.last_message || '메시지 없음'}
                      </p>

                      {/* Badges - Hidden for inquiry chat */}
                      {/* <div className="flex items-center gap-2 mt-1.5">
                        <span className={`inline-block px-1.5 py-0.5 text-xs font-medium rounded ${statusBadge.color}`}>
                          {statusBadge.text}
                        </span>
                        <span className={`inline-block px-1.5 py-0.5 text-xs font-medium rounded ${roleBadge.color}`}>
                          {roleBadge.icon}
                        </span>
                      </div> */}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Box - Telegram Style */}
      <div className={`
        flex-1 bg-white dark:bg-gray-800
        ${selectedChat ? 'flex' : 'hidden md:flex'}
        flex-col transition-colors duration-200
      `}>
        {selectedChat ? (
          <ChatBox
            tradeId={selectedChat.trade_id}
            tradeTitle={selectedChat.trade_title}
            tradeStatus={selectedChat.trade_status}
            sellerId={selectedChat.seller_id}
            sellerUsername={selectedChat.other_username}
            otherUserId={selectedChat.other_user_id}
            otherUserUid={selectedChat.other_user_uid}
            currentUserId={user?.id}
            myRole={selectedChat.my_role}
            buyerId={selectedChat.buyer_id}
            onClose={() => {
              setSelectedChat(null);
              fetchChats();
            }}
            isTelegramStyle={true}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">채팅을 선택해주세요</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">왼쪽에서 대화를 선택하여 시작하세요</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chats;
