import json
import os
import psycopg2


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
        'body': json.dumps(body, default=str),
    }


def _auth(cur, event):
    headers = event.get('headers') or {}
    token = headers.get('X-Auth-Token') or headers.get('x-auth-token')
    if not token:
        return None
    cur.execute("SELECT id, name, emoji FROM users WHERE token = %s", (token,))
    row = cur.fetchone()
    if not row:
        return None
    return {'id': row[0], 'name': row[1], 'emoji': row[2]}


def handler(event: dict, context) -> dict:
    '''Чаты, сообщения, контакты, группы и реакции мессенджера в реальном времени.'''
    if event.get('httpMethod') == 'OPTIONS':
        return _cors({}, 200)

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    user = _auth(cur, event)
    if not user:
        cur.close()
        conn.close()
        return _cors({'error': 'Не авторизован'}, 401)

    uid = user['id']
    method = event.get('httpMethod')
    params = event.get('queryStringParameters') or {}

    if method == 'GET':
        what = params.get('what')

        if what == 'chats':
            cur.execute("UPDATE users SET online = true, last_seen = NOW() WHERE id = %s", (uid,))
            conn.commit()
            cur.execute(
                """
                SELECT c.id, c.name, c.emoji, c.is_group,
                  (SELECT m.text FROM messages m WHERE m.chat_id = c.id ORDER BY m.created_at DESC LIMIT 1),
                  (SELECT m.is_voice FROM messages m WHERE m.chat_id = c.id ORDER BY m.created_at DESC LIMIT 1),
                  (SELECT to_char(m.created_at, 'HH24:MI') FROM messages m WHERE m.chat_id = c.id ORDER BY m.created_at DESC LIMIT 1),
                  (SELECT u.name FROM users u WHERE u.id = (SELECT user_id FROM chat_members WHERE chat_id = c.id AND user_id != %s LIMIT 1)),
                  (SELECT u.emoji FROM users u WHERE u.id = (SELECT user_id FROM chat_members WHERE chat_id = c.id AND user_id != %s LIMIT 1)),
                  (SELECT u.online FROM users u WHERE u.id = (SELECT user_id FROM chat_members WHERE chat_id = c.id AND user_id != %s LIMIT 1))
                FROM chats c
                JOIN chat_members cm ON cm.chat_id = c.id
                WHERE cm.user_id = %s
                ORDER BY (SELECT MAX(m.created_at) FROM messages m WHERE m.chat_id = c.id) DESC NULLS LAST
                """,
                (uid, uid, uid, uid),
            )
            chats = []
            for r in cur.fetchall():
                is_group = r[3]
                name = r[1] if is_group else (r[7] or 'Чат')
                emoji = r[2] if is_group else (r[8] or '🙂')
                last = 'Голосовое сообщение' if r[5] else (r[4] or 'Нет сообщений')
                chats.append({
                    'id': r[0], 'name': name, 'emoji': emoji, 'is_group': is_group,
                    'last': last, 'time': r[6] or '', 'online': bool(r[9]) if not is_group else False,
                })
            cur.close()
            conn.close()
            return _cors({'chats': chats})

        if what == 'messages':
            chat_id = int(params.get('chat_id'))
            cur.execute("SELECT 1 FROM chat_members WHERE chat_id = %s AND user_id = %s", (chat_id, uid))
            if not cur.fetchone():
                cur.close()
                conn.close()
                return _cors({'error': 'Нет доступа'}, 403)
            cur.execute(
                """
                SELECT m.id, m.text, m.user_id, to_char(m.created_at, 'HH24:MI'),
                       m.is_voice, m.voice_len, u.name, u.emoji
                FROM messages m JOIN users u ON u.id = m.user_id
                WHERE m.chat_id = %s ORDER BY m.created_at ASC
                """,
                (chat_id,),
            )
            msgs = []
            ids = []
            for r in cur.fetchall():
                ids.append(r[0])
                msgs.append({
                    'id': r[0], 'text': r[1], 'mine': r[2] == uid, 'time': r[3],
                    'voice': r[4], 'voiceLen': r[5], 'author': r[6], 'authorEmoji': r[7],
                    'reactions': [],
                })
            if ids:
                cur.execute(
                    "SELECT message_id, emoji FROM reactions WHERE message_id = ANY(%s)",
                    (ids,),
                )
                rmap = {}
                for mid, emoji in cur.fetchall():
                    rmap.setdefault(mid, []).append(emoji)
                for m in msgs:
                    m['reactions'] = rmap.get(m['id'], [])
            cur.close()
            conn.close()
            return _cors({'messages': msgs})

        if what == 'contacts':
            cur.execute("SELECT id, name, username, emoji, online FROM users WHERE id != %s ORDER BY name", (uid,))
            users = [{'id': r[0], 'name': r[1], 'username': r[2], 'emoji': r[3], 'online': r[4]} for r in cur.fetchall()]
            cur.close()
            conn.close()
            return _cors({'contacts': users})

        cur.close()
        conn.close()
        return _cors({'error': 'Неизвестный запрос'}, 400)

    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        action = body.get('action')

        if action == 'send':
            chat_id = int(body['chat_id'])
            cur.execute("SELECT 1 FROM chat_members WHERE chat_id = %s AND user_id = %s", (chat_id, uid))
            if not cur.fetchone():
                cur.close()
                conn.close()
                return _cors({'error': 'Нет доступа'}, 403)
            is_voice = bool(body.get('is_voice'))
            cur.execute(
                "INSERT INTO messages (chat_id, user_id, text, is_voice, voice_len) "
                "VALUES (%s, %s, %s, %s, %s) RETURNING id",
                (chat_id, uid, body.get('text'), is_voice, body.get('voice_len')),
            )
            mid = cur.fetchone()[0]
            conn.commit()
            cur.close()
            conn.close()
            return _cors({'id': mid})

        if action == 'react':
            mid = int(body['message_id'])
            emoji = body['emoji']
            cur.execute(
                "INSERT INTO reactions (message_id, user_id, emoji) VALUES (%s, %s, %s) "
                "ON CONFLICT (message_id, user_id) DO UPDATE SET emoji = EXCLUDED.emoji",
                (mid, uid, emoji),
            )
            conn.commit()
            cur.close()
            conn.close()
            return _cors({'ok': True})

        if action == 'start_chat':
            other_id = int(body['user_id'])
            cur.execute(
                """
                SELECT c.id FROM chats c
                JOIN chat_members a ON a.chat_id = c.id AND a.user_id = %s
                JOIN chat_members b ON b.chat_id = c.id AND b.user_id = %s
                WHERE c.is_group = false LIMIT 1
                """,
                (uid, other_id),
            )
            existing = cur.fetchone()
            if existing:
                cur.close()
                conn.close()
                return _cors({'chat_id': existing[0]})
            cur.execute("INSERT INTO chats (is_group, created_by) VALUES (false, %s) RETURNING id", (uid,))
            cid = cur.fetchone()[0]
            cur.execute("INSERT INTO chat_members (chat_id, user_id) VALUES (%s, %s), (%s, %s)",
                        (cid, uid, cid, other_id))
            conn.commit()
            cur.close()
            conn.close()
            return _cors({'chat_id': cid})

        if action == 'create_group':
            name = (body.get('name') or 'Группа').strip()
            emoji = body.get('emoji') or '👨‍👩‍👧‍👦'
            member_ids = body.get('member_ids') or []
            cur.execute(
                "INSERT INTO chats (name, emoji, is_group, created_by) VALUES (%s, %s, true, %s) RETURNING id",
                (name, emoji, uid),
            )
            cid = cur.fetchone()[0]
            cur.execute("INSERT INTO chat_members (chat_id, user_id) VALUES (%s, %s)", (cid, uid))
            for m in member_ids:
                cur.execute("INSERT INTO chat_members (chat_id, user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                            (cid, int(m)))
            conn.commit()
            cur.close()
            conn.close()
            return _cors({'chat_id': cid})

        cur.close()
        conn.close()
        return _cors({'error': 'Неизвестное действие'}, 400)

    cur.close()
    conn.close()
    return _cors({'error': 'Метод не поддерживается'}, 405)
