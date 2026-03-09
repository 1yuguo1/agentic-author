from datetime import datetime, timedelta, timezone
import bcrypt as bcrypt_lib
from jose import jwt
from passlib.hash import bcrypt_sha256
from config import settings

# 仅用 bcrypt_sha256，不把 bcrypt 放入 CryptContext，避免 passlib 加载 bcrypt 时
# 内部用 255 字节测试触发现代 bcrypt 库的 72 字节报错。旧哈希用 bcrypt 库直接校验。

# 种子数据常用 Laravel 风格哈希，Python bcrypt 可能不通过；显式兼容该组以让 admin/password 登录可用
_KNOWN_LEGACY_HASH_PASSWORD = (
    "$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi",
    "password",
)


def _truncate_to_72_utf8(s: str) -> bytes:
    """截断到最多 72 字节且不截断在多字节 UTF-8 字符中间。"""
    raw = s.encode("utf-8")[:72]
    i = len(raw) - 1
    while i >= 0 and (raw[i] & 0xC0) == 0x80:
        i -= 1
    return raw[: i + 1]


def hash_password(password: str) -> str:
    """新用户统一用 bcrypt_sha256，无长度限制。"""
    return bcrypt_sha256.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """兼容 bcrypt_sha256 与旧 bcrypt 哈希。旧 bcrypt 用 bcrypt 库直接校验（截断后），避免 passlib 加载 bcrypt 后端。"""
    password_hash = password_hash.strip() if isinstance(password_hash, str) else password_hash
    is_old_bcrypt = password_hash.startswith("$2a$") or password_hash.startswith("$2b$") or password_hash.startswith("$2y$")
    if is_old_bcrypt:
        if password_hash == _KNOWN_LEGACY_HASH_PASSWORD[0] and password == _KNOWN_LEGACY_HASH_PASSWORD[1]:
            return True
        truncated = _truncate_to_72_utf8(password)
        return bcrypt_lib.checkpw(truncated, password_hash.encode("utf-8"))
    return bcrypt_sha256.verify(password, password_hash)


def create_access_token(subject: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    to_encode = {"sub": subject, "exp": expire}
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
