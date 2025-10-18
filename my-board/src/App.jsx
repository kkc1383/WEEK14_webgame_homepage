import { useState, useEffect } from 'react';
import Board from './components/Board';
import Auth from './components/Auth';
import MyPage from './components/MyPage';

function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('board'); // 'board' or 'mypage'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 로컬 스토리지에서 사용자 정보 확인
    const token = localStorage.getItem('token');
    const userid = localStorage.getItem('userid');

    if (token && userid) {
      setUser(userid);
    }
    setLoading(false);
  }, []);

  const handleLogin = (userid) => {
    setUser(userid);

    // 임시 비밀번호로 로그인한 경우 마이페이지로 이동
    const isTempPassword = localStorage.getItem('is_temporary_password');
    if (isTempPassword === 'true') {
      alert('초기 비밀번호를 입력하셨습니다. 비밀번호를 변경해주세요');
      setCurrentView('mypage');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userid');
    setUser(null);
    setCurrentView('board');
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
    <Board user={user} onLogout={handleLogout} onMyPage={() => setCurrentView('mypage')} />
  );
}

export default App