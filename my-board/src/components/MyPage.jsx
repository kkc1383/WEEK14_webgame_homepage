import { useState, useEffect, useRef } from 'react';

const API_URL = 'http://localhost:8000/api';

export default function MyPage({ user, onBack }) {
  const [userInfo, setUserInfo] = useState(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordSectionRef = useRef(null);
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  useEffect(() => {
    fetchUserInfo();

    // 임시 비밀번호로 로그인한 경우 비밀번호 변경 섹션으로 스크롤
    const isTempPassword = localStorage.getItem('is_temporary_password');
    if (isTempPassword === 'true') {
      passwordSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const fetchUserInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('User info from API:', data); // 디버깅용
        setUserInfo(data);
      } else {
        setError('사용자 정보를 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
      setError('서버와의 연결에 실패했습니다.');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // 비밀번호 확인
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    // 비밀번호 길이 체크
    if (passwordForm.newPassword.length < 4) {
      setError('새 비밀번호는 최소 4자 이상이어야 합니다.');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: passwordForm.currentPassword,
          new_password: passwordForm.newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('비밀번호가 성공적으로 변경되었습니다.');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });

        // 임시 비밀번호 플래그 제거
        localStorage.removeItem('is_temporary_password');
      } else {
        setError(data.detail || '비밀번호 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('Password change error:', error);
      setError('서버와의 연결에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileImageUpdate = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (!profileImageUrl.trim()) {
      setProfileError('프로필 이미지 URL을 입력하세요.');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/auth/update-profile-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          profile_image: profileImageUrl
        })
      });

      const data = await response.json();

      if (response.ok) {
        setProfileSuccess('프로필 이미지가 성공적으로 변경되었습니다.');
        setProfileImageUrl('');
        // 사용자 정보 다시 불러오기
        fetchUserInfo();
      } else {
        setProfileError(data.detail || '프로필 이미지 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('Profile image update error:', error);
      setProfileError('서버와의 연결에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR');
  };

  const getGenderText = (gender) => {
    if (gender === 'male') return '남자';
    if (gender === 'female') return '여자';
    return '-';
  };

  if (!userInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* 헤더 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-800">마이페이지</h1>
            <button
              onClick={onBack}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              돌아가기
            </button>
          </div>
        </div>

        {/* 프로필 이미지 */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 border-b pb-3">
            프로필 이미지
          </h2>
          <div className="flex flex-col items-center">
            <img
              src={userInfo.profile_image || '/images/profile.jpg'}
              alt="프로필"
              className="w-32 h-32 rounded-full object-cover mb-4 border-4 border-gray-200"
              onError={(e) => {
                e.target.src = '/images/profile.jpg';
              }}
            />
            <form onSubmit={handleProfileImageUpdate} className="w-full max-w-md">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  새 프로필 이미지 URL
                </label>
                <input
                  type="url"
                  value={profileImageUrl}
                  onChange={(e) => setProfileImageUrl(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="이미지 URL을 입력하세요"
                />
              </div>

              {profileError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                  {profileError}
                </div>
              )}

              {profileSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
                  {profileSuccess}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-500 text-white py-3 rounded-md hover:bg-blue-600 font-medium text-base disabled:bg-gray-400"
              >
                {loading ? '처리 중...' : '프로필 이미지 변경'}
              </button>
            </form>
          </div>
        </div>

        {/* 사용자 정보 */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 border-b pb-3">
            내 정보
          </h2>
          <div className="space-y-4">
            <div className="flex border-b pb-3">
              <span className="w-32 font-medium text-gray-700">아이디</span>
              <span className="text-gray-900">{userInfo.userid}</span>
            </div>
            <div className="flex border-b pb-3">
              <span className="w-32 font-medium text-gray-700">이메일</span>
              <span className="text-gray-900">{userInfo.email}</span>
            </div>
            <div className="flex border-b pb-3">
              <span className="w-32 font-medium text-gray-700">성별</span>
              <span className="text-gray-900">{getGenderText(userInfo.gender)}</span>
            </div>
            <div className="flex border-b pb-3">
              <span className="w-32 font-medium text-gray-700">생년월일</span>
              <span className="text-gray-900">{userInfo.birthdate || '-'}</span>
            </div>
            <div className="flex">
              <span className="w-32 font-medium text-gray-700">가입일</span>
              <span className="text-gray-900">{formatDate(userInfo.created_at)}</span>
            </div>
          </div>
        </div>

        {/* 비밀번호 변경 */}
        <div ref={passwordSectionRef} className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 border-b pb-3">
            비밀번호 변경
          </h2>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                현재 비밀번호
              </label>
              <input
                type="password"
                required
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="현재 비밀번호를 입력하세요"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                새 비밀번호
              </label>
              <input
                type="password"
                required
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="새 비밀번호를 입력하세요"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                새 비밀번호 확인
              </label>
              <input
                type="password"
                required
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="새 비밀번호를 다시 입력하세요"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 text-white py-3 rounded-md hover:bg-blue-600 font-medium text-base disabled:bg-gray-400"
            >
              {loading ? '처리 중...' : '비밀번호 변경'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
