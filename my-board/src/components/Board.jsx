import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:8000/api';

export default function Board({ user, onLogout, onMyPage }) {
  const [posts, setPosts] = useState([]);
  const [view, setView] = useState('list');
  const [selectedPost, setSelectedPost] = useState(null);
  const [formData, setFormData] = useState({ title: '', content: '' });
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);

  // 게시글 목록 불러오기
  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/posts`);
      const data = await response.json();
      setPosts(data);
    } catch (error) {
      console.error('게시글 목록 불러오기 실패:', error);
      alert('게시글을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handlePostClick = async (post) => {
    try {
      const response = await fetch(`${API_URL}/posts/${post.id}`);
      const data = await response.json();
      setSelectedPost(data);
      setView('detail');
      // 조회수 증가 반영
      fetchPosts();
    } catch (error) {
      console.error('게시글 조회 실패:', error);
      alert('게시글을 불러오는데 실패했습니다.');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const postData = {
        ...formData,
        author: user // 로그인한 사용자 이름 사용
      };

      const response = await fetch(`${API_URL}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });

      if (response.ok) {
        setFormData({ title: '', content: '' });
        setView('list');
        fetchPosts();
      } else {
        alert('게시글 작성에 실패했습니다.');
      }
    } catch (error) {
      console.error('게시글 작성 실패:', error);
      alert('게시글 작성에 실패했습니다.');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/posts/${selectedPost.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
        }),
      });

      if (response.ok) {
        setView('list');
        setEditMode(false);
        setFormData({ title: '', author: '', content: '' });
        fetchPosts();
      } else {
        alert('게시글 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('게시글 수정 실패:', error);
      alert('게시글 수정에 실패했습니다.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try {
        const response = await fetch(`${API_URL}/posts/${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setView('list');
          fetchPosts();
        } else {
          alert('게시글 삭제에 실패했습니다.');
        }
      } catch (error) {
        console.error('게시글 삭제 실패:', error);
        alert('게시글 삭제에 실패했습니다.');
      }
    }
  };

  const startEdit = () => {
    setFormData({
      title: selectedPost.title,
      content: selectedPost.content
    });
    setEditMode(true);
    setView('form');
  };

  if (view === 'form') {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-8">
        <div className="bg-white rounded-lg shadow p-8 max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            {editMode ? '게시글 수정' : '글쓰기'}
          </h2>
          <form onSubmit={editMode ? handleUpdate : handleCreate}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                제목
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                내용
              </label>
              <textarea
                required
                rows="12"
                value={formData.content}
                onChange={(e) => setFormData({...formData, content: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 text-base font-medium"
              >
                {editMode ? '수정' : '등록'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setView('list');
                  setEditMode(false);
                  setFormData({ title: '', content: '' });
                }}
                className="px-6 py-3 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-base font-medium"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (view === 'detail') {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-8">
        <div className="bg-white rounded-lg shadow max-w-5xl mx-auto">
          <div className="border-b border-gray-200 px-8 py-6">
            <h1 className="text-3xl font-bold text-gray-800">{selectedPost.title}</h1>
            <div className="flex gap-6 mt-3 text-base text-gray-500">
              <span>작성자: {selectedPost.author}</span>
              <span>작성일: {selectedPost.date}</span>
              <span>조회수: {selectedPost.views}</span>
            </div>
          </div>
          <div className="px-8 py-10 min-h-[400px]">
            <p className="text-gray-700 whitespace-pre-wrap text-base leading-relaxed">{selectedPost.content}</p>
          </div>
          <div className="border-t border-gray-200 px-8 py-6 flex gap-2">
            <button
              onClick={() => setView('list')}
              className="px-6 py-3 bg-gray-500 text-white rounded hover:bg-gray-600 text-base font-medium"
            >
              목록
            </button>
            <button
              onClick={startEdit}
              className="px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 text-base font-medium"
            >
              수정
            </button>
            <button
              onClick={() => handleDelete(selectedPost.id)}
              className="px-6 py-3 bg-red-500 text-white rounded hover:bg-red-600 text-base font-medium"
            >
              삭제
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-8">
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200 px-8 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">게시판</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-700">
              환영합니다, <span className="font-semibold">{user}</span>님
            </span>
            <button
              onClick={onMyPage}
              className="px-6 py-3 bg-green-500 text-white rounded hover:bg-green-600 text-base font-medium"
            >
              마이페이지
            </button>
            <button
              onClick={() => setView('form')}
              className="px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 text-base font-medium"
            >
              글쓰기
            </button>
            <button
              onClick={onLogout}
              className="px-6 py-3 bg-gray-500 text-white rounded hover:bg-gray-600 text-base font-medium"
            >
              로그아웃
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-lg text-gray-500">로딩 중...</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-8 py-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider w-24">
                    번호
                  </th>
                  <th className="px-8 py-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">
                    제목
                  </th>
                  <th className="px-8 py-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider w-40">
                    작성자
                  </th>
                  <th className="px-8 py-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider w-40">
                    작성일
                  </th>
                  <th className="px-8 py-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider w-32">
                    조회수
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {posts.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-8 py-10 text-center text-gray-500">
                      게시글이 없습니다.
                    </td>
                  </tr>
                ) : (
                  posts.map((post, index) => (
                    <tr key={post.id} className="hover:bg-gray-50 transition-colors cursor-pointer">
                      <td className="px-8 py-5 text-base text-gray-500">
                        {posts.length - index}
                      </td>
                      <td
                        onClick={() => handlePostClick(post)}
                        className="px-8 py-5 text-base text-gray-900 hover:text-blue-600 font-medium"
                      >
                        {post.title}
                      </td>
                      <td className="px-8 py-5 text-base text-gray-500">
                        {post.author}
                      </td>
                      <td className="px-8 py-5 text-base text-gray-500">
                        {post.date}
                      </td>
                      <td className="px-8 py-5 text-base text-gray-500">
                        {post.views}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}