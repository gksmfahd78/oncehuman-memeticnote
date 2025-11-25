import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from '../utils/axios';
const LEVELS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

const ClanDetails = () => {
  const { clanId } = useParams();
  const [clan, setClan] = useState(null);
  const [memetics, setMemetics] = useState({});
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [viewMode, setViewMode] = useState('table'); // 기본값을 테이블 뷰로 변경
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [joinRequests, setJoinRequests] = useState([]);
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedLevelModal, setSelectedLevelModal] = useState(null);

  // 새로운 필터 state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCharacter, setSelectedCharacter] = useState('all'); // 멤버 -> 캐릭터로 변경

  // 하이브의 모든 캐릭터 목록 추출 (메메틱 데이터에서)
  const allCharacters = useMemo(() => {
    const charactersMap = new Map();

    Object.values(memetics).forEach(levelMemetics => {
      levelMemetics.forEach(memetic => {
        if (memetic.characterId && !charactersMap.has(memetic.characterId)) {
          charactersMap.set(memetic.characterId, {
            id: memetic.characterId,
            name: memetic.characterName,
            username: memetic.username,
            userId: memetic.userId
          });
        }
      });
    });

    return Array.from(charactersMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name, 'ko')
    );
  }, [memetics]);

  // API 병렬 호출 최적화 (40-60% 로딩 시간 감소)
  useEffect(() => {
    const loadData = async () => {
      try {
        const [clanRes, memeticsRes, requestsRes] = await Promise.all([
          axios.get(`/clans/${clanId}`),
          axios.get(`/memetics/clan/${clanId}/by-level`),
          axios.get(`/clans/${clanId}/requests`).catch(() => ({ data: [] }))
        ]);

        setClan(clanRes.data);
        setMemetics(memeticsRes.data);
        setJoinRequests(requestsRes.data || []);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError('데이터를 불러오는데 실패했습니다');
      }
    };

    loadData();
  }, [clanId]);

  const fetchClanDetails = async () => {
    try {
      const response = await axios.get(`/clans/${clanId}`);
      setClan(response.data);
      setError('');
    } catch (err) {
      console.error('Failed to fetch clan');
      if (err.response?.status === 403) {
        setError('이 하이브의 멤버만 접근할 수 있습니다');
      } else if (err.response?.status === 404) {
        setError('하이브를 찾을 수 없습니다');
      } else {
        setError('하이브 정보를 불러오는데 실패했습니다');
      }
      setClan({ error: true });
    }
  };

  const fetchMemetics = async () => {
    try {
      const response = await axios.get(`/memetics/clan/${clanId}/by-level`);
      setMemetics(response.data);
    } catch (err) {
      console.error('Failed to fetch memetics');
    }
  };

  const fetchJoinRequests = async () => {
    try {
      const response = await axios.get(`/clans/${clanId}/requests`);
      setJoinRequests(response.data);
    } catch (err) {
      // Not a master or no requests, ignore error
    }
  };

  const handleJoinRequest = async (requestId, action) => {
    setError('');
    setSuccess('');

    try {
      await axios.post(`/clans/${clanId}/requests/${requestId}/${action}`);
      setSuccess(action === 'approve' ? '가입이 승인되었습니다!' : '가입이 거부되었습니다');
      fetchJoinRequests();
      fetchClanDetails();
    } catch (err) {
      setError(err.response?.data?.error || '요청 처리에 실패했습니다');
    }
  };

  const copyInviteLink = () => {
    const inviteLink = `${window.location.origin}/invite/${clan.inviteCode}`;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const regenerateInviteCode = async () => {
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(`/clans/${clanId}/regenerate-invite`);
      setSuccess('초대 코드가 재생성되었습니다!');
      setClan({ ...clan, inviteCode: response.data.inviteCode });
    } catch (err) {
      setError(err.response?.data?.error || '초대 코드 재생성에 실패했습니다');
    }
  };

  const handleDeleteClan = async () => {
    setError('');
    setSuccess('');

    try {
      await axios.delete(`/clans/${clanId}`);
      setSuccess('하이브가 삭제되었습니다');
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || '하이브 삭제에 실패했습니다');
      setShowDeleteConfirm(false);
    }
  };

  // ⚡ 메모이제이션으로 불필요한 재계산 방지 + 검색 & 캐릭터 필터링
  const filteredMemetics = useMemo(() => {
    let result = { ...memetics };

    // 캐릭터 필터링 (멤버 -> 캐릭터로 변경)
    if (selectedCharacter !== 'all') {
      const selectedCharId = parseInt(selectedCharacter, 10);
      result = Object.fromEntries(
        Object.entries(result).map(([level, mems]) => [
          level,
          mems.filter(m => m.characterId && m.characterId === selectedCharId)
        ])
      );
    }

    // 검색어 필터링
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = Object.fromEntries(
        Object.entries(result).map(([level, mems]) => [
          level,
          mems.filter(m =>
            m.memeticName?.toLowerCase().includes(query) ||
            m.username?.toLowerCase().includes(query) ||
            m.characterName?.toLowerCase().includes(query)
          )
        ])
      );
    }

    // 레벨 필터링 (기존 로직)
    if (selectedLevel !== 'all') {
      return { [selectedLevel]: result[selectedLevel] || [] };
    }

    return result;
  }, [selectedLevel, memetics, searchQuery, selectedCharacter]);

  // 모달 메메틱 그룹핑 useMemo로 최적화
  const groupedModalMemetics = useMemo(() => {
    if (!selectedLevelModal) return {};

    const grouped = {};
    (memetics[selectedLevelModal] || []).forEach(memetic => {
      const key = `${memetic.characterId}_${memetic.characterName || memetic.username}`;
      if (!grouped[key]) {
        grouped[key] = {
          username: memetic.username,
          characterName: memetic.characterName || memetic.username,
          characterId: memetic.characterId,
          memetics: []
        };
      }
      grouped[key].memetics.push(memetic);
    });

    return grouped;
  }, [memetics, selectedLevelModal]);

  const isMaster = clan && clan.members && clan.members.some(
    m => m.role === 'master' && m.id === clan.masterId
  );

  if (!clan) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">하이브 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (clan.error) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="card p-8 text-center dark:bg-gray-800 transition-colors duration-200">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">접근할 수 없습니다</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="btn-primary w-full"
            >
              대시보드로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-3 sm:py-8 px-0 sm:px-4 transition-colors duration-200">
      <div className="max-w-6xl mx-auto w-full">
        <div className="bg-white dark:bg-gray-800 rounded-none sm:rounded-3xl shadow-2xl border-y sm:border border-gray-100 dark:border-purple-700 p-4 sm:p-8 mb-4 sm:mb-6 transition-colors duration-200">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-0 mb-4 sm:mb-6">
            <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
              <div className="w-12 h-12 sm:w-20 sm:h-20 bg-gradient-to-br from-purple-500 via-indigo-600 to-blue-600 rounded-2xl sm:rounded-3xl flex items-center justify-center text-white font-bold text-xl sm:text-3xl shadow-xl border-2 sm:border-4 border-white/30 flex-shrink-0">
                {clan.clanName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-1 sm:mb-2 truncate">{clan.clanName}</h1>
                <div className="flex items-center text-gray-700 dark:text-gray-300">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 text-purple-600 dark:text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-xs sm:text-base truncate">마스터: <span className="font-bold text-purple-700 dark:text-purple-300">{clan.masterUsername}</span></span>
                </div>
              </div>
            </div>
            {isMaster && (
              <button
                onClick={() => setShowInviteCode(!showInviteCode)}
                className="w-full sm:w-auto bg-gradient-to-r from-primary-600 via-indigo-600 to-purple-600 dark:from-purple-500 dark:via-indigo-500 dark:to-blue-500 text-white font-bold py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl hover:from-primary-700 hover:via-indigo-700 hover:to-purple-700 dark:hover:from-purple-600 dark:hover:via-indigo-600 dark:hover:to-blue-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center space-x-2 text-sm sm:text-base"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>초대 코드</span>
              </button>
            )}
          </div>

          {isMaster && showInviteCode && (
            <div className="border-t-2 border-purple-200 dark:border-purple-700 pt-4 sm:pt-6 mb-4 sm:mb-6">
              <h3 className="text-base sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                초대 링크
              </h3>
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30 rounded-xl sm:rounded-2xl p-4 sm:p-6 border-2 border-purple-200 dark:border-purple-700">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 mb-3">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/invite/${clan.inviteCode}`}
                    className="input-field flex-1 bg-white font-mono text-xs sm:text-sm"
                  />
                  <button
                    onClick={copyInviteLink}
                    className={`whitespace-nowrap font-bold py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm sm:text-base ${
                      copied
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                        : 'bg-gradient-to-r from-primary-600 via-indigo-600 to-purple-600 dark:from-purple-500 dark:via-indigo-500 dark:to-blue-500 text-white hover:from-primary-700 hover:via-indigo-700 hover:to-purple-700 dark:hover:from-purple-600 dark:hover:via-indigo-600 dark:hover:to-blue-600'
                    }`}
                  >
                    {copied ? '✓ 복사됨!' : '복사'}
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs sm:text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    초대 코드: <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">{clan.inviteCode}</span>
                  </span>
                  <button
                    onClick={regenerateInviteCode}
                    className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium text-left sm:text-right"
                  >
                    재생성
                  </button>
                </div>
              </div>

              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium text-xs sm:text-sm flex items-center"
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  하이브 삭제
                </button>
              </div>
            </div>
          )}

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 sm:pt-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                멤버
              </h2>
              <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full">
                {clan.members?.length || 0}명
              </span>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {clan.members?.map((member) => (
                <div
                  key={member.id}
                  className={`px-3 sm:px-5 py-2 sm:py-3 rounded-xl sm:rounded-2xl flex items-center space-x-2 sm:space-x-3 transition-all duration-200 transform hover:scale-105 ${
                    member.role === 'master'
                      ? 'bg-gradient-to-r from-yellow-100 via-amber-100 to-yellow-100 dark:from-yellow-900/50 dark:via-amber-900/50 dark:to-yellow-900/50 border-2 border-yellow-400 dark:border-yellow-700 shadow-md'
                      : 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-2 border-blue-200 dark:border-blue-700 shadow-sm hover:shadow-md'
                  }`}
                >
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs sm:text-sm flex-shrink-0 ${
                    member.role === 'master'
                      ? 'bg-gradient-to-br from-yellow-400 to-yellow-600'
                      : 'bg-gradient-to-br from-gray-400 to-gray-600'
                  }`}>
                    {member.username?.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-1">
                      <span className={`font-medium text-xs sm:text-sm truncate ${member.role === 'master' ? 'text-yellow-900 dark:text-yellow-300' : 'text-gray-900 dark:text-gray-100'}`}>
                        {member.username}
                      </span>
                      {member.role === 'master' && (
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      )}
                    </div>
                    {member.gameCharacterName && (
                      <span className={`text-[10px] sm:text-xs truncate block ${member.role === 'master' ? 'text-yellow-700 dark:text-yellow-400' : 'text-gray-600 dark:text-gray-400'}`}>
                        {member.gameCharacterName}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {isMaster && joinRequests.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 sm:pt-8 mt-4 sm:mt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-base sm:text-xl font-bold text-gray-900 dark:text-gray-100">가입 대기 중</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold text-amber-700 dark:text-amber-300 bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/50 dark:to-yellow-900/50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border-2 border-amber-300 dark:border-amber-700 shadow-sm">
                    {joinRequests.length}명 대기
                  </span>
                </div>
              </div>
              <div className="space-y-3 sm:space-y-4">
                {joinRequests.map((request) => (
                  <div key={request.id} className="bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-900/30 dark:via-yellow-900/30 dark:to-orange-900/30 border-2 border-amber-200 dark:border-amber-700 p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm hover:shadow-md transition-all duration-200">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 sm:gap-3 mb-2">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg sm:rounded-xl flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-md flex-shrink-0">
                            {request.username?.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                              <span className="font-bold text-gray-900 dark:text-gray-100 text-base sm:text-lg truncate">{request.username}</span>
                              <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-700 px-1.5 sm:px-2 py-0.5 rounded-md border border-gray-200 dark:border-gray-600 truncate">
                                {request.characterName}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                              <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span>신청일: {new Date(request.createdAt).toLocaleDateString('ko-KR')}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 sm:gap-3 sm:ml-4">
                        <button
                          onClick={() => handleJoinRequest(request.id, 'approve')}
                          className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold rounded-lg sm:rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center justify-center gap-1.5 sm:gap-2 group text-sm sm:text-base"
                        >
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 transform group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          승인
                        </button>
                        <button
                          onClick={() => handleJoinRequest(request.id, 'reject')}
                          className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-bold rounded-lg sm:rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center justify-center gap-1.5 sm:gap-2 group text-sm sm:text-base"
                        >
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 transform group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          거부
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-2 border-red-500 dark:border-red-400 p-5 rounded-2xl transition-colors duration-200">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="font-medium text-red-800 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-500 dark:border-green-400 p-5 rounded-2xl transition-colors duration-200">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-green-500 dark:text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="font-medium text-green-800 dark:text-green-300">{success}</p>
            </div>
          </div>
        )}

        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-purple-700 p-8 max-w-md w-full transition-colors duration-200">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 dark:bg-red-900/50 rounded-full">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 text-center mb-2">하이브 삭제</h3>
              <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                정말로 "<span className="font-semibold">{clan.clanName}</span>" 하이브를 삭제하시겠습니까?
                <br />
                <span className="text-sm text-red-600 dark:text-red-400">이 작업은 되돌릴 수 없습니다.</span>
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="btn-secondary flex-1"
                >
                  취소
                </button>
                <button
                  onClick={handleDeleteClan}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-100 dark:border-purple-700 p-3 sm:p-8 transition-colors duration-200">
          {/* 헤더 & 필터 */}
          <div className="mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center mb-3 sm:mb-4">
              <svg className="w-5 h-5 sm:w-7 sm:h-7 mr-2 sm:mr-3 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              메메틱 컬렉션
            </h2>

            {/* 검색 & 필터 바 */}
            <div className="flex flex-col lg:flex-row gap-2 sm:gap-3 mb-3 sm:mb-4">
              {/* 검색 */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="메메틱 또는 캐릭터 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30 border-2 border-purple-200 dark:border-purple-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 text-sm sm:text-base text-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
                />
                <svg className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* 캐릭터 필터 */}
              <select
                value={selectedCharacter}
                onChange={(e) => setSelectedCharacter(e.target.value)}
                className="px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-2 border-blue-200 dark:border-blue-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 font-medium text-gray-700 dark:text-gray-300 text-sm sm:text-base"
              >
                <option value="all">🎮 전체 캐릭터</option>
                {allCharacters.map((character) => {
                  const member = clan?.members?.find(m => m.id === character.userId);
                  return (
                    <option key={character.id} value={character.id}>
                      {member?.role === 'master' ? '⭐ ' : ''}
                      {character.name} ({character.username})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* 뷰 모드 선택 */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 hidden sm:inline">보기:</span>
              <div className="flex bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-xl p-0.5 sm:p-1 shadow-inner w-full sm:w-auto">
                <button
                  onClick={() => setViewMode('table')}
                  title="테이블 뷰"
                  className={`flex-1 sm:flex-none px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-1 sm:gap-2 ${
                    viewMode === 'table'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white/50 dark:hover:bg-gray-600/50'
                  }`}
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span className="hidden xs:inline">테이블</span>
                </button>
                <button
                  onClick={() => setViewMode('compact')}
                  title="컴팩트 뷰"
                  className={`flex-1 sm:flex-none px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-1 sm:gap-2 ${
                    viewMode === 'compact'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white/50 dark:hover:bg-gray-600/50'
                  }`}
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  <span className="hidden xs:inline">컴팩트</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  title="리스트 뷰"
                  className={`flex-1 sm:flex-none px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-1 sm:gap-2 ${
                    viewMode === 'list'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white/50 dark:hover:bg-gray-600/50'
                  }`}
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  <span className="hidden xs:inline">리스트</span>
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  title="그리드 뷰"
                  className={`flex-1 sm:flex-none px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-1 sm:gap-2 ${
                    viewMode === 'grid'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white/50 dark:hover:bg-gray-600/50'
                  }`}
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  <span className="hidden xs:inline">그리드</span>
                </button>
              </div>
            </div>
          </div>

          {viewMode === 'table' ? (
            /* 테이블 뷰 - 엑셀 스타일 (캐릭터 기준) */
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              {allCharacters.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">등록된 메메틱이 없습니다</p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">멤버들이 메메틱을 등록하면 여기에 표시됩니다</p>
                </div>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-purple-100 via-indigo-100 to-blue-100 dark:from-purple-900/50 dark:via-indigo-900/50 dark:to-blue-900/50">
                      <th className="sticky left-0 z-10 bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/50 dark:to-indigo-900/50 px-4 py-3 text-left font-bold text-gray-900 dark:text-gray-100 border-2 border-purple-200 dark:border-purple-700">
                        레벨
                      </th>
                      {allCharacters.map((character) => {
                        const member = clan?.members?.find(m => m.id === character.userId);
                        return (
                          <th key={character.id} className="px-4 py-3 text-center font-bold text-gray-900 dark:text-gray-100 border-2 border-purple-200 dark:border-purple-700 min-w-[150px]">
                            <div className="flex flex-col items-center gap-1">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md ${
                                member?.role === 'master'
                                  ? 'bg-gradient-to-br from-yellow-400 to-yellow-600'
                                  : 'bg-gradient-to-br from-blue-400 to-indigo-600'
                              }`}>
                                {(character.name || character.username || 'U').charAt(0).toUpperCase()}
                              </div>
                              <span className="text-xs font-bold">{character.name || character.username || '알 수 없음'}</span>
                              {character.username && <span className="text-[10px] text-gray-600 dark:text-gray-400">({character.username})</span>}
                              {member?.role === 'master' && <span className="text-[10px] text-yellow-600 dark:text-yellow-400">⭐마스터</span>}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                <tbody>
                  {LEVELS.map((level) => {
                    const levelMemetics = memetics[level] || [];
                    return (
                      <tr key={level} className="hover:bg-purple-50/50 dark:hover:bg-purple-900/20 transition-colors">
                        <td className="sticky left-0 z-10 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30 px-4 py-3 font-bold text-gray-900 dark:text-gray-100 border-2 border-purple-200 dark:border-purple-700">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-md">
                              {level}
                            </div>
                            <span>레벨 {level}</span>
                          </div>
                        </td>
                        {allCharacters.map((character) => {
                          const characterMemetic = levelMemetics.find(m => m.characterId === character.id);
                          return (
                            <td key={character.id} className="px-3 py-3 border-2 border-purple-200 dark:border-purple-700 text-center">
                              {characterMemetic ? (
                                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border-2 border-green-300 dark:border-green-700 rounded-lg p-2 hover:shadow-md transition-all">
                                  <div className="flex items-center justify-center gap-1 mb-1">
                                    <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                  <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate" title={characterMemetic.memeticName}>
                                    {characterMemetic.memeticName}
                                  </p>
                                  {characterMemetic.memeticType && (
                                    <span className="inline-block bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[10px] font-medium px-2 py-0.5 rounded-full mt-1">
                                      {characterMemetic.memeticType}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-2 opacity-50">
                                  <svg className="w-6 h-6 text-gray-300 dark:text-gray-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">없음</p>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              )}
            </div>
          ) : viewMode === 'compact' ? (
            /* 컴팩트 뷰 - 더 많은 정보를 한 화면에 */
            <div className="space-y-4">
              {LEVELS.map((level) => {
                const levelMemetics = filteredMemetics[level] || [];
                if (levelMemetics.length === 0) return null;

                return (
                  <div key={level} className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30 border-2 border-purple-200 dark:border-purple-700 rounded-lg sm:rounded-xl p-3 sm:p-4">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-sm sm:text-base font-bold shadow-lg">
                        {level}
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">레벨 {level}</h3>
                      <span className="ml-auto bg-white dark:bg-gray-700 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-bold text-purple-700 dark:text-purple-300 shadow-sm">
                        {levelMemetics.length}명
                      </span>
                    </div>
                    <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                      {levelMemetics.map((memetic) => (
                        <div key={memetic.id} className="bg-white dark:bg-gray-800 border-2 border-purple-200 dark:border-purple-700 rounded-lg p-2 hover:shadow-md hover:scale-105 transition-all">
                          <div className="flex items-start gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                              clan?.members?.find(m => m.id === memetic.userId)?.role === 'master'
                                ? 'bg-gradient-to-br from-yellow-400 to-yellow-600'
                                : 'bg-gradient-to-br from-blue-400 to-indigo-600'
                            }`}>
                              {(memetic.characterName || memetic.username || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate" title={memetic.memeticName || '메메틱'}>
                                {memetic.memeticName || '메메틱'}
                              </p>
                              <p className="text-[10px] text-gray-600 dark:text-gray-400 truncate" title={`${memetic.characterName || memetic.username || '캐릭터'} (${memetic.username || '유저'})`}>
                                {memetic.characterName || memetic.username || '캐릭터'}
                              </p>
                              {memetic.username && (
                                <p className="text-[9px] text-gray-500 dark:text-gray-500 truncate">
                                  {memetic.username}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {Object.values(filteredMemetics).every(arr => arr.length === 0) && (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">검색 결과가 없습니다</p>
                </div>
              )}
            </div>
          ) : viewMode === 'list' ? (
            <div className="space-y-6 sm:space-y-8">
              {Object.entries(filteredMemetics).map(([level, levelMemetics]) => (
                <div key={level} className="border-b border-gray-200 dark:border-gray-700 pb-4 sm:pb-6 last:border-b-0 last:pb-0">
                  <div className="flex items-center mb-3 sm:mb-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center text-white text-sm sm:text-base font-bold shadow-md mr-2 sm:mr-3">
                      {level}
                    </div>
                    <h3 className="text-base sm:text-xl font-bold text-gray-900 dark:text-gray-100">레벨 {level} 메메틱</h3>
                    <span className="ml-auto text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full">
                      {levelMemetics.length}개
                    </span>
                  </div>
                  {levelMemetics.length === 0 ? (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 sm:p-8 text-center">
                      <svg className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2 sm:mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p className="text-gray-500 dark:text-gray-400 italic text-sm sm:text-base">이 레벨에 등록된 메메틱이 아직 없습니다</p>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                      {levelMemetics.map((memetic) => (
                        <div key={memetic.id} className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-700 border border-gray-200 dark:border-gray-600 p-4 sm:p-5 rounded-lg hover:shadow-md transition-all duration-200">
                          <div className="flex justify-between items-start mb-2 sm:mb-3">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-base sm:text-lg text-gray-900 dark:text-gray-100 mb-1 truncate">{memetic.memeticName || '메메틱'}</h4>
                              {memetic.memeticType && (
                                <span className="inline-block bg-primary-100 dark:bg-primary-900/50 text-primary-800 dark:text-primary-300 text-[10px] sm:text-xs font-medium px-2 sm:px-2.5 py-0.5 rounded-full mb-2">
                                  {memetic.memeticType}
                                </span>
                              )}
                            </div>
                            <div className="text-right ml-2 sm:ml-4 flex-shrink-0">
                              <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 flex items-center">
                                <svg className="w-3 h-3 mr-0.5 sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="hidden sm:inline">{memetic.obtainedAt ? new Date(memetic.obtainedAt).toLocaleDateString() : '날짜 없음'}</span>
                                <span className="sm:hidden">{memetic.obtainedAt ? new Date(memetic.obtainedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : '-'}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">
                            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{memetic.characterName || memetic.username || '캐릭터'}</span>
                            {memetic.username && <span className="ml-1 text-gray-500 dark:text-gray-400 truncate">({memetic.username})</span>}
                          </div>
                          {memetic.notes && (
                            <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-2 sm:p-3 rounded border border-gray-100 dark:border-gray-600 mt-2 line-clamp-2">
                              {memetic.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div>
              {/* Grid View */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
                {LEVELS.map((level) => {
                  const levelMemetics = memetics[level] || [];
                  const hasMemetics = levelMemetics.length > 0;

                  return (
                    <div
                      key={level}
                      onClick={() => hasMemetics && setSelectedLevelModal(level)}
                      className={`relative rounded-lg sm:rounded-xl overflow-hidden transition-all duration-300 ${
                        hasMemetics
                          ? 'border-2 border-primary-300 dark:border-primary-700 bg-gradient-to-br from-primary-50 via-white to-primary-100 dark:from-primary-900/30 dark:via-gray-800 dark:to-primary-900/50 shadow-md hover:shadow-xl hover:scale-105 cursor-pointer'
                          : 'border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {/* Level Badge */}
                      <div className={`absolute top-1.5 sm:top-2 left-1.5 sm:left-2 z-10 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-bold shadow-sm ${
                        hasMemetics
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-400 dark:bg-gray-600 text-white'
                      }`}>
                        Lv.{level}
                      </div>

                      {/* Member Count Badge */}
                      {hasMemetics && (
                        <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 z-10 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-bold shadow-sm bg-green-600 text-white">
                          {levelMemetics.length}명
                        </div>
                      )}

                      <div className="p-3 sm:p-4 pt-8 sm:pt-10 min-h-[160px] sm:min-h-[180px] flex flex-col">
                        {hasMemetics ? (
                          <div className="flex-1 flex flex-col">
                            {/* Checkmark Icon */}
                            <div className="flex justify-center mb-2 sm:mb-3">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-md">
                                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            </div>
                            {/* Member List */}
                            <div className="space-y-1 sm:space-y-1.5">
                              {levelMemetics.slice(0, 3).map((memetic) => (
                                <div key={memetic.id} className="text-[10px] sm:text-xs bg-white/70 dark:bg-gray-700/70 rounded px-1.5 sm:px-2 py-1 sm:py-1.5 border border-primary-200 dark:border-primary-700">
                                  <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{memetic.memeticName || '메메틱'}</p>
                                  <p className="text-[9px] sm:text-[10px] text-gray-600 dark:text-gray-400 truncate">
                                    {memetic.characterName || memetic.username || '캐릭터'} {memetic.username ? `(${memetic.username})` : ''}
                                  </p>
                                </div>
                              ))}
                              {levelMemetics.length > 3 && (
                                <p className="text-[10px] sm:text-xs text-center text-primary-600 dark:text-primary-400 font-medium pt-0.5 sm:pt-1">
                                  +{levelMemetics.length - 3}명 더보기
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1 flex flex-col items-center justify-center text-center">
                            {/* Empty Icon */}
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-1.5 sm:mb-2 opacity-60">
                              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                            </div>
                            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium">미등록</p>
                            <p className="text-[9px] sm:text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 sm:mt-1">아직 메메틱이<br />없습니다</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Level Details Modal */}
        {selectedLevelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-3 sm:px-4" onClick={() => setSelectedLevelModal(null)}>
            <div className="card p-4 sm:p-6 max-w-2xl w-full max-h-[85vh] sm:max-h-[80vh] overflow-y-auto dark:bg-gray-800 transition-colors duration-200" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="flex items-center min-w-0 flex-1">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center text-white text-base sm:text-lg font-bold shadow-md mr-2 sm:mr-3 flex-shrink-0">
                    {selectedLevelModal}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">레벨 {selectedLevelModal} 메메틱</h3>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{memetics[selectedLevelModal]?.length || 0}개 등록됨</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLevelModal(null)}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors ml-2 flex-shrink-0"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Members List */}
              <div className="space-y-3 sm:space-y-4">
                {Object.values(groupedModalMemetics).map((group, idx) => (
                    <div key={idx} className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 sm:p-4 hover:shadow-md transition-all">
                      {/* User Header */}
                      <div className="flex items-center mb-2 sm:mb-3 pb-2 sm:pb-3 border-b border-gray-200 dark:border-gray-700">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white text-sm sm:text-base font-bold mr-2 sm:mr-3 shadow-sm flex-shrink-0">
                          {(group.characterName || group.username || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100 truncate">{group.characterName || group.username || '알 수 없음'}</p>
                          {group.username && <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 truncate">({group.username})</p>}
                        </div>
                        <div className="ml-2 flex-shrink-0">
                          <span className="inline-block bg-primary-100 dark:bg-primary-900/50 text-primary-800 dark:text-primary-300 text-[10px] sm:text-xs font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full">
                            {group.memetics?.length || 0}개
                          </span>
                        </div>
                      </div>

                      {/* Memetics List */}
                      <div className="space-y-1.5 sm:space-y-2">
                        {group.memetics?.map((memetic, mIdx) => (
                          <div key={mIdx} className="flex items-center bg-white dark:bg-gray-800 rounded-lg p-2 sm:p-3 border border-gray-100 dark:border-gray-600">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100 truncate">{memetic.memeticName || '메메틱'}</p>
                              {memetic.memeticType && (
                                <span className="inline-block bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 rounded mt-1">
                                  {memetic.memeticType}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 ml-2 sm:ml-4 flex-shrink-0">
                              {memetic.obtainedAt ? new Date(memetic.obtainedAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : '-'}
                            </div>
                          </div>
                        )) || <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">메메틱이 없습니다</p>}
                      </div>
                    </div>
                  ))}
              </div>

              {/* Close Button */}
              <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setSelectedLevelModal(null)}
                  className="w-full btn-secondary py-2.5"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClanDetails;
