import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import List, Optional, AsyncGenerator

from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse, FileResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
import bcrypt
import jwt

from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

# ---------- Setup ----------
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
EMERGENT_LLM_KEY = os.environ['EMERGENT_LLM_KEY']
JWT_SECRET = os.environ['JWT_SECRET']
JWT_EXPIRE_DAYS = int(os.environ.get('JWT_EXPIRE_DAYS', '30'))
JWT_ALGO = 'HS256'

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="js.AI API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

SYSTEM_PROMPT = (
    "Eres js.AI, un agente experto en la creación de aplicaciones. "
    "Ayudas a los usuarios a construir apps generando código (HTML, CSS, JavaScript, React, React Native), "
    "explicando conceptos de desarrollo, sugiriendo arquitecturas y respondiendo dudas técnicas. "
    "Cuando generes código, envuélvelo siempre en bloques ```lenguaje ... ```. "
    "Responde en el mismo idioma en que te habla el usuario (español o inglés). "
    "Sé conciso, claro y práctico."
)

# ---------- Models ----------
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1, max_length=80)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserPublic(BaseModel):
    id: str
    email: str
    name: str

class AuthResponse(BaseModel):
    token: str
    user: UserPublic

class ChatCreate(BaseModel):
    title: Optional[str] = None

class ChatOut(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str

class MessageOut(BaseModel):
    id: str
    role: str
    content: str
    created_at: str

class SendMessageIn(BaseModel):
    content: str

class RenameChatIn(BaseModel):
    title: str

# ---------- Auth utils ----------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False

def create_token(user_id: str) -> str:
    payload = {
        'sub': user_id,
        'exp': datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS),
        'iat': datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

async def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> dict:
    if not creds:
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGO])
        user_id = payload['sub']
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

# ---------- Health ----------
@api_router.get("/")
async def root():
    return {"message": "js.AI API", "status": "ok"}

# ---------- Project source download (dev convenience) ----------
@api_router.get("/download/source")
async def download_source():
    zip_path = ROOT_DIR / "jsai-project.zip"
    if not zip_path.exists():
        raise HTTPException(status_code=404, detail="Zip no encontrado")
    return FileResponse(
        path=str(zip_path),
        media_type="application/zip",
        filename="jsai-project.zip",
    )

# ---------- Auth endpoints ----------
@api_router.post("/auth/register", response_model=AuthResponse)
async def register(data: UserRegister):
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Este correo ya está registrado")

    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": data.email.lower(),
        "name": data.name.strip(),
        "password_hash": hash_password(data.password),
        "created_at": now_iso(),
    }
    await db.users.insert_one(user_doc)

    token = create_token(user_id)
    return AuthResponse(
        token=token,
        user=UserPublic(id=user_id, email=user_doc["email"], name=user_doc["name"]),
    )

@api_router.post("/auth/login", response_model=AuthResponse)
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email.lower()})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    token = create_token(user["id"])
    return AuthResponse(
        token=token,
        user=UserPublic(id=user["id"], email=user["email"], name=user["name"]),
    )

@api_router.get("/auth/me", response_model=UserPublic)
async def me(user: dict = Depends(get_current_user)):
    return UserPublic(id=user["id"], email=user["email"], name=user["name"])

# ---------- Chats ----------
@api_router.get("/chats", response_model=List[ChatOut])
async def list_chats(user: dict = Depends(get_current_user)):
    cursor = db.chats.find({"user_id": user["id"]}, {"_id": 0}).sort("updated_at", -1)
    chats = await cursor.to_list(200)
    return [ChatOut(id=c["id"], title=c["title"], created_at=c["created_at"], updated_at=c["updated_at"]) for c in chats]

@api_router.post("/chats", response_model=ChatOut)
async def create_chat(data: ChatCreate, user: dict = Depends(get_current_user)):
    chat_id = str(uuid.uuid4())
    ts = now_iso()
    doc = {
        "id": chat_id,
        "user_id": user["id"],
        "title": (data.title or "Nuevo chat").strip()[:80],
        "created_at": ts,
        "updated_at": ts,
    }
    await db.chats.insert_one(doc)
    return ChatOut(id=doc["id"], title=doc["title"], created_at=ts, updated_at=ts)

@api_router.get("/chats/{chat_id}/messages", response_model=List[MessageOut])
async def get_messages(chat_id: str, user: dict = Depends(get_current_user)):
    chat = await db.chats.find_one({"id": chat_id, "user_id": user["id"]}, {"_id": 0})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat no encontrado")
    cursor = db.messages.find({"chat_id": chat_id}, {"_id": 0}).sort("created_at", 1)
    msgs = await cursor.to_list(1000)
    return [MessageOut(id=m["id"], role=m["role"], content=m["content"], created_at=m["created_at"]) for m in msgs]

@api_router.patch("/chats/{chat_id}", response_model=ChatOut)
async def rename_chat(chat_id: str, data: RenameChatIn, user: dict = Depends(get_current_user)):
    ts = now_iso()
    result = await db.chats.find_one_and_update(
        {"id": chat_id, "user_id": user["id"]},
        {"$set": {"title": data.title.strip()[:80], "updated_at": ts}},
        return_document=True,
        projection={"_id": 0},
    )
    if not result:
        raise HTTPException(status_code=404, detail="Chat no encontrado")
    return ChatOut(id=result["id"], title=result["title"], created_at=result["created_at"], updated_at=result["updated_at"])

@api_router.delete("/chats/{chat_id}")
async def delete_chat(chat_id: str, user: dict = Depends(get_current_user)):
    chat = await db.chats.find_one({"id": chat_id, "user_id": user["id"]})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat no encontrado")
    await db.chats.delete_one({"id": chat_id})
    await db.messages.delete_many({"chat_id": chat_id})
    return {"ok": True}

# ---------- Send message with streaming ----------
async def _build_history_for_llm(chat_id: str) -> List[dict]:
    cursor = db.messages.find({"chat_id": chat_id}, {"_id": 0}).sort("created_at", 1)
    msgs = await cursor.to_list(1000)
    return msgs

@api_router.post("/chats/{chat_id}/messages")
async def send_message(chat_id: str, data: SendMessageIn, user: dict = Depends(get_current_user)):
    chat = await db.chats.find_one({"id": chat_id, "user_id": user["id"]}, {"_id": 0})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat no encontrado")

    # Save user message
    user_msg = {
        "id": str(uuid.uuid4()),
        "chat_id": chat_id,
        "role": "user",
        "content": data.content,
        "created_at": now_iso(),
    }
    await db.messages.insert_one(dict(user_msg))

    # Load prior history to seed the LlmChat (it maintains context internally after seed)
    prior = await _build_history_for_llm(chat_id)
    # exclude the message we just inserted so we can send it fresh
    prior = [m for m in prior if m["id"] != user_msg["id"]]

    chat_instance = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=chat_id,
        system_message=SYSTEM_PROMPT,
    ).with_model("openai", "gpt-5.4")

    # Replay history quickly (non-streaming) so the model has context
    for m in prior:
        if m["role"] == "user":
            try:
                await chat_instance.send_message(UserMessage(text=m["content"]))
            except Exception as e:
                logging.warning(f"history replay error: {e}")

    assistant_msg_id = str(uuid.uuid4())
    assistant_created = now_iso()

    async def event_gen() -> AsyncGenerator[bytes, None]:
        collected = []
        # Send initial metadata event
        yield f"data: {{\"type\":\"meta\",\"user_message_id\":\"{user_msg['id']}\",\"assistant_message_id\":\"{assistant_msg_id}\"}}\n\n".encode('utf-8')
        try:
            async for ev in chat_instance.stream_message(UserMessage(text=data.content)):
                if isinstance(ev, TextDelta):
                    collected.append(ev.content)
                    # SSE requires escaping newlines - use JSON string encoding
                    import json as _json
                    payload = _json.dumps({"type": "delta", "content": ev.content})
                    yield f"data: {payload}\n\n".encode('utf-8')
                elif isinstance(ev, StreamDone):
                    break
        except Exception as e:
            logging.error(f"stream error: {e}")
            import json as _json
            yield f"data: {_json.dumps({'type':'error','message':str(e)})}\n\n".encode('utf-8')

        full = "".join(collected)
        # Persist assistant message
        await db.messages.insert_one({
            "id": assistant_msg_id,
            "chat_id": chat_id,
            "role": "assistant",
            "content": full,
            "created_at": assistant_created,
        })
        # Update chat updated_at and auto-title if needed
        update = {"updated_at": now_iso()}
        if chat.get("title") in (None, "", "Nuevo chat"):
            update["title"] = data.content.strip()[:60]
        await db.chats.update_one({"id": chat_id}, {"$set": update})

        yield f"data: {{\"type\":\"done\"}}\n\n".encode('utf-8')

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )

# Non-streaming fallback used by mobile client (simpler than SSE on RN)
@api_router.post("/chats/{chat_id}/messages/sync", response_model=MessageOut)
async def send_message_sync(chat_id: str, data: SendMessageIn, user: dict = Depends(get_current_user)):
    chat = await db.chats.find_one({"id": chat_id, "user_id": user["id"]}, {"_id": 0})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat no encontrado")

    user_msg = {
        "id": str(uuid.uuid4()),
        "chat_id": chat_id,
        "role": "user",
        "content": data.content,
        "created_at": now_iso(),
    }
    await db.messages.insert_one(dict(user_msg))

    prior = await _build_history_for_llm(chat_id)
    prior = [m for m in prior if m["id"] != user_msg["id"]]

    chat_instance = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=chat_id,
        system_message=SYSTEM_PROMPT,
    ).with_model("openai", "gpt-5.4")

    for m in prior:
        if m["role"] == "user":
            try:
                await chat_instance.send_message(UserMessage(text=m["content"]))
            except Exception as e:
                logging.warning(f"history replay error: {e}")

    try:
        response_text = await chat_instance.send_message(UserMessage(text=data.content))
    except Exception as e:
        logging.error(f"LLM error: {e}")
        raise HTTPException(status_code=500, detail=f"Error del modelo: {e}")

    assistant_id = str(uuid.uuid4())
    assistant_created = now_iso()
    await db.messages.insert_one({
        "id": assistant_id,
        "chat_id": chat_id,
        "role": "assistant",
        "content": response_text,
        "created_at": assistant_created,
    })

    update = {"updated_at": now_iso()}
    if chat.get("title") in (None, "", "Nuevo chat"):
        update["title"] = data.content.strip()[:60]
    await db.chats.update_one({"id": chat_id}, {"$set": update})

    return MessageOut(id=assistant_id, role="assistant", content=response_text, created_at=assistant_created)


# ---------- Include router + CORS ----------
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
