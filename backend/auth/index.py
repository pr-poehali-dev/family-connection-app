import json
import os
import hashlib
import secrets
import psycopg2


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
    '''Регистрация и вход пользователей мессенджера. Возвращает токен и профиль.'''
    if event.get('httpMethod') == 'OPTIONS':
        return _cors({}, 200)

    body = json.loads(event.get('body') or '{}')
    action = body.get('action')
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()

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
