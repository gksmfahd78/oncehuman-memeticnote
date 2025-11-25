import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../utils/axios';
import { useAuth } from '../contexts/AuthContext';

const NewTrade = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    item_name: '',
    title: '',
    description: '',
    price: '',
    listing_type: 'sell',
    trade_type: 'eternalland',
    server_scenario: '',
    server_number: '',
    server_name: ''
  });

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Build server_name from scenario and number
      const submitData = { ...formData };
      if (formData.trade_type === 'server' && formData.server_scenario && formData.server_number) {
        submitData.server_name = `${formData.server_scenario}-${formData.server_number}`;
      }

      const response = await axios.post('/trades', submitData);
      navigate(`/trades/${response.data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || '거래 등록에 실패했습니다');
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">거래 등록</h1>
        <p className="text-gray-600">거래할 아이템 정보를 입력해주세요</p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Listing Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              거래 타입 *
            </label>
            <div className="flex gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="listing_type"
                  value="sell"
                  checked={formData.listing_type === 'sell'}
                  onChange={handleChange}
                  className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">판매합니다</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="listing_type"
                  value="buy"
                  checked={formData.listing_type === 'buy'}
                  onChange={handleChange}
                  className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">구매합니다</span>
              </label>
            </div>
          </div>

          {/* Item Name */}
          <div>
            <label htmlFor="item_name" className="block text-sm font-medium text-gray-700 mb-2">
              아이템 이름 *
            </label>
            <input
              id="item_name"
              name="item_name"
              type="text"
              value={formData.item_name}
              onChange={handleChange}
              className="input-field"
              placeholder="예: 감염물, 설계도 등"
              required
            />
          </div>

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              제목 *
            </label>
            <input
              id="title"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleChange}
              className="input-field"
              placeholder="간단한 거래 제목을 입력하세요"
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
              className="input-field"
              rows="6"
              placeholder="아이템 상세 정보, 거래 조건 등을 입력하세요"
              required
            />
          </div>

          {/* Price */}
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
              가격 (선택)
            </label>
            <input
              id="price"
              name="price"
              type="text"
              value={formData.price}
              onChange={handleChange}
              className="input-field"
              placeholder="예: 1,000 에링, 감염물 교환 등"
            />
            <p className="mt-1 text-sm text-gray-500">
              가격을 비워두면 '가격 협의'로 표시됩니다
            </p>
          </div>

          {/* Trade Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              거래 방법 *
            </label>
            <div className="space-y-3">
              <label className="flex items-start cursor-pointer p-4 border-2 rounded-lg transition-all hover:border-primary-300">
                <input
                  type="radio"
                  name="trade_type"
                  value="eternalland"
                  checked={formData.trade_type === 'eternalland'}
                  onChange={handleChange}
                  className="mt-1 mr-3"
                />
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">이터널랜드</div>
                  <p className="text-sm text-gray-600 mt-1">
                    어느 서버든 이터널랜드에서 만날 수 있습니다
                  </p>
                </div>
              </label>

              <label className="flex items-start cursor-pointer p-4 border-2 rounded-lg transition-all hover:border-primary-300">
                <input
                  type="radio"
                  name="trade_type"
                  value="server"
                  checked={formData.trade_type === 'server'}
                  onChange={handleChange}
                  className="mt-1 mr-3"
                />
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">서버 직거래</div>
                  <p className="text-sm text-gray-600 mt-1">
                    특정 서버에서만 거래 가능합니다
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Server Selection (conditional) */}
          {formData.trade_type === 'server' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="server_scenario" className="block text-sm font-medium text-gray-700 mb-2">
                  시나리오 *
                </label>
                <select
                  id="server_scenario"
                  name="server_scenario"
                  value={formData.server_scenario}
                  onChange={handleChange}
                  className="input-field"
                  required={formData.trade_type === 'server'}
                >
                  <option value="">시나리오를 선택하세요</option>
                  <option value="터치 오브 스카이">터치 오브 스카이</option>
                  <option value="프리즘">프리즘</option>
                  <option value="설산">설산</option>
                  <option value="무한의 꿈">무한의 꿈</option>
                </select>
              </div>

              <div>
                <label htmlFor="server_number" className="block text-sm font-medium text-gray-700 mb-2">
                  서버 번호 *
                </label>
                <input
                  id="server_number"
                  name="server_number"
                  type="text"
                  value={formData.server_number}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="예: X0119"
                  required={formData.trade_type === 'server'}
                />
                <p className="mt-1 text-sm text-gray-500">
                  서버 번호만 입력하세요 (예: X0119, S0101)
                </p>
              </div>

              {formData.server_scenario && formData.server_number && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-sm text-gray-600">
                    최종 서버: <span className="font-semibold text-gray-900">{formData.server_scenario}-{formData.server_number}</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Discord Info */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6">
            <h3 className="text-center font-semibold text-gray-900 mb-4">거래 연락처</h3>
            <div className="flex flex-col items-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-gray-200 ring-4 ring-white shadow-lg">
                {user.profileImage ? (
                  <img
                    src={user.profileImage.startsWith('http') ? user.profileImage : `/${user.profileImage}`}
                    alt={user.username}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary-500 text-white text-lg font-bold rounded-full">
                    {user.username?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-900">{user.username}</p>
              </div>
              <p className="text-xs text-gray-600 text-center">
                프로필 정보가 구매자에게 표시됩니다
              </p>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {loading ? '등록 중...' : '거래 등록'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/trades')}
              disabled={loading}
              className="btn-secondary flex-1 disabled:opacity-50"
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewTrade;
