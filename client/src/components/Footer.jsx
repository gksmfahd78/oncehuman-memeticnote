import { memo } from 'react';
import { Link } from 'react-router-dom';

const Footer = memo(() => {
  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto transition-colors duration-200">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p>&copy; 2025 원스휴먼 메메틱 노트. All rights reserved.</p>
            <p className="text-xs mt-1 text-gray-500 dark:text-gray-500">
              본 서비스는 원스휴먼(Once Human) 게임의 팬 메이드 도구입니다.
            </p>
          </div>
          <div className="flex gap-6">
            <Link
              to="/privacy-policy"
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              개인정보처리방침
            </Link>
            <Link
              to="/bug-report"
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              버그 제보/문의
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
});

export default Footer;
