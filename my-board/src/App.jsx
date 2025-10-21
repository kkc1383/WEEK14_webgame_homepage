import { useState, useEffect } from 'react';
import Board from './components/Board';
import Auth from './components/Auth';
import MyPage from './components/MyPage';

const API_URL = 'http://localhost:8000/api';

function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('board'); // 'board' or 'mypage'
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // 토큰 자동 갱신 함수
  const refreshToken = async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        localStorage.setItem('userid', data.userid);
        localStorage.setItem('is_temporary_password', data.is_temporary_password);
        return true;
      } else {
        // Refresh token도 만료됨
        return false;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  };

  useEffect(() => {
    // 로컬 스토리지에서 사용자 정보 확인
    const token = localStorage.getItem('token');
    const userid = localStorage.getItem('userid');

    if (token && userid) {
      setUser(userid);
      const savedIsAdmin = localStorage.getItem('is_admin');
      setIsAdmin(savedIsAdmin === 'true');
    }
    setLoading(false);

    // 25분마다 토큰 자동 갱신 (30분 만료 전에 갱신)
    const refreshInterval = setInterval(async () => {
      const currentUser = localStorage.getItem('userid');
      if (currentUser) {
        const success = await refreshToken();
        if (!success) {
          // Refresh 실패 시 로그아웃
          handleLogout();
          alert('세션이 만료되었습니다. 다시 로그인해주세요.');
        }
      }
    }, 25 * 60 * 1000); // 25분

    return () => clearInterval(refreshInterval);
  }, []);

  const handleLogin = async (userid) => {
    setUser(userid);

    // 관리자 권한 확인
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/auth/check-admin`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setIsAdmin(data.is_admin);
        localStorage.setItem('is_admin', data.is_admin);
      }
    } catch (error) {
      console.error('Admin check failed:', error);
    }

    // 임시 비밀번호로 로그인한 경우 마이페이지로 이동
    const isTempPassword = localStorage.getItem('is_temporary_password');
    if (isTempPassword === 'true') {
      alert('초기 비밀번호를 입력하셨습니다. 비밀번호를 변경해주세요');
      setCurrentView('mypage');
    }
  };

  const handleLogout = (showMessage = true) => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('userid');
    localStorage.removeItem('is_temporary_password');
    localStorage.removeItem('is_admin');
    setUser(null);
    setCurrentView('board');
    if (showMessage) {
      alert('로그아웃 되었습니다!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  return currentView === 'mypage' ? (
    <MyPage user={user} onBack={() => setCurrentView('board')} />
  ) : (
    <Board user={user} isAdmin={isAdmin} onLogout={handleLogout} onMyPage={() => setCurrentView('mypage')} />
  );
}

export default App