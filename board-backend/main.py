from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
from bson import ObjectId
import jwt
import bcrypt
import random
import string
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import mimetypes

# Unity WebGL을 위한 MIME 타입 설정
mimetypes.add_type('application/wasm', '.wasm')
mimetypes.add_type('application/octet-stream', '.data')
mimetypes.add_type('application/javascript', '.framework.js')
mimetypes.add_type('application/javascript', '.loader.js')

app = FastAPI()

# Custom StaticFiles class with proper MIME types
class UnityStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)

        # Unity WebGL 파일들에 대한 특별 처리
        if path.endswith('.wasm'):
            response.headers['Content-Type'] = 'application/wasm'
        elif path.endswith('.data'):
            response.headers['Content-Type'] = 'application/octet-stream'
        elif path.endswith('.framework.js') or path.endswith('.loader.js'):
            response.headers['Content-Type'] = 'application/javascript'

        # CORS 헤더 추가
        response.headers['Cross-Origin-Embedder-Policy'] = 'require-corp'
        response.headers['Cross-Origin-Opener-Policy'] = 'same-origin'

        return response

# Static 파일 서빙 설정
app.mount("/images", StaticFiles(directory="static/images"), name="images")
app.mount("/games", UnityStaticFiles(directory="static/games", html=True), name="games")

# JWT 설정
SECRET_KEY = "your-secret-key-here-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# 이메일 설정 (Gmail 기준)
EMAIL_HOST = "smtp.gmail.com"
EMAIL_PORT = 587
EMAIL_ADDRESS = "letsgetjob2025@gmail.com"  # 실제 이메일로 변경 필요
EMAIL_PASSWORD = "feysjracnrkmuvfo"  # Gmail 앱 비밀번호로 변경 필요

# 인증 설정
security = HTTPBearer()

# CORS 설정 (React와 통신하기 위해 필요)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite 기본 포트
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB 연결
client = AsyncIOMotorClient("mongodb://localhost:27017")
db = client.board_database
posts_collection = db.posts
users_collection = db.users
comments_collection = db.comments
scores_collection = db.scores

# Pydantic 모델
class User(BaseModel):
    userid: str
    email: str
    password: str
    gender: str
    birthdate: str

class UserLogin(BaseModel):
    userid: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    userid: str
    is_temporary_password: bool = False

class FindUserIdRequest(BaseModel):
    email: str
    birthdate: str

class ResetPasswordRequest(BaseModel):
    userid: str
    email: str
    birthdate: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class UpdateProfileImageRequest(BaseModel):
    profile_image: str

class Post(BaseModel):
    title: str
    author: str
    content: str
    category: str = "Unity 게임"  # "Unity 게임", "Three.js 게임", "시뮬레이터"
    thumbnail: Optional[str] = None
    webgl_path: Optional[str] = None  # WebGL 게임 경로 (예: /games/game1/index.html)
    date: Optional[str] = None
    views: int = 0

class PostUpdate(BaseModel):
    title: str
    content: str

class Comment(BaseModel):
    author: str
    content: str

class GameScore(BaseModel):
    game_name: str
    score: int
    username: str

# 유틸리티 함수
def verify_password(plain_password: str, hashed_password: str) -> bool:
    # 비밀번호 검증
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password: str) -> str:
    # 비밀번호 해싱
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        userid: str = payload.get("sub")
        if userid is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        return userid
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
def is_admin(credentials: HTTPAuthorizationCredentials = Depends(security)) -> bool:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("is_admin", False)
    except:
        return False


def generate_random_password(length: int = 8) -> str:
    # 랜덤 비밀번호 생성 (영문 대소문자, 숫자 조합)
    characters = string.ascii_letters + string.digits
    return ''.join(random.choice(characters) for _ in range(length))

def send_email(to_email: str, subject: str, body: str):
    try:
        # 이메일 메시지 생성
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = EMAIL_ADDRESS
        message["To"] = to_email

        # HTML 본문 추가
        html_part = MIMEText(body, "html")
        message.attach(html_part)

        # SMTP 서버 연결 및 이메일 전송
        with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as server:
            server.starttls()
            server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
            server.send_message(message)

        return True
    except Exception as e:
        print(f"Email sending failed: {e}")
        return False

# ObjectId를 문자열로 변환하는 헬퍼 함수
async def post_helper(post) -> dict:
    # 댓글 수 계산
    comment_count = await comments_collection.count_documents({"post_id": str(post["_id"])})

    # 카테고리별 기본 썸네일 설정
    category = post.get("category", "Unity 게임")
    default_thumbnail = "/images/three.png" if category == "Three.js 게임" else "/images/unity.jpg"

    return {
        "id": str(post["_id"]),
        "title": post["title"],
        "author": post["author"],
        "content": post["content"],
        "category": category,
        "thumbnail": post.get("thumbnail", default_thumbnail),
        "webgl_path": post.get("webgl_path", ""),
        "date": post["date"],
        "views": post["views"],
        "comment_count": comment_count
    }

def comment_helper(comment) -> dict:
    return {
        "id": str(comment["_id"]),
        "post_id": comment["post_id"],
        "author": comment["author"],
        "content": comment["content"],
        "date": comment["date"]
    }

@app.get("/")
async def root():
    return {"message": "Board API Server"}

# 회원가입
@app.post("/api/auth/register")
async def register(user: User):
    # 아이디 중복 체크
    existing_user = await users_collection.find_one({"userid": user.userid})
    if existing_user:
        raise HTTPException(status_code=400, detail="UserID already registered")

    # 이메일 중복 체크
    existing_email = await users_collection.find_one({"email": user.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")

    # 비밀번호 해싱
    hashed_password = get_password_hash(user.password)

    # 사용자 저장
    user_dict = {
        "userid": user.userid,
        "email": user.email,
        "password": hashed_password,
        "gender": user.gender,
        "birthdate": user.birthdate,
        "created_at": datetime.now(),
        "profile_image": "/images/profile.jpg"
    }

    await users_collection.insert_one(user_dict)

    return {"message": "User registered successfully"}

# 로그인
@app.post("/api/auth/login", response_model=Token)
async def login(user: UserLogin):
    # 관리자 계정 처리
    if user.userid == "admin" and user.password == "admin":
        # JWT 토큰 생성 (관리자 플래그 포함)
        access_token = create_access_token(data={"sub": "admin", "is_admin": True})

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "userid": "admin",
            "is_temporary_password": False
        }

    # 사용자 찾기
    db_user = await users_collection.find_one({"userid": user.userid})
    if not db_user:
        raise HTTPException(status_code=401, detail="Incorrect userid or password")

    # 비밀번호 확인
    if not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Incorrect userid or password")

    # JWT 토큰 생성
    access_token = create_access_token(data={"sub": user.userid})

    # 임시 비밀번호 여부 확인
    is_temp_password = db_user.get("is_temporary_password", False)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "userid": user.userid,
        "is_temporary_password": is_temp_password
    }

# 현재 사용자 정보 조회
@app.get("/api/auth/me")
async def get_me(
    userid: str = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    # 관리자 계정 처리
    if userid == "admin" and is_admin(credentials):
        return {
            "userid": "admin",
            "email": "admin@system.com",
            "gender": "",
            "birthdate": "",
            "created_at": "",
            "profile_image": "/images/profile.jpg",
            "is_admin": True
        }

    user = await users_collection.find_one({"userid": userid})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # created_at을 문자열로 변환
    created_at = user.get("created_at", "")
    if created_at and isinstance(created_at, datetime):
        created_at = created_at.isoformat()

    return {
        "userid": user["userid"],
        "email": user["email"],
        "gender": user.get("gender", ""),
        "birthdate": user.get("birthdate", ""),
        "created_at": created_at,
        "profile_image": user.get("profile_image", "/images/profile.jpg"),
        "is_admin": False
    }

# 관리자 권한 확인
@app.get("/api/auth/check-admin")
async def check_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    admin = is_admin(credentials)
    return {"is_admin": admin}


# 아이디 찾기
@app.post("/api/auth/find-userid")
async def find_userid(request: FindUserIdRequest):
    # 이메일과 생년월일로 사용자 찾기
    user = await users_collection.find_one({
        "email": request.email,
        "birthdate": request.birthdate
    })

    if not user:
        raise HTTPException(status_code=404, detail="일치하는 사용자 정보를 찾을 수 없습니다.")

    return {"userid": user["userid"]}

# 비밀번호 초기화
@app.post("/api/auth/reset-password")
async def reset_password(request: ResetPasswordRequest):
    # 아이디, 이메일, 생년월일로 사용자 찾기
    user = await users_collection.find_one({
        "userid": request.userid,
        "email": request.email,
        "birthdate": request.birthdate
    })

    if not user:
        raise HTTPException(status_code=404, detail="일치하는 사용자 정보를 찾을 수 없습니다.")

    # 랜덤 비밀번호 생성
    new_password = generate_random_password(8)

    # 이메일 전송
    subject = "[게시판] 비밀번호 초기화 안내"
    body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #4A90E2; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
            .content {{ background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }}
            .password-box {{ background-color: white; padding: 15px; border: 2px solid #4A90E2; border-radius: 5px; margin: 20px 0; text-align: center; font-size: 24px; font-weight: bold; color: #4A90E2; letter-spacing: 2px; }}
            .notice {{ background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>비밀번호 초기화 안내</h1>
            </div>
            <div class="content">
                <p>안녕하세요, <strong>{request.userid}</strong>님</p>
                <p>비밀번호 초기화 요청에 따라 임시 비밀번호를 발급해 드립니다.</p>

                <div class="password-box">
                    {new_password}
                </div>

                <div class="notice">
                    <strong>⚠️ 보안 안내</strong>
                    <ul style="margin: 10px 0;">
                        <li>위 임시 비밀번호로 로그인하신 후, 반드시 비밀번호를 변경해 주세요.</li>
                        <li>비밀번호는 타인에게 절대 노출하지 마시기 바랍니다.</li>
                        <li>본인이 요청하지 않은 경우, 즉시 고객센터로 문의해 주세요.</li>
                    </ul>
                </div>

                <p>감사합니다.</p>
            </div>
            <div class="footer">
                <p>본 메일은 발신 전용입니다. 문의사항은 고객센터를 이용해 주세요.</p>
                <p>&copy; 2025 게시판 서비스. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """

    # 이메일 전송 시도
    email_sent = send_email(request.email, subject, body)

    if not email_sent:
        # 이메일 전송 실패 시 비밀번호 변경하지 않고 에러 반환
        raise HTTPException(status_code=500, detail="이메일 전송에 실패했습니다. 잠시 후 다시 시도해주세요.")

    # 이메일 전송 성공 후에만 비밀번호 업데이트 및 임시 비밀번호 플래그 설정
    hashed_password = get_password_hash(new_password)
    await users_collection.update_one(
        {"userid": request.userid},
        {"$set": {"password": hashed_password, "is_temporary_password": True}}
    )

    return {"message": "초기화 비밀번호를 입력하신 이메일로 보내드렸습니다."}

# 비밀번호 변경
@app.post("/api/auth/change-password")
async def change_password(request: ChangePasswordRequest, userid: str = Depends(get_current_user)):
    # 현재 사용자 찾기
    user = await users_collection.find_one({"userid": userid})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 현재 비밀번호 확인
    if not verify_password(request.current_password, user["password"]):
        raise HTTPException(status_code=400, detail="현재 비밀번호가 일치하지 않습니다.")

    # 새 비밀번호 해싱 및 업데이트, 임시 비밀번호 플래그 해제
    hashed_password = get_password_hash(request.new_password)
    await users_collection.update_one(
        {"userid": userid},
        {"$set": {"password": hashed_password, "is_temporary_password": False}}
    )

    return {"message": "비밀번호가 성공적으로 변경되었습니다."}

# 게시글 목록 조회
@app.get("/api/posts")
async def get_posts():
    posts = []
    async for post in posts_collection.find().sort("_id", -1):
        posts.append(await post_helper(post))
    return posts

# 게시글 상세 조회 (조회수 증가)
@app.get("/api/posts/{post_id}")
async def get_post(post_id: str):
    post = await posts_collection.find_one({"_id": ObjectId(post_id)})
    if post:
        # 조회수 증가
        await posts_collection.update_one(
            {"_id": ObjectId(post_id)},
            {"$inc": {"views": 1}}
        )
        post["views"] += 1
        return await post_helper(post)
    raise HTTPException(status_code=404, detail="Post not found")

# 게시글 작성
@app.post("/api/posts")
async def create_post(post: Post):
    post_dict = post.dict()
    post_dict["date"] = datetime.now().strftime("%Y-%m-%d")
    post_dict["views"] = 0
    result = await posts_collection.insert_one(post_dict)
    new_post = await posts_collection.find_one({"_id": result.inserted_id})
    return await post_helper(new_post)

# 게시글 수정
@app.put("/api/posts/{post_id}")
async def update_post(
    post_id: str,
    post: PostUpdate,
    userid: str = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    # 게시글 찾기
    existing_post = await posts_collection.find_one({"_id": ObjectId(post_id)})
    if not existing_post:
        raise HTTPException(status_code=404, detail="Post not found")

    # 권한 확인 (작성자 본인 또는 관리자)
    admin = is_admin(credentials)
    if existing_post["author"] != userid and not admin:
        raise HTTPException(status_code=403, detail="수정 권한이 없습니다.")

    await posts_collection.update_one(
        {"_id": ObjectId(post_id)},
        {"$set": {"title": post.title, "content": post.content}}
    )
    updated_post = await posts_collection.find_one({"_id": ObjectId(post_id)})
    if updated_post:
        return await post_helper(updated_post)
    raise HTTPException(status_code=404, detail="Post not found")

# 게시글 삭제
@app.delete("/api/posts/{post_id}")
async def delete_post(
    post_id: str,
    userid: str = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    # 게시글 찾기
    existing_post = await posts_collection.find_one({"_id": ObjectId(post_id)})
    if not existing_post:
        raise HTTPException(status_code=404, detail="Post not found")

    # 권한 확인 (작성자 본인 또는 관리자)
    admin = is_admin(credentials)
    if existing_post["author"] != userid and not admin:
        raise HTTPException(status_code=403, detail="삭제 권한이 없습니다.")

    result = await posts_collection.delete_one({"_id": ObjectId(post_id)})
    if result.deleted_count:
        # 해당 게시글의 댓글도 모두 삭제
        await comments_collection.delete_many({"post_id": post_id})
        return {"message": "Post deleted successfully"}
    raise HTTPException(status_code=404, detail="Post not found")

# 댓글 목록 조회
@app.get("/api/posts/{post_id}/comments")
async def get_comments(post_id: str):
    comments = []
    async for comment in comments_collection.find({"post_id": post_id}).sort("_id", 1):
        comments.append(comment_helper(comment))
    return comments

# 댓글 작성
@app.post("/api/posts/{post_id}/comments")
async def create_comment(post_id: str, comment: Comment):
    # 게시글 존재 확인
    post = await posts_collection.find_one({"_id": ObjectId(post_id)})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    comment_dict = {
        "post_id": post_id,
        "author": comment.author,
        "content": comment.content,
        "date": datetime.now().strftime("%Y-%m-%d %H:%M")
    }
    result = await comments_collection.insert_one(comment_dict)
    new_comment = await comments_collection.find_one({"_id": result.inserted_id})
    return comment_helper(new_comment)

# 댓글 삭제
@app.delete("/api/comments/{comment_id}")
async def delete_comment(
    comment_id: str,
    userid: str = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    # 댓글 찾기
    existing_comment = await comments_collection.find_one({"_id": ObjectId(comment_id)})
    if not existing_comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    # 권한 확인 (작성자 본인 또는 관리자)
    admin = is_admin(credentials)
    if existing_comment["author"] != userid and not admin:
        raise HTTPException(status_code=403, detail="삭제 권한이 없습니다.")

    result = await comments_collection.delete_one({"_id": ObjectId(comment_id)})
    if result.deleted_count:
        return {"message": "Comment deleted successfully"}
    raise HTTPException(status_code=404, detail="Comment not found")

# 게임 스코어 저장
@app.post("/api/scores")
async def save_score(score_data: GameScore, userid: str = Depends(get_current_user)):
    # 사용자 인증 확인 (토큰의 userid와 요청의 username이 일치하는지)
    if score_data.username != userid:
        raise HTTPException(status_code=403, detail="본인의 점수만 저장할 수 있습니다.")

    score_dict = {
        "game_name": score_data.game_name,
        "score": score_data.score,
        "username": score_data.username,
        "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

    result = await scores_collection.insert_one(score_dict)

    if result.inserted_id:
        return {"message": "Score saved successfully", "score_id": str(result.inserted_id)}
    raise HTTPException(status_code=500, detail="Failed to save score")

# 게임별 스코어보드 조회 (상위 10개)
@app.get("/api/scores/{game_name}")
async def get_scoreboard(game_name: str, limit: int = 10):
    scores = []
    async for score in scores_collection.find({"game_name": game_name}).sort("score", -1).limit(limit):
        scores.append({
            "id": str(score["_id"]),
            "username": score["username"],
            "score": score["score"],
            "date": score["date"]
        })
    return scores

# 사용자별 게임 스코어 조회
@app.get("/api/scores/user/{username}")
async def get_user_scores(username: str):
    scores = []
    async for score in scores_collection.find({"username": username}).sort("date", -1):
        scores.append({
            "id": str(score["_id"]),
            "game_name": score["game_name"],
            "score": score["score"],
            "date": score["date"]
        })
    return scores

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)