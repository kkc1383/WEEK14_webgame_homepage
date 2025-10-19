import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:8000/api';

export default function Board({ user, onLogout, onMyPage }) {
  const [posts, setPosts] = useState([]);
  const [view, setView] = useState('list');
  const [selectedPost, setSelectedPost] = useState(null);
  const [formData, setFormData] = useState({ title: '', content: '', category: 'Unity 게임', webgl_path: '' });
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentContent, setCommentContent] = useState('');
  const [profileImage, setProfileImage] = useState('/images/profile.jpg');

  const categories = ['Unity 게임', 'Three.js 게임', '시뮬레이터'];

  // 게시글 목록 및 사용자 정보 불러오기
  useEffect(() => {
    fetchPosts();
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setProfileImage(data.profile_image || '/images/profile.jpg');
      } else if (response.status === 401) {
        // 토큰이 유효하지 않으면 로그아웃 처리
        alert('세션이 만료되었습니다. 로그인을 다시 해주세요.');
        onLogout(false); // 메시지를 이미 표시했으므로 중복 메시지 방지
      }
    } catch (error) {
      console.error('프로필 정보 불러오기 실패:', error);
    }
  };

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
      // 댓글 불러오기
      fetchComments(post.id);
    } catch (error) {
      console.error('게시글 조회 실패:', error);
      alert('게시글을 불러오는데 실패했습니다.');
    }
  };

  const fetchComments = async (postId) => {
    try {
      const response = await fetch(`${API_URL}/posts/${postId}/comments`);
      const data = await response.json();
      setComments(data);
    } catch (error) {
      console.error('댓글 불러오기 실패:', error);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentContent.trim()) return;

    try {
      const response = await fetch(`${API_URL}/posts/${selectedPost.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          author: user,
          content: commentContent
        }),
      });

      if (response.ok) {
        setCommentContent('');
        fetchComments(selectedPost.id);
        fetchPosts(); // 댓글 수 업데이트
      } else {
        alert('댓글 작성에 실패했습니다.');
      }
    } catch (error) {
      console.error('댓글 작성 실패:', error);
      alert('댓글 작성에 실패했습니다.');
    }
  };

  const handleCommentDelete = async (commentId) => {
    if (window.confirm('댓글을 삭제하시겠습니까?')) {
      try {
        const response = await fetch(`${API_URL}/comments/${commentId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          fetchComments(selectedPost.id);
          fetchPosts(); // 댓글 수 업데이트
        } else {
          alert('댓글 삭제에 실패했습니다.');
        }
      } catch (error) {
        console.error('댓글 삭제 실패:', error);
        alert('댓글 삭제에 실패했습니다.');
      }
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      // webgl_path 처리: 폴더명만 입력된 경우 전체 경로로 변환
      let webglPath = formData.webgl_path.trim();
      if (webglPath && !webglPath.includes('/index.html')) {
        webglPath = `/games/${webglPath}/index.html`;
      }

      const postData = {
        ...formData,
        webgl_path: webglPath,
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
        setFormData({ title: '', content: '', category: 'Unity 게임', webgl_path: '' });
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
        setFormData({ title: '', content: '', category: 'Unity 게임', webgl_path: '' });
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
            {!editMode && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  카테고리
                </label>
                <input
                  type="text"
                  value={formData.category}
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 rounded-md bg-gray-100 text-gray-700 cursor-not-allowed text-base"
                />
              </div>
            )}
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
            <div className="mb-4">
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
            {!editMode && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  WebGL 게임 폴더명 (선택사항)
                </label>
                <input
                  type="text"
                  value={formData.webgl_path}
                  onChange={(e) => setFormData({...formData, webgl_path: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                  placeholder="예: alicepang"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Unity WebGL 빌드를 board-backend/static/games/ 폴더에 업로드한 후 폴더명만 입력하세요 (예: alicepang)
                </p>
              </div>
            )}
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
                  setFormData({ title: '', content: '', category: 'Unity 게임', webgl_path: '' });
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
              <span>댓글: {comments.length}</span>
            </div>
          </div>

          {/* WebGL 게임 - 위로 이동 */}
          {selectedPost.webgl_path && (
            <div className="px-8 py-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">게임 플레이</h3>
              <div className="flex justify-center bg-gray-900 py-6 rounded-lg">
                <iframe
                  src={`http://localhost:8000${selectedPost.webgl_path}`}
                  width="270"
                  height="570"
                  title="WebGL Game"
                  allowFullScreen
                  style={{ border: 'none', maxWidth: '100%' }}
                />
              </div>
              <p className="mt-2 text-sm text-gray-500 text-center">
                권장 해상도: 1080x2280 (25% 스케일로 표시)
              </p>
            </div>
          )}

          {/* 게시글 본문 - 아래로 이동 */}
          <div className="px-8 py-10 border-t border-gray-200">
            <h3 className="text-xl font-bold text-gray-800 mb-4">게임 설명</h3>
            <p className="text-gray-700 whitespace-pre-wrap text-base leading-relaxed">{selectedPost.content}</p>
          </div>

          {/* 댓글 섹션 */}
          <div className="border-t border-gray-200 px-8 py-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">댓글 {comments.length}개</h3>

            {/* 댓글 작성 폼 */}
            <form onSubmit={handleCommentSubmit} className="mb-6">
              <textarea
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder="댓글을 입력하세요"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base resize-none"
                rows="3"
              />
              <div className="flex justify-end mt-2">
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-base font-medium"
                >
                  댓글 작성
                </button>
              </div>
            </form>

            {/* 댓글 목록 */}
            <div className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-gray-500 text-center py-8">첫 댓글을 작성해보세요!</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="border-b border-gray-100 pb-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-gray-800">{comment.author}</span>
                        <span className="text-sm text-gray-500">{comment.date}</span>
                      </div>
                      {comment.author === user && (
                        <button
                          onClick={() => handleCommentDelete(comment.id)}
                          className="text-sm text-red-500 hover:text-red-700"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                    <p className="text-gray-700 text-base whitespace-pre-wrap">{comment.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 px-8 py-6 flex gap-2">
            <button
              onClick={() => setView('list')}
              className="px-6 py-3 bg-gray-500 text-white rounded hover:bg-gray-600 text-base font-medium"
            >
              목록
            </button>
            {selectedPost.author === user && (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-8">
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200 px-8 py-6 flex justify-end items-center">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <img
                src={profileImage}
                alt="프로필"
                className="w-10 h-10 rounded-full object-cover"
                onError={(e) => {
                  e.target.src = '/images/profile.jpg';
                }}
              />
              <span className="text-gray-700">
                환영합니다, <span className="font-semibold">{user}</span>님
              </span>
            </div>
            <button
              onClick={onMyPage}
              className="px-6 py-3 bg-green-500 text-white rounded hover:bg-green-600 text-base font-medium"
            >
              마이페이지
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
          <div className="p-8 pt-12 space-y-16">
            {posts.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                게시글이 없습니다.
              </div>
            ) : (
              categories.map((category) => {
                const categoryPosts = posts.filter(post => post.category === category);
                if (categoryPosts.length === 0) return null;

                return (
                  <div key={category}>
                    {/* 카테고리 제목 */}
                    <div className="mb-6 flex items-center justify-between">
                      <div className="flex-1">
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">{category}</h2>
                        <div className="w-full h-px bg-gray-300"></div>
                      </div>
                      <button
                        onClick={() => {
                          setFormData({ title: '', content: '', category: category, webgl_path: '' });
                          setView('form');
                        }}
                        className="ml-4 px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 text-base font-medium whitespace-nowrap"
                      >
                        글쓰기
                      </button>
                    </div>

                    {/* 게시글 그리드 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {categoryPosts.map((post) => (
                        <div
                          key={post.id}
                          onClick={() => handlePostClick(post)}
                          className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                        >
                          {/* 썸네일 이미지 */}
                          <div className="aspect-video w-full bg-gray-100 overflow-hidden">
                            <img
                              src={post.thumbnail || (post.category === 'Three.js 게임' ? '/images/three.png' : '/images/unity.jpg')}
                              alt={post.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                e.target.src = post.category === 'Three.js 게임' ? '/images/three.png' : '/images/unity.jpg';
                              }}
                            />
                          </div>

                          {/* 게시글 정보 */}
                          <div className="p-4">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                              {post.title}
                            </h3>
                            <div className="flex items-center justify-between text-sm text-gray-500">
                              <span>{post.author}</span>
                              <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                  </svg>
                                  {post.comment_count || 0}
                                </span>
                                <span className="flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  {post.views}
                                </span>
                              </div>
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {post.date}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}