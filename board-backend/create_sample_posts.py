import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime

# MongoDB 연결
client = AsyncIOMotorClient("mongodb://localhost:27017")
db = client.board_database
posts_collection = db.posts

async def create_sample_posts():
    # 기존 게시물 삭제
    await posts_collection.delete_many({})

    # 샘플 게시물 데이터
    sample_posts = [
        # Unity 게임 (4개)
        {
            "title": "좀비 서바이벌",
            "author": "강경찬",
            "content": "밤에만 나타나는 좀비들로부터 살아남는 3D 서바이벌 게임입니다. 자원을 수집하고 무기를 제작하여 생존하세요!",
            "category": "Unity 게임",
            "thumbnail": "https://via.placeholder.com/400x225/1a1a2e/16213e?text=Zombie+Survival",
            "date": "2024-01-15",
            "views": 156
        },
        {
            "title": "레이싱 챔피언",
            "author": "강경찬",
            "content": "다양한 트랙에서 펼쳐지는 짜릿한 레이싱 게임! 차량을 커스터마이징하고 최고 속도를 경험하세요.",
            "category": "Unity 게임",
            "thumbnail": "https://via.placeholder.com/400x225/ff6b6b/c92a2a?text=Racing+Champion",
            "date": "2024-01-14",
            "views": 203
        },
        {
            "title": "판타지 RPG",
            "author": "강경찬",
            "content": "마법과 검이 공존하는 판타지 세계를 모험하는 RPG 게임입니다. 퀘스트를 완료하고 강력한 아이템을 획득하세요!",
            "category": "Unity 게임",
            "thumbnail": "https://via.placeholder.com/400x225/4ecdc4/1a535c?text=Fantasy+RPG",
            "date": "2024-01-13",
            "views": 312
        },
        {
            "title": "우주 디펜스",
            "author": "강경찬",
            "content": "외계 침략자로부터 지구를 지키는 타워 디펜스 게임! 전략적으로 타워를 배치하고 적을 물리치세요.",
            "category": "Unity 게임",
            "thumbnail": "https://via.placeholder.com/400x225/95e1d3/38ada9?text=Space+Defense",
            "date": "2024-01-12",
            "views": 187
        },

        # Three.js 게임 (4개)
        {
            "title": "버블 슈터",
            "author": "강경찬",
            "content": "같은 색깔의 버블을 맞춰 터뜨리는 중독성 있는 퍼즐 게임! 높은 점수를 달성하고 친구들과 경쟁하세요.",
            "category": "Three.js 게임",
            "thumbnail": "https://via.placeholder.com/400x225/feca57/ee5a6f?text=Bubble+Shooter",
            "date": "2024-01-11",
            "views": 421
        },
        {
            "title": "3D 큐브 퍼즐",
            "author": "강경찬",
            "content": "3차원 공간에서 펼쳐지는 두뇌 게임! 큐브를 회전시켜 같은 색을 맞추는 챌린징한 퍼즐 게임입니다.",
            "category": "Three.js 게임",
            "thumbnail": "https://via.placeholder.com/400x225/48dbfb/0abde3?text=3D+Cube+Puzzle",
            "date": "2024-01-10",
            "views": 267
        },
        {
            "title": "미로 탈출",
            "author": "강경찬",
            "content": "복잡한 3D 미로에서 출구를 찾아 탈출하는 게임! 시간 제한 내에 골인 지점을 찾으세요.",
            "category": "Three.js 게임",
            "thumbnail": "https://via.placeholder.com/400x225/ff9ff3/f368e0?text=Maze+Escape",
            "date": "2024-01-09",
            "views": 198
        },
        {
            "title": "파티클 슈팅",
            "author": "강경찬",
            "content": "화려한 파티클 이펙트로 가득한 슈팅 게임! 적을 피하고 공격하며 최고 점수에 도전하세요.",
            "category": "Three.js 게임",
            "thumbnail": "https://via.placeholder.com/400x225/54a0ff/2e86de?text=Particle+Shooting",
            "date": "2024-01-08",
            "views": 345
        },

        # 시뮬레이터 (4개)
        {
            "title": "농장 시뮬레이터",
            "author": "강경찬",
            "content": "직접 농장을 운영하며 작물을 재배하고 동물을 키우는 힐링 게임! 나만의 농장을 만들어보세요.",
            "category": "시뮬레이터",
            "thumbnail": "https://via.placeholder.com/400x225/7bed9f/2bcbba?text=Farm+Simulator",
            "date": "2024-01-07",
            "views": 523
        },
        {
            "title": "비행 시뮬레이터",
            "author": "강경찬",
            "content": "실제 비행기를 조종하는 듯한 리얼한 비행 시뮬레이션! 다양한 항공기를 조종하고 전 세계를 여행하세요.",
            "category": "시뮬레이터",
            "thumbnail": "https://via.placeholder.com/400x225/5f27cd/341f97?text=Flight+Simulator",
            "date": "2024-01-06",
            "views": 612
        },
        {
            "title": "요리 시뮬레이터",
            "author": "강경찬",
            "content": "레스토랑 셰프가 되어 다양한 요리를 만드는 게임! 레시피를 배우고 완벽한 요리를 완성하세요.",
            "category": "시뮬레이터",
            "thumbnail": "https://via.placeholder.com/400x225/ff6348/ff4757?text=Cooking+Simulator",
            "date": "2024-01-05",
            "views": 434
        },
        {
            "title": "건설 시뮬레이터",
            "author": "강경찬",
            "content": "중장비를 운전하며 건물을 짓는 시뮬레이션 게임! 정교한 조작으로 프로젝트를 완성하세요.",
            "category": "시뮬레이터",
            "thumbnail": "https://via.placeholder.com/400x225/ffa502/ff6348?text=Construction+Simulator",
            "date": "2024-01-04",
            "views": 289
        }
    ]

    # 게시물 삽입
    result = await posts_collection.insert_many(sample_posts)
    print(f"[OK] {len(result.inserted_ids)}개의 샘플 게시물이 생성되었습니다!")

    # 카테고리별 개수 확인
    for category in ["Unity 게임", "Three.js 게임", "시뮬레이터"]:
        count = await posts_collection.count_documents({"category": category})
        print(f"   - {category}: {count}개")

if __name__ == "__main__":
    asyncio.run(create_sample_posts())
    print("\n완료!")
