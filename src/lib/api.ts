const AUTH_URL = 'https://functions.poehali.dev/53ea856b-88d0-4397-a13b-69dc5b2f206e';
const CHAT_URL = 'https://functions.poehali.dev/b4ffe061-2f5a-4d49-9f09-d476bd51aeee';

export type User = { id: number; username: string; name: string; emoji: string };

export type ChatItem = {
  id: number;
  name: string;
  emoji: string;
  is_group: boolean;
  last: string;
  time: string;
  online: boolean;
};

export type ChatMessage = {
  id: number;
  text: string | null;
  mine: boolean;
  time: string;
  voice: boolean;
  voiceLen: string | null;
  author: string;
  authorEmoji: string;
  reactions: string[];
};

export type Contact = {
  id: number;
  name: string;
  username: string;
  emoji: string;
  online: boolean;
};

function getToken(): string {
  return localStorage.getItem('teply_token') || '';
}

export function saveSession(token: string, user: User) {
  localStorage.setItem('teply_token', token);
  localStorage.setItem('teply_user', JSON.stringify(user));
}

export function getUser(): User | null {
  const raw = localStorage.getItem('teply_user');
  return raw ? JSON.parse(raw) : null;
}

export function logout() {
  localStorage.removeItem('teply_token');
  localStorage.removeItem('teply_user');
}

async function authPost(body: object) {
  const res = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Ошибка');
  return data;
}

export const api = {
  async register(username: string, name: string, password: string, emoji: string) {
    const data = await authPost({ action: 'register', username, name, password, emoji });
    saveSession(data.token, data.user);
    return data.user as User;
  },
  async login(username: string, password: string) {
    const data = await authPost({ action: 'login', username, password });
    saveSession(data.token, data.user);
    return data.user as User;
  },
  async getChats(): Promise<ChatItem[]> {
    const res = await fetch(`${CHAT_URL}?what=chats`, { headers: { 'X-Auth-Token': getToken() } });
    const data = await res.json();
    return data.chats || [];
  },
  async getMessages(chatId: number): Promise<ChatMessage[]> {
    const res = await fetch(`${CHAT_URL}?what=messages&chat_id=${chatId}`, {
      headers: { 'X-Auth-Token': getToken() },
    });
    const data = await res.json();
    return data.messages || [];
  },
  async getContacts(): Promise<Contact[]> {
    const res = await fetch(`${CHAT_URL}?what=contacts`, { headers: { 'X-Auth-Token': getToken() } });
    const data = await res.json();
    return data.contacts || [];
  },
  async chatPost(body: object) {
    const res = await fetch(CHAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Auth-Token': getToken() },
      body: JSON.stringify(body),
    });
    return res.json();
  },
  sendMessage(chatId: number, text: string) {
    return this.chatPost({ action: 'send', chat_id: chatId, text });
  },
  sendVoice(chatId: number, voiceLen: string) {
    return this.chatPost({ action: 'send', chat_id: chatId, is_voice: true, voice_len: voiceLen });
  },
  react(messageId: number, emoji: string) {
    return this.chatPost({ action: 'react', message_id: messageId, emoji });
  },
  startChat(userId: number): Promise<{ chat_id: number }> {
    return this.chatPost({ action: 'start_chat', user_id: userId });
  },
  createGroup(name: string, emoji: string, memberIds: number[]): Promise<{ chat_id: number }> {
    return this.chatPost({ action: 'create_group', name, emoji, member_ids: memberIds });
  },
};
