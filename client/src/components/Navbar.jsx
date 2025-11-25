import { useState, memo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getImageUrl } from '../utils/imageUrl';
import ThemeToggle from './ThemeToggle';

const Navbar = memo(() => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchUid, setSearchUid] = useState('');
  const [uidCopied, setUidCopied] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsMobileMenuOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleNavClick = () => {
    // 즉시 메뉴 닫기 - 애니메이션 없이
    setIsMobileMenuOpen(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchUid.trim()) {
      navigate(`/users/${searchUid.trim()}`);
      setIsSearchOpen(false);
      setSearchUid('');
      setIsMobileMenuOpen(false);
    }
  };

  const copyUidToClipboard = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid);
      setUidCopied(true);
      setTimeout(() => setUidCopied(false), 2000);
    }
  };

  return (
    <nav className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border-b-2 border-purple-200/50 dark:border-purple-700/50 sticky top-0 z-50 shadow-lg transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-4 md:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-16">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center space-x-2 sm:space-x-2 md:space-x-3 group flex-shrink-0"
            onClick={closeMobileMenu}
          >
            <div className="relative">
              <div className="w-9 h-9 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-gradient-to-br from-purple-500 via-indigo-600 to-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                <svg className="w-5 h-5 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-base sm:text-base md:text-lg font-display font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent group-hover:from-purple-700 group-hover:via-indigo-700 group-hover:to-blue-700 transition-all">
                메메틱 노트
              </span>
              <span className="text-[9px] sm:text-[9px] md:text-[10px] text-gray-500 font-medium -mt-0.5 sm:-mt-1 hidden xs:block">Once Human</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          {user && (
            <div className="hidden md:flex items-center flex-1 justify-between ml-12">
              {/* Main Navigation */}
              <div className="flex items-center space-x-2">
                <Link
                  to="/dashboard"
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                    isActive('/dashboard')
                      ? 'bg-gradient-to-r from-purple-100 via-indigo-100 to-blue-100 dark:from-purple-900/50 dark:via-indigo-900/50 dark:to-blue-900/50 text-purple-700 dark:text-purple-300 shadow-md border-2 border-purple-200 dark:border-purple-700'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gradient-to-r hover:from-purple-50 hover:via-indigo-50 hover:to-blue-50 dark:hover:from-purple-900/30 dark:hover:via-indigo-900/30 dark:hover:to-blue-900/30 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  <div className="flex items-center space-x-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <span>대시보드</span>
                  </div>
                </Link>
                <Link
                  to="/my-memetics"
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                    isActive('/my-memetics')
                      ? 'bg-gradient-to-r from-purple-100 via-indigo-100 to-blue-100 dark:from-purple-900/50 dark:via-indigo-900/50 dark:to-blue-900/50 text-purple-700 dark:text-purple-300 shadow-md border-2 border-purple-200 dark:border-purple-700'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gradient-to-r hover:from-purple-50 hover:via-indigo-50 hover:to-blue-50 dark:hover:from-purple-900/30 dark:hover:via-indigo-900/30 dark:hover:to-blue-900/30 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  <div className="flex items-center space-x-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span>내 메메틱</span>
                  </div>
                </Link>
                {/* <Link
                  to="/trades"
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    isActive('/trades') || location.pathname.startsWith('/trades/')
                      ? 'bg-primary-100 text-primary-700 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center space-x-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>거래</span>
                  </div>
                </Link>
                <Link
                  to="/squad-recruitments"
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    isActive('/squad-recruitments') || location.pathname.startsWith('/squad-recruitments/')
                      ? 'bg-primary-100 text-primary-700 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center space-x-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span>스쿼드</span>
                  </div>
                </Link> */}
              </div>

              {/* Right Side Actions */}
              <div className="flex items-center space-x-2">
                {/* Theme Toggle */}
                <ThemeToggle />

                {/* Chat Icon */}
                <Link
                  to="/chats"
                  className={`p-2 rounded-xl transition-all duration-200 ${
                    isActive('/chats')
                      ? 'bg-gradient-to-r from-purple-100 via-indigo-100 to-blue-100 dark:from-purple-900/50 dark:via-indigo-900/50 dark:to-blue-900/50 text-purple-700 dark:text-purple-300 shadow-md'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gradient-to-r hover:from-purple-50 hover:via-indigo-50 hover:to-blue-50 dark:hover:from-purple-900/30 dark:hover:via-indigo-900/30 dark:hover:to-blue-900/30 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                  title="채팅"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </Link>

                {/* Search Icon */}
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gradient-to-r hover:from-purple-50 hover:via-indigo-50 hover:to-blue-50 dark:hover:from-purple-900/30 dark:hover:via-indigo-900/30 dark:hover:to-blue-900/30 hover:text-gray-900 dark:hover:text-gray-100 transition-all duration-200"
                  title="UID로 사용자 검색"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>

                {/* Divider */}
                <div className="h-8 w-px bg-gradient-to-b from-purple-200 via-indigo-200 to-blue-200 dark:from-purple-700 dark:via-indigo-700 dark:to-blue-700"></div>

                {/* User Profile */}
                <div className="flex items-center space-x-3">
                  <Link
                    to="/profile"
                    className="flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 dark:from-purple-900/50 dark:via-indigo-900/50 dark:to-blue-900/50 rounded-xl border-2 border-purple-200 dark:border-purple-700 hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-600 transition-all"
                  >
                    <div className={`w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 ${
                      user.profileImage
                        ? 'bg-gray-200 border border-gray-300'
                        : 'bg-gradient-to-br from-purple-400 via-indigo-500 to-blue-600 text-white font-bold text-xs'
                    } shadow-md`}>
                      {user.profileImage ? (
                        <img
                          src={getImageUrl(user.profileImage, true)}
                          alt={user.username}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.classList.add('bg-gradient-to-br', 'from-primary-400', 'via-primary-500', 'to-primary-600');
                            e.target.parentElement.classList.remove('bg-gray-200', 'border', 'border-gray-300');
                            e.target.parentElement.innerText = user.username?.charAt(0).toUpperCase();
                          }}
                        />
                      ) : (
                        user.username?.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 leading-tight">{user.username}</span>
                      {user.uid && (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">@{user.uid}</span>
                        </div>
                      )}
                    </div>
                  </Link>
                  {user.uid && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        copyUidToClipboard();
                      }}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                      title="UID 복사"
                    >
                      {uidCopied ? (
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  )}
                  <button
                    onClick={handleLogout}
                    className="px-3 py-1.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gradient-to-r hover:from-red-50 hover:via-pink-50 hover:to-red-50 dark:hover:from-red-900/30 dark:hover:via-pink-900/30 dark:hover:to-red-900/30 hover:text-red-600 dark:hover:text-red-400 rounded-xl border-2 border-transparent hover:border-red-200 dark:hover:border-red-800 transition-all duration-200 flex items-center space-x-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>로그아웃</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
          >
            {isMobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t-2 border-purple-200/50 dark:border-purple-700/50 animate-slide-down bg-gradient-to-b from-white/95 to-purple-50/30 dark:from-gray-800/95 dark:to-purple-900/20">
            {user ? (
              <div className="space-y-2">
                {/* User Info */}
                <Link
                  to="/profile"
                  onClick={handleNavClick}
                  className="flex items-center space-x-3 px-3 py-2 bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 dark:from-purple-900/50 dark:via-indigo-900/50 dark:to-blue-900/50 rounded-xl border-2 border-purple-200 dark:border-purple-700 mb-3 hover:shadow-lg transition-all"
                >
                  <div className={`w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 ${
                    user.profileImage
                      ? 'bg-gray-200 border border-gray-300'
                      : 'bg-gradient-to-br from-purple-400 via-indigo-500 to-blue-600 text-white font-bold'
                  } shadow-md`}>
                    {user.profileImage ? (
                      <img
                        src={getImageUrl(user.profileImage, true)}
                        alt={user.username}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.classList.add('bg-gradient-to-br', 'from-primary-400', 'via-primary-500', 'to-primary-600');
                          e.target.parentElement.classList.remove('bg-gray-200', 'border', 'border-gray-300');
                          e.target.parentElement.innerText = user.username?.charAt(0).toUpperCase();
                        }}
                      />
                    ) : (
                      user.username?.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{user.username}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{user.uid ? `@${user.uid}` : '로그인됨'}</div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 dark:text-gray-500 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                {/* Menu Items */}
                <Link
                  to="/dashboard"
                  onClick={handleNavClick}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all min-h-[44px] ${
                    isActive('/dashboard')
                      ? 'bg-gradient-to-r from-purple-100 via-indigo-100 to-blue-100 dark:from-purple-900/50 dark:via-indigo-900/50 dark:to-blue-900/50 text-purple-700 dark:text-purple-300 shadow-md border-2 border-purple-200 dark:border-purple-700'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-purple-50 hover:via-indigo-50 hover:to-blue-50 dark:hover:from-purple-900/30 dark:hover:via-indigo-900/30 dark:hover:to-blue-900/30'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span>대시보드</span>
                </Link>
                <Link
                  to="/my-memetics"
                  onClick={handleNavClick}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all min-h-[44px] ${
                    isActive('/my-memetics')
                      ? 'bg-gradient-to-r from-purple-100 via-indigo-100 to-blue-100 dark:from-purple-900/50 dark:via-indigo-900/50 dark:to-blue-900/50 text-purple-700 dark:text-purple-300 shadow-md border-2 border-purple-200 dark:border-purple-700'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-purple-50 hover:via-indigo-50 hover:to-blue-50 dark:hover:from-purple-900/30 dark:hover:via-indigo-900/30 dark:hover:to-blue-900/30'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span>내 메메틱</span>
                </Link>
                {/* <Link
                  to="/trades"
                  onClick={closeMobileMenu}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg font-semibold transition-all min-h-[44px] ${
                    isActive('/trades') || location.pathname.startsWith('/trades/')
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>거래</span>
                </Link>
                <Link
                  to="/squad-recruitments"
                  onClick={closeMobileMenu}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg font-semibold transition-all min-h-[44px] ${
                    isActive('/squad-recruitments') || location.pathname.startsWith('/squad-recruitments/')
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>스쿼드</span>
                </Link> */}

                {/* Divider */}
                <div className="h-px bg-gray-200 dark:bg-gray-700 my-2"></div>

                {/* Chat */}
                <Link
                  to="/chats"
                  onClick={handleNavClick}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all min-h-[44px] ${
                    isActive('/chats')
                      ? 'bg-gradient-to-r from-purple-100 via-indigo-100 to-blue-100 dark:from-purple-900/50 dark:via-indigo-900/50 dark:to-blue-900/50 text-purple-700 dark:text-purple-300 shadow-md border-2 border-purple-200 dark:border-purple-700'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-purple-50 hover:via-indigo-50 hover:to-blue-50 dark:hover:from-purple-900/30 dark:hover:via-indigo-900/30 dark:hover:to-blue-900/30'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span>채팅</span>
                </Link>

                {/* Search */}
                <button
                  onClick={() => {
                    setIsSearchOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-purple-50 hover:via-indigo-50 hover:to-blue-50 dark:hover:from-purple-900/30 dark:hover:via-indigo-900/30 dark:hover:to-blue-900/30 transition-all min-h-[44px]"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>사용자 검색</span>
                </button>

                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-purple-50 hover:via-indigo-50 hover:to-blue-50 dark:hover:from-purple-900/30 dark:hover:via-indigo-900/30 dark:hover:to-blue-900/30 transition-all min-h-[44px]"
                >
                  {isDarkMode ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                  <span>테마 전환</span>
                </button>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-purple-200 dark:via-purple-700 to-transparent my-2"></div>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold text-red-600 dark:text-red-400 hover:bg-gradient-to-r hover:from-red-50 hover:via-pink-50 hover:to-red-50 dark:hover:from-red-900/30 dark:hover:via-pink-900/30 dark:hover:to-red-900/30 hover:border-2 hover:border-red-200 dark:hover:border-red-800 transition-all min-h-[44px]"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>로그아웃</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Link
                  to="/login"
                  onClick={closeMobileMenu}
                  className="block w-full btn-primary text-center min-h-[44px]"
                >
                  로그인
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4" onClick={() => setIsSearchOpen(false)}>
          <div className="bg-gradient-to-br from-white via-purple-50/30 to-white dark:from-gray-800 dark:via-purple-900/20 dark:to-gray-800 rounded-2xl sm:rounded-3xl shadow-2xl border-2 border-purple-200 dark:border-purple-700 max-w-md w-full p-4 sm:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 dark:from-purple-400 dark:via-indigo-400 dark:to-blue-400 bg-clip-text text-transparent">UID로 사용자 검색</h3>
              <button
                onClick={() => setIsSearchOpen(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-1.5 sm:p-2 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg sm:rounded-xl transition-all"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSearch}>
              <div className="mb-3 sm:mb-4">
                <label className="block text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                  사용자 UID
                </label>
                <input
                  type="text"
                  value={searchUid}
                  onChange={(e) => setSearchUid(e.target.value)}
                  placeholder="예: abc12345"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-purple-200 dark:border-purple-700 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 transition-all"
                  autoFocus
                />
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1.5 sm:mt-2">
                  사용자의 UID를 입력하여 프로필과 거래 내역을 확인하세요
                </p>
              </div>
              <div className="flex gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(false)}
                  className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-purple-200 dark:border-purple-700 rounded-lg sm:rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-purple-50 hover:via-indigo-50 hover:to-blue-50 dark:hover:from-purple-900/30 dark:hover:via-indigo-900/30 dark:hover:to-blue-900/30 font-bold transition-all"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={!searchUid.trim()}
                  className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 dark:from-purple-500 dark:via-indigo-500 dark:to-blue-500 text-white font-bold rounded-lg sm:rounded-xl hover:from-purple-700 hover:via-indigo-700 hover:to-blue-700 dark:hover:from-purple-600 dark:hover:via-indigo-600 dark:hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                >
                  검색
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </nav>
  );
});

export default Navbar;
