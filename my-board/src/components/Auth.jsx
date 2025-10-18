import { useState } from 'react';

const API_URL = 'http://localhost:8000/api';

export default function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [isFindId, setIsFindId] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [formData, setFormData] = useState({
    userid: '',
    email: '',
    password: '',
    confirmPassword: '',
    gender: '',
    birthdate: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // 아이디 찾기
    if (isFindId) {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/auth/find-userid`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            birthdate: formData.birthdate
          }),
        });

        const data = await response.json();

        if (response.ok) {
          alert(`찾으시는 아이디는 ${data.userid}입니다`);
          setIsFindId(false);
          setFormData({ userid: '', email: '', password: '', confirmPassword: '', gender: '', birthdate: '' });
        } else {
          setError(data.detail || '일치하는 정보를 찾을 수 없습니다.');
        }
      } catch (error) {
        console.error('Find ID error:', error);
        setError('서버와의 연결에 실패했습니다.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // 비밀번호 초기화
    if (isResetPassword) {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/auth/reset-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userid: formData.userid,
            email: formData.email,
            birthdate: formData.birthdate
          }),
        });

        const data = await response.json();

        if (response.ok) {
          alert(data.message);
          setIsResetPassword(false);
          setFormData({ userid: '', email: '', password: '', confirmPassword: '', gender: '', birthdate: '' });
        } else {
          setError(data.detail || '일치하는 정보를 찾을 수 없습니다.');
        }
      } catch (error) {
        console.error('Reset password error:', error);
        setError('서버와의 연결에 실패했습니다.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // 회원가입 시 비밀번호 확인
    if (!isLogin && formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      setLoading(true);
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const body = isLogin
        ? { userid: formData.userid, password: formData.password }
        : {
            userid: formData.userid,
            email: formData.email,
            password: formData.password,
            gender: formData.gender,
            birthdate: formData.birthdate
          };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        if (isLogin) {
          // 로그인 성공
          localStorage.setItem('token', data.access_token);
          localStorage.setItem('userid', data.userid);

          // 임시 비밀번호 여부 저장
          if (data.is_temporary_password) {
            localStorage.setItem('is_temporary_password', 'true');
          } else {
            localStorage.removeItem('is_temporary_password');
          }

          onLogin(data.userid);
        } else {
          // 회원가입 성공
          alert('회원가입이 완료되었습니다. 로그인해주세요.');
          setIsLogin(true);
          setFormData({ userid: '', email: '', password: '', confirmPassword: '', gender: '', birthdate: '' });
        }
      } else {
        setError(data.detail || '오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Auth error:', error);
      setError('서버와의 연결에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    if (isFindId) return '아이디 찾기';
    if (isResetPassword) return '비밀번호 찾기';
    return isLogin ? '로그인' : '회원가입';
  };

  const resetForm = () => {
    setFormData({ userid: '', email: '', password: '', confirmPassword: '', gender: '', birthdate: '' });
    setError('');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
          {getTitle()}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 아이디 찾기 폼 */}
          {isFindId && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  이메일
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="이메일을 입력하세요"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  생년월일
                </label>
                <input
                  type="date"
                  required
                  value={formData.birthdate}
                  onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {/* 비밀번호 찾기 폼 */}
          {isResetPassword && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  아이디
                </label>
                <input
                  type="text"
                  required
                  value={formData.userid}
                  onChange={(e) => setFormData({ ...formData, userid: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="아이디를 입력하세요"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  이메일
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="이메일을 입력하세요"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  생년월일
                </label>
                <input
                  type="date"
                  required
                  value={formData.birthdate}
                  onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {/* 로그인/회원가입 폼 */}
          {!isFindId && !isResetPassword && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  아이디
                </label>
                <input
                  type="text"
                  required
                  value={formData.userid}
                  onChange={(e) => setFormData({ ...formData, userid: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="아이디를 입력하세요"
                />
              </div>

              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    이메일
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="이메일을 입력하세요"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  비밀번호
                </label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="비밀번호를 입력하세요"
                />
              </div>

              {!isLogin && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      비밀번호 확인
                    </label>
                    <input
                      type="password"
                      required
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="비밀번호를 다시 입력하세요"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      성별
                    </label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, gender: 'male' })}
                        className={`flex-1 py-3 px-4 rounded-md font-medium transition-all ${
                          formData.gender === 'male'
                            ? 'bg-blue-500 text-white border-2 border-blue-500'
                            : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-blue-300'
                        }`}
                      >
                        남자
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, gender: 'female' })}
                        className={`flex-1 py-3 px-4 rounded-md font-medium transition-all ${
                          formData.gender === 'female'
                            ? 'bg-blue-500 text-white border-2 border-blue-500'
                            : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-blue-300'
                        }`}
                      >
                        여자
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      생년월일
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.birthdate}
                      onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}
            </>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-3 rounded-md hover:bg-blue-600 font-medium text-base disabled:bg-gray-400"
          >
            {loading ? '처리 중...' : (isFindId ? '아이디 찾기' : isResetPassword ? '비밀번호 초기화' : (isLogin ? '로그인' : '회원가입'))}
          </button>
        </form>

        {/* 아이디/비밀번호 찾기, 회원가입 링크 */}
        <div className="mt-6 space-y-3">
          {isLogin && !isFindId && !isResetPassword && (
            <div className="flex justify-center gap-4 text-sm">
              <button
                onClick={() => {
                  setIsFindId(true);
                  resetForm();
                }}
                className="text-blue-500 hover:text-blue-600"
              >
                아이디 찾기
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={() => {
                  setIsResetPassword(true);
                  resetForm();
                }}
                className="text-blue-500 hover:text-blue-600"
              >
                비밀번호 찾기
              </button>
            </div>
          )}

          <div className="text-center">
            {isFindId || isResetPassword ? (
              <button
                onClick={() => {
                  setIsFindId(false);
                  setIsResetPassword(false);
                  resetForm();
                }}
                className="text-blue-500 hover:text-blue-600 text-sm"
              >
                로그인으로 돌아가기
              </button>
            ) : (
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  resetForm();
                }}
                className="text-blue-500 hover:text-blue-600 text-sm"
              >
                {isLogin ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
