import React from 'react';

/**
 * ErrorBoundary 컴포넌트
 * React 앱의 에러를 catch하여 앱 전체가 크래시되는 것을 방지
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // 에러 발생 시 fallback UI 표시
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // 에러 로깅 (실제 프로덕션에서는 에러 리포팅 서비스로 전송)
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
          <div className="max-w-md w-full space-y-8">
            <div className="card p-8 text-center bg-white dark:bg-gray-800 border dark:border-gray-700">
              {/* Error Icon */}
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                <svg
                  className="h-8 w-8 text-red-600 dark:text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>

              {/* Error Message */}
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                문제가 발생했습니다
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                일시적인 오류가 발생했습니다.<br />
                페이지를 새로고침하거나 잠시 후 다시 시도해주세요.
              </p>

              {/* Error Details (dev mode) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-left mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    에러 상세 정보
                  </summary>
                  <pre className="text-xs text-red-600 dark:text-red-400 overflow-auto">
                    {this.state.error.toString()}
                    {'\n\n'}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => window.location.reload()}
                  className="btn-primary flex-1"
                >
                  페이지 새로고침
                </button>
                <button
                  onClick={this.handleReset}
                  className="btn-secondary flex-1"
                >
                  다시 시도
                </button>
              </div>

              {/* Home Link */}
              <a
                href="/"
                className="inline-block mt-4 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
              >
                홈으로 돌아가기
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
