import json
import os
import hashlib
import secrets
import psycopg2


INIT_TABLES = [
    ("CREATE TABLE IF NOT EXISTS users ("
     "id SERIAL PRIMARY KEY, username VARCHAR(50) UNIQUE NOT NULL, name VARCHAR(100) NOT NULL,"
     "password_hash VARCHAR(255) NOT NULL, emoji VARCHAR(20) DEFAULT 'smile',"
     "token VARCHAR(255), online BOOLEAN DEFAULT false,"
     "last_seen TIMESTAMP DEFAULT NOW(), created_at TIMESTAMP DEFAULT NOW())"),
    ("CREATE TABLE IF NOT EXISTS chats ("
     "id SERIAL PRIMARY KEY, name VARCHAR(100), emoji VARCHAR(20) DEFAULT 'chat',"
     "is_group BOOLEAN DEFAULT false, created_by INTEGER REFERENCES users(id),"
     "created_at TIMESTAMP DEFAULT NOW())"),
    ("CREATE TABLE IF NOT EXISTS chat_members ("
     "id SERIAL PRIMARY KEY, chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,"
     "user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,"
     "joined_at TIMESTAMP DEFAULT NOW(), UNIQUE(chat_id, user_id))"),
    ("CREATE TABLE IF NOT EXISTS messages ("
     "id SERIAL PRIMARY KEY, chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,"
     "user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,"
     "text TEXT, is_voice BOOLEAN DEFAULT false, voice_len VARCHAR(10),"
     "created_at TIMESTAMP DEFAULT NOW())"),
    ("CREATE TABLE IF NOT EXISTS reactions ("
     "id SERIAL PRIMARY KEY, message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,"
     "user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,"
     "emoji VARCHAR(20) NOT NULL, UNIQUE(message_id, user_id))"),
]


def _hash(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def _cors(body: dict, status: int = 200) -> dict:
    return {
        'statusCode': status,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
        },
        'isBase64Encoded': False,
        'body': json.dumps(body),
    }


def handler(event: dict, context) -> dict:
    """Регистрация и вход пользователей мессенджера. Создаёт таблицы при первом запуске."""
    if event.get('httpMethod') == 'OPTIONS':
        return _cors({}, 200)

    body = json.loads(event.get('body') or '{}')
    action = body.get('action')
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    for sql in INIT_TABLES:
        cur.execute(sql)
    conn.commit()

    if action == 'register':
        username = (body.get('username') or '').strip().lower()
        name = (body.get('name') or '').strip()
        password = body.get('password') or ''
        emoji = body.get('emoji') or '🙂'
        if not username or not name or len(password) < 4:
            cur.close()
            conn.close()
            return _cors({'error': 'Заполните все поля, пароль от 4 символов'}, 400)
        cur.execute("SELECT id FROM users WHERE username = %s", (username,))
        if cur.fetchone():
            cur.close()
            conn.close()
            return _cors({'error': 'Такой логин уже занят'}, 409)
        token = secrets.token_hex(32)
        cur.execute(
            "INSERT INTO users (username, name, password_hash, emoji, token, online) "
            "VALUES (%s, %s, %s, %s, %s, true) RETURNING id",
            (username, name, _hash(password), emoji, token),
        )
        uid = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        return _cors({'token': token, 'user': {'id': uid, 'username': username, 'name': name, 'emoji': emoji}})

    if action == 'login':
        username = (body.get('username') or '').strip().lower()
        password = body.get('password') or ''
        cur.execute(
            "SELECT id, name, emoji FROM users WHERE username = %s AND password_hash = %s",
            (username, _hash(password)),
        )
        row = cur.fetchone()
        if not row:
            cur.close()
            conn.close()
            return _cors({'error': 'Неверный логин или пароль'}, 401)
        token = secrets.token_hex(32)
        cur.execute("UPDATE users SET token = %s, online = true, last_seen = NOW() WHERE id = %s", (token, row[0]))
        conn.commit()
        cur.close()
        conn.close()
        return _cors({'token': token, 'user': {'id': row[0], 'username': username, 'name': row[1], 'emoji': row[2]}})

    cur.close()
    conn.close()
    return _cors({'error': 'Неизвестное действие'}, 400)