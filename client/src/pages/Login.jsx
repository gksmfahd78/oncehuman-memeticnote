import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const Login = () => {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'discord_auth_failed') {
      setError('디스코드 로그인에 실패했습니다. 다시 시도해주세요.');
    } else if (errorParam === 'auth_failed') {
      setError('인증에 실패했습니다. 다시 시도해주세요.');
    }
  }, [searchParams]);

  const handleDiscordLogin = () => {
    window.location.href = '/api/auth/discord';
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#ffffff',
      padding: '20px'
    }}>
      <div style={{ width: '100%', maxWidth: '450px' }}>
        {/* Main Card */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '24px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.15)',
          overflow: 'hidden'
        }}>
          {/* Header Section with Gradient */}
          <div style={{
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 50%, #075985 100%)',
            padding: '48px 32px',
            textAlign: 'center',
            position: 'relative'
          }}>
            {/* Icon */}
            <div style={{
              margin: '0 auto 24px',
              width: '80px',
              height: '80px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg style={{ width: '48px', height: '48px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>

            {/* Title */}
            <h1 style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '8px'
            }}>
              메메틱 노트
            </h1>
            <p style={{
              fontSize: '14px',
              color: 'rgba(255, 255, 255, 0.9)'
            }}>
              Once Human
            </p>
          </div>

          {/* Content Section */}
          <div style={{ padding: '40px 32px' }}>
            {/* Error Alert */}
            {error && (
              <div style={{
                marginBottom: '24px',
                backgroundColor: '#fef2f2',
                borderLeft: '4px solid #ef4444',
                borderRadius: '8px',
                padding: '16px'
              }}>
                <p style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#991b1b'
                }}>
                  {error}
                </p>
              </div>
            )}

            {/* Welcome Message */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#111827',
                marginBottom: '8px'
              }}>
                환영합니다! 👋
              </h2>
              <p style={{
                fontSize: '14px',
                color: '#6b7280'
              }}>
                디스코드 계정으로 간편하게 로그인하고<br />
                메메틱 관리와 물건 거래 시작하세요
              </p>
            </div>

            {/* Discord Login Button */}
            <button
              onClick={handleDiscordLogin}
              style={{
                width: '100%',
                backgroundColor: '#5865F2',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '18px',
                padding: '16px 24px',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                boxShadow: '0 4px 12px rgba(88, 101, 242, 0.3)',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#4752C4';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(88, 101, 242, 0.4)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#5865F2';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(88, 101, 242, 0.3)';
              }}
            >
              <svg style={{ width: '28px', height: '28px' }} viewBox="0 0 71 55" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z" fill="currentColor"/>
              </svg>
              <span>Discord로 시작하기</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <p style={{
          textAlign: 'center',
          fontSize: '14px',
          color: '#6b7280',
          marginTop: '24px'
        }}>
          디스코드 계정이 없으신가요?{' '}
          <a
            href="https://discord.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#0284c7',
              fontWeight: '600',
              textDecoration: 'none'
            }}
          >
            계정 만들기
          </a>
        </p>
      </div>
    </div>
  );
};

export default Login;
