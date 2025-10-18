from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
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

app = FastAPI()

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

class Post(BaseModel):
    title: str
    author: str
    content: str
    date: Optional[str] = None
    views: int = 0

class PostUpdate(BaseModel):
    title: str
    content: str

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
def post_helper(post) -> dict:
    return {
        "id": str(post["_id"]),
        "title": post["title"],
        "author": post["author"],
        "content": post["content"],
        "date": post["date"],
        "views": post["views"]
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
        "created_at": datetime.now()
    }

    await users_collection.insert_one(user_dict)

    return {"message": "User registered successfully"}

# 로그인
@app.post("/api/auth/login", response_model=Token)
async def login(user: UserLogin):
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
async def get_me(userid: str = Depends(get_current_user)):
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
        "created_at": created_at
    }

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
        posts.append(post_helper(post))
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
        return post_helper(post)
    raise HTTPException(status_code=404, detail="Post not found")

# 게시글 작성
@app.post("/api/posts")
async def create_post(post: Post):
    post_dict = post.dict()
    post_dict["date"] = datetime.now().strftime("%Y-%m-%d")
    post_dict["views"] = 0
    result = await posts_collection.insert_one(post_dict)
    new_post = await posts_collection.find_one({"_id": result.inserted_id})
    return post_helper(new_post)

# 게시글 수정
@app.put("/api/posts/{post_id}")
async def update_post(post_id: str, post: PostUpdate):
    await posts_collection.update_one(
        {"_id": ObjectId(post_id)},
        {"$set": {"title": post.title, "content": post.content}}
    )
    updated_post = await posts_collection.find_one({"_id": ObjectId(post_id)})
    if updated_post:
        return post_helper(updated_post)
    raise HTTPException(status_code=404, detail="Post not found")

# 게시글 삭제
@app.delete("/api/posts/{post_id}")
async def delete_post(post_id: str):
    result = await posts_collection.delete_one({"_id": ObjectId(post_id)})
    if result.deleted_count:
        return {"message": "Post deleted successfully"}
    raise HTTPException(status_code=404, detail="Post not found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)