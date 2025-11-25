import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from '../utils/axios';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUserFromToken } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');
      const error = searchParams.get('error');

      if (error) {
        console.error('Discord auth error:', error);
        navigate('/login?error=discord_auth_failed');
        return;
      }

      if (!token) {
        navigate('/login');
        return;
      }

      try {
        // Store token
        localStorage.setItem('token', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        // Fetch user data (axios baseURL is already /api)
        const response = await axios.get('/auth/me');
        setUserFromToken(response.data);

        // Redirect to dashboard
        navigate('/dashboard');
      } catch (error) {
        console.error('Failed to authenticate');
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
        navigate('/login?error=auth_failed');
      }
    };

    handleCallback();
  }, [searchParams, navigate, setUserFromToken]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mb-4"></div>
        <p className="text-lg text-gray-600">로그인 처리 중...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
