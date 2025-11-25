import { useState, useEffect } from 'react';
import axios from '../../utils/axios';

const EnhancedStats = ({ showToast }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/admin/stats/overview');
      console.log('Stats response:', response.data); // 디버깅용
      setStats(response.data);
    } catch (error) {
      console.error('Stats error:', error); // 디버깅용
      console.error('Error details:', error.response?.data); // 상세 에러
      console.error('Error message:', error.response?.data?.details); // 서버 에러 메시지
      showToast(error.response?.data?.error || '통계를 불러오는데 실패했습니다', 'error');
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!stats || !stats.users || !stats.trades) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-600 mb-4">통계 데이터를 불러올 수 없습니다</div>
        <button
          onClick={fetchStats}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          다시 시도
        </button>
      </div>
    );
  }

  const StatCard = ({ title, value, subtitle, trend, color = 'blue' }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
      <div className={`text-3xl font-bold text-${color}-600 mb-1`}>{value}</div>
      {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      {trend && <p className="text-xs text-gray-400 mt-1">{trend}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* User Statistics */}
      <div>
        <h2 className="text-xl font-bold mb-4">사용자 통계</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="전체 사용자"
            value={(stats.users?.total_users || 0).toLocaleString()}
            color="blue"
          />
          <StatCard
            title="오늘 활성 사용자"
            value={(stats.users?.active_users_today || 0).toLocaleString()}
            subtitle={`어제: ${(stats.users?.active_users_week || 0) - (stats.users?.active_users_today || 0)}명`}
            color="green"
          />
          <StatCard
            title="신규 가입 (이번 달)"
            value={(stats.users?.new_users_month || 0).toLocaleString()}
            subtitle={`이번 주: ${stats.users?.new_users_week || 0}명, 오늘: ${stats.users?.new_users_today || 0}명`}
            color="purple"
          />
          <StatCard
            title="차단된 사용자"
            value={(stats.users?.banned_users || 0).toLocaleString()}
            color="red"
          />
        </div>
      </div>

      {/* Trade Statistics */}
      <div>
        <h2 className="text-xl font-bold mb-4">거래 통계</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="전체 거래"
            value={(stats.trades?.total_trades || 0).toLocaleString()}
            color="blue"
          />
          <StatCard
            title="진행 중"
            value={(stats.trades?.active_trades || 0).toLocaleString()}
            color="yellow"
          />
          <StatCard
            title="완료된 거래"
            value={(stats.trades?.completed_trades || 0).toLocaleString()}
            subtitle={`완료율: ${((stats.trades?.completed_trades || 0) / (stats.trades?.total_trades || 1) * 100).toFixed(1)}%`}
            color="green"
          />
          <StatCard
            title="취소된 거래"
            value={(stats.trades?.cancelled_trades || 0).toLocaleString()}
            subtitle={`취소율: ${((stats.trades?.cancelled_trades || 0) / (stats.trades?.total_trades || 1) * 100).toFixed(1)}%`}
            color="red"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <StatCard
            title="오늘 등록"
            value={(stats.trades?.trades_today || 0).toLocaleString()}
            color="green"
          />
          <StatCard
            title="이번 주 등록"
            value={(stats.trades?.trades_week || 0).toLocaleString()}
            color="green"
          />
          <StatCard
            title="이번 달 등록"
            value={(stats.trades?.trades_month || 0).toLocaleString()}
            color="green"
          />
        </div>
      </div>

      {/* Chat Statistics */}
      <div>
        <h2 className="text-xl font-bold mb-4">채팅 통계</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="전체 메시지"
            value={(stats.chat?.total_messages || 0).toLocaleString()}
            color="blue"
          />
          <StatCard
            title="필터링된 메시지"
            value={(stats.chat?.filtered_messages || 0).toLocaleString()}
            subtitle={`필터링률: ${((stats.chat?.filtered_messages || 0) / (stats.chat?.total_messages || 1) * 100).toFixed(2)}%`}
            color="orange"
          />
          <StatCard
            title="오늘 메시지"
            value={(stats.chat?.messages_today || 0).toLocaleString()}
            color="green"
          />
          <StatCard
            title="이번 주 메시지"
            value={(stats.chat?.messages_week || 0).toLocaleString()}
            color="green"
          />
        </div>
      </div>

      {/* Report Statistics */}
      <div>
        <h2 className="text-xl font-bold mb-4">신고 통계</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="전체 신고"
            value={(stats.reports?.total_reports || 0).toLocaleString()}
            color="blue"
          />
          <StatCard
            title="대기 중"
            value={(stats.reports?.pending_reports || 0).toLocaleString()}
            color="yellow"
          />
          <StatCard
            title="검토 완료"
            value={(stats.reports?.reviewed_reports || 0).toLocaleString()}
            color="green"
          />
          <StatCard
            title="기각됨"
            value={(stats.reports?.dismissed_reports || 0).toLocaleString()}
            color="gray"
          />
        </div>
      </div>

      {/* Clan Statistics */}
      <div>
        <h2 className="text-xl font-bold mb-4">하이브 통계</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="전체 하이브"
            value={(stats.clans?.total_clans || 0).toLocaleString()}
            color="purple"
          />
          <StatCard
            title="전체 하이브 멤버"
            value={(stats.clans?.total_clan_members || 0).toLocaleString()}
            color="purple"
          />
          <StatCard
            title="평균 멤버 수"
            value={(stats.clans?.avg_members_per_clan || 0).toFixed(1)}
            color="purple"
          />
        </div>
      </div>

      {/* Review Statistics */}
      <div>
        <h2 className="text-xl font-bold mb-4">후기 통계</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="전체 후기"
            value={(stats.reviews?.total_reviews || 0).toLocaleString()}
            color="blue"
          />
          <StatCard
            title="긍정 후기"
            value={(stats.reviews?.positive_reviews || 0).toLocaleString()}
            subtitle={`비율: ${((stats.reviews?.positive_reviews || 0) / (stats.reviews?.total_reviews || 1) * 100).toFixed(1)}%`}
            color="green"
          />
          <StatCard
            title="부정 후기"
            value={(stats.reviews?.negative_reviews || 0).toLocaleString()}
            subtitle={`비율: ${((stats.reviews?.negative_reviews || 0) / (stats.reviews?.total_reviews || 1) * 100).toFixed(1)}%`}
            color="red"
          />
          <StatCard
            title="평균 거래온도"
            value={`${(stats.reviews?.avg_trust_score || 36.5).toFixed(1)}°C`}
            color="blue"
          />
        </div>
      </div>

      {/* Daily Trend */}
      {stats.dailyTrend && stats.dailyTrend.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">일일 활동 추이 (최근 7일)</h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">날짜</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">활성 사용자</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">신규 거래</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.dailyTrend.map((day, index) => (
                  <tr key={index} className={index === 0 ? 'bg-blue-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {new Date(day.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                      {index === 0 && <span className="ml-2 text-blue-600">(오늘)</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {day.active_users}명
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {day.trades_created}건
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={fetchStats}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          새로고침
        </button>
      </div>
    </div>
  );
};

export default EnhancedStats;
