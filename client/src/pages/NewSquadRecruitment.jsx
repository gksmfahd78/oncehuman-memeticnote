import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function NewSquadRecruitment() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    server_scenario: '',
    server_number: '',
    server_name: '',
    squad_type: '',
    required_members: '',
    requirements: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Build server_name from scenario and number
    const submitData = { ...formData };
    if (formData.server_scenario && formData.server_number) {
      submitData.server_name = `${formData.server_scenario}-${formData.server_number}`;
    }

    if (!formData.title || !formData.description || !submitData.server_name || !formData.squad_type || !formData.required_members) {
      setError('필수 항목을 모두 입력해주세요');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/api/squad-recruitments`,
        {
          ...submitData,
          required_members: parseInt(formData.required_members)
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      navigate(`/squad-recruitments/${response.data.id}`);
    } catch (err) {
      console.error('Failed to create recruitment:', err);
      setError(err.response?.data?.error || '스쿼드 모집 등록에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <svg className="w-16 h-16 text-yellow-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-bold text-yellow-800 mb-2">로그인이 필요합니다</h2>
          <p className="text-yellow-600 mb-4">스쿼드 모집을 등록하려면 먼저 로그인해주세요</p>
          <button
            onClick={() => navigate('/login')}
            className="btn-primary"
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          뒤로가기
        </button>
        <h1 className="text-3xl font-bold text-gray-900">스쿼드 모집하기</h1>
        <p className="text-gray-600 mt-2">함께 플레이할 스쿼드원을 모집하세요</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            제목 *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="예: PVP 스쿼드원 모집합니다"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            상세 설명 *
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="6"
            placeholder="스쿼드 활동 내용, 플레이 시간, 목표 등을 자세히 작성해주세요"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            required
          />
        </div>

        {/* Server Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            서버 *
          </label>
          <div className="grid grid-cols-2 gap-3">
            <select
              name="server_scenario"
              value={formData.server_scenario}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            >
                <option value="">시나리오를 선택하세요</option>
                <option value="터치 오브 스카이">터치 오브 스카이</option>
                <option value="프리즘">프리즘</option>
                <option value="설산">설산</option>
                <option value="무한의 꿈">무한의 꿈</option>
            </select>
            <input
              type="text"
              name="server_number"
              value={formData.server_number}
              onChange={handleChange}
              placeholder="서버 번호 (예: X0119, S0101)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            예: X0119
          </p>
        </div>

        {/* Squad Type */}
        <div>
          <label htmlFor="squad_type" className="block text-sm font-medium text-gray-700 mb-2">
            스쿼드 유형 *
          </label>
          <select
            id="squad_type"
            name="squad_type"
            value={formData.squad_type}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            required
          >
            <option value="">선택하세요</option>
            <option value="pvp">PvP</option>
            <option value="pve">PvE</option>
            <option value="mixed">혼합</option>
          </select>
        </div>

        {/* Required Members */}
        <div>
          <label htmlFor="required_members" className="block text-sm font-medium text-gray-700 mb-2">
            모집 인원 *
          </label>
          <input
            type="number"
            id="required_members"
            name="required_members"
            value={formData.required_members}
            onChange={handleChange}
            min="2"
            max="50"
            placeholder="2-50명"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            required
          />
          <p className="text-xs text-gray-500 mt-1">모집할 총 인원을 입력하세요 (자신 포함, 2~50명)</p>
        </div>

        {/* Requirements */}
        <div>
          <label htmlFor="requirements" className="block text-sm font-medium text-gray-700 mb-2">
            지원 조건 (선택)
          </label>
          <textarea
            id="requirements"
            name="requirements"
            value={formData.requirements}
            onChange={handleChange}
            rows="4"
            placeholder="예: 레벨 40 이상, 디스코드 필수, 주중 저녁 활동 가능자 등"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                등록 중...
              </span>
            ) : (
              '모집 등록하기'
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );
}

export default NewSquadRecruitment;
