import { useEffect, useRef, useState, useCallback } from 'react';
import Icon from '@/components/ui/icon';
import AuthScreen from '@/components/AuthScreen';
import NewChatDialog from '@/components/NewChatDialog';
import { api, getUser, logout, type User, type ChatItem, type ChatMessage } from '@/lib/api';

const reactions = ['❤️', '😂', '👍', '😮', '😢', '🔥'];
const colors = ['bg-rose-200', 'bg-amber-200', 'bg-orange-200', 'bg-yellow-200', 'bg-green-200', 'bg-pink-200'];
const colorOf = (id: number) => colors[id % colors.length];

export default function Index() {
  const [user, setUser] = useState<User | null>(getUser());
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [active, setActive] = useState<ChatItem | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [hoverMsg, setHoverMsg] = useState<number | null>(null);
  const [dialog, setDialog] = useState<'chat' | 'group' | null>(null);
  const [recording, setRecording] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<ChatItem | null>(null);
  activeRef.current = active;

  const loadChats = useCallback(async () => {
    if (!getUser()) return;
    const list = await api.getChats();
    setChats(list);
  }, []);

  const loadMessages = useCallback(async (chatId: number) => {
    const msgs = await api.getMessages(chatId);
    setMessages((prev) => (JSON.stringify(prev) !== JSON.stringify(msgs) ? msgs : prev));
  }, []);

  useEffect(() => {
    if (!user) return;
    loadChats();
    const t = setInterval(() => {
      loadChats();
      if (activeRef.current) loadMessages(activeRef.current.id);
    }, 2000);
    return () => clearInterval(t);
  }, [user, loadChats, loadMessages]);

  useEffect(() => {
    if (active) loadMessages(active.id);
    else setMessages([]);
  }, [active, loadMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!draft.trim() || !active) return;
    const text = draft;
    setDraft('');
    await api.sendMessage(active.id, text);
    loadMessages(active.id);
    loadChats();
  };

  const sendVoice = async () => {
    if (!active) return;
    const len = `0:${String(Math.floor(Math.random() * 50) + 5).padStart(2, '0')}`;
    await api.sendVoice(active.id, len);
    loadMessages(active.id);
    loadChats();
  };

  const react = async (mid: number, emoji: string) => {
    setHoverMsg(null);
    await api.react(mid, emoji);
    if (active) loadMessages(active.id);
  };

  const onChatCreated = async (chatId: number) => {
    setDialog(null);
    const list = await api.getChats();
    setChats(list);
    const found = list.find((c) => c.id === chatId);
    if (found) setActive(found);
  };

  if (!user) return <AuthScreen onAuth={setUser} />;

  return (
    <div className="h-screen warm-gradient flex overflow-hidden font-sans">
      {/* Боковая навигация */}
      <nav className="hidden md:flex flex-col items-center gap-6 w-20 py-8 bg-card/60 backdrop-blur-sm border-r border-border">
        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-2xl shadow-lg shadow-primary/30">🤗</div>
        <div className="flex flex-col gap-4 mt-4 flex-1">
          <button title="Чаты" className="w-12 h-12 rounded-2xl flex items-center justify-center bg-primary/15 text-primary transition-all hover:scale-110">
            <Icon name="MessageCircle" size={22} />
          </button>
          <button title="Контакты" onClick={() => setDialog('chat')} className="w-12 h-12 rounded-2xl flex items-center justify-center text-muted-foreground hover:bg-secondary transition-all hover:scale-110">
            <Icon name="Users" size={22} />
          </button>
          <button title="Создать группу" onClick={() => setDialog('group')} className="w-12 h-12 rounded-2xl flex items-center justify-center text-muted-foreground hover:bg-secondary transition-all hover:scale-110">
            <Icon name="UsersRound" size={22} />
          </button>
        </div>
        <button title="Выйти" onClick={() => { logout(); setUser(null); setActive(null); }} className="w-12 h-12 rounded-2xl flex items-center justify-center text-muted-foreground hover:bg-secondary transition-all hover:scale-110">
          <Icon name="LogOut" size={22} />
        </button>
        <div title={user.name} className="w-12 h-12 rounded-full bg-amber-200 flex items-center justify-center text-xl ring-2 ring-primary/30">{user.emoji}</div>
      </nav>

      {/* Список чатов */}
      <aside className={`${active ? 'hidden sm:flex' : 'flex'} w-full sm:w-[340px] flex-col bg-card/40 backdrop-blur-sm border-r border-border`}>
        <header className="px-6 pt-7 pb-4">
          <div className="flex items-center justify-between mb-5">
            <h1 className="font-display text-3xl text-primary">Тёплый</h1>
            <div className="flex gap-2">
              <button title="Добавить контакт" onClick={() => setDialog('chat')} className="w-10 h-10 rounded-full bg-secondary hover:bg-accent flex items-center justify-center transition-all hover:scale-110 text-foreground">
                <Icon name="UserPlus" size={18} />
              </button>
              <button title="Создать группу" onClick={() => setDialog('group')} className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center transition-all hover:scale-110 shadow-md shadow-primary/30">
                <Icon name="Plus" size={20} />
              </button>
            </div>
          </div>
          <div className="relative">
            <Icon name="Search" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input placeholder="Поиск близких..." className="w-full h-12 pl-11 pr-4 rounded-2xl bg-secondary/70 border border-transparent focus:border-primary/40 outline-none text-sm placeholder:text-muted-foreground transition-all" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto scrollbar-hide px-3 pb-4 space-y-1">
          {chats.length === 0 && (
            <div className="text-center px-6 py-12">
              <div className="text-5xl mb-3">💌</div>
              <p className="text-muted-foreground text-sm">Пока нет чатов. Нажмите «+», чтобы начать общаться с близкими!</p>
            </div>
          )}
          {chats.map((c, idx) => (
            <button key={c.id} onClick={() => setActive(c)} style={{ animationDelay: `${idx * 40}ms` }}
              className={`animate-fade-in w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left ${active?.id === c.id ? 'bg-card shadow-md shadow-primary/5' : 'hover:bg-card/60'}`}>
              <div className="relative shrink-0">
                <div className={`w-14 h-14 rounded-full ${colorOf(c.id)} flex items-center justify-center text-2xl`}>{c.emoji}</div>
                {c.online && <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full ring-2 ring-card" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-[15px] truncate flex items-center gap-1">
                    {c.name}
                    {c.is_group && <Icon name="Users" size={13} className="text-muted-foreground" />}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">{c.time}</span>
                </div>
                <div className="text-sm text-muted-foreground truncate mt-0.5">{c.last}</div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Диалог */}
      <main className={`${active ? 'flex' : 'hidden sm:flex'} flex-1 flex-col`}>
        {!active ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="text-7xl mb-4 animate-pulse-soft">🤗</div>
            <h2 className="font-display text-3xl text-primary mb-2">Добро пожаловать, {user.name}!</h2>
            <p className="text-muted-foreground max-w-xs">Выберите чат слева или создайте новый, чтобы начать тёплое общение</p>
          </div>
        ) : (
          <>
            <header className="h-20 px-4 sm:px-6 flex items-center justify-between bg-card/50 backdrop-blur-sm border-b border-border">
              <div className="flex items-center gap-3">
                <button onClick={() => setActive(null)} className="sm:hidden w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center">
                  <Icon name="ChevronLeft" size={22} />
                </button>
                <div className={`w-12 h-12 rounded-full ${colorOf(active.id)} flex items-center justify-center text-xl`}>{active.emoji}</div>
                <div>
                  <div className="font-bold text-[17px] flex items-center gap-1">
                    {active.name}
                    <Icon name="Lock" size={13} className="text-green-600" />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {active.is_group ? 'групповой чат' : active.online ? 'в сети' : 'был(а) недавно'} · шифрование
                  </div>
                </div>
              </div>
              <div className="flex gap-1 sm:gap-2">
                <button title="Аудиозвонок" onClick={() => alert('Звонок скоро будет доступен')} className="w-11 h-11 rounded-full hover:bg-secondary flex items-center justify-center transition-all hover:scale-110 text-foreground">
                  <Icon name="Phone" size={20} />
                </button>
                <button title="Видеозвонок" onClick={() => alert('Видеозвонок скоро будет доступен')} className="w-11 h-11 rounded-full hover:bg-secondary flex items-center justify-center transition-all hover:scale-110 text-foreground">
                  <Icon name="Video" size={20} />
                </button>
              </div>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-6 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-5xl mb-3">👋</div>
                  <p className="text-muted-foreground text-sm">Напишите первое сообщение!</p>
                </div>
              )}
              {messages.map((m) => (
                <div key={m.id} onMouseEnter={() => setHoverMsg(m.id)} onMouseLeave={() => setHoverMsg(null)}
                  className={`flex ${m.mine ? 'justify-end' : 'justify-start'} animate-bubble-in`}>
                  <div className="relative max-w-[75%]">
                    {active.is_group && !m.mine && (
                      <span className="text-xs font-bold text-primary ml-3 mb-0.5 block">{m.authorEmoji} {m.author}</span>
                    )}
                    <div className={`px-4 py-2.5 rounded-3xl ${m.mine ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-card text-card-foreground rounded-bl-md shadow-sm'}`}>
                      {m.voice ? (
                        <div className="flex items-center gap-2 py-1 min-w-[140px]">
                          <Icon name="Play" size={18} />
                          <div className="flex items-center gap-0.5 flex-1">
                            {[8, 14, 20, 12, 18, 10, 16, 22, 9, 15, 11, 19].map((h, i) => (
                              <span key={i} className={`w-0.5 rounded-full ${m.mine ? 'bg-primary-foreground/70' : 'bg-primary/60'}`} style={{ height: `${h}px` }} />
                            ))}
                          </div>
                          <span className="text-xs opacity-80">{m.voiceLen}</span>
                        </div>
                      ) : (
                        <p className="text-[15px] leading-snug break-words">{m.text}</p>
                      )}
                      <div className={`text-[10px] mt-0.5 flex items-center gap-1 justify-end ${m.mine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {m.time}
                        {m.mine && <Icon name="CheckCheck" size={13} />}
                      </div>
                    </div>
                    {m.reactions.length > 0 && (
                      <span className="absolute -bottom-2 left-2 bg-card text-sm px-1.5 py-0.5 rounded-full shadow-md border border-border flex gap-0.5">
                        {m.reactions.slice(0, 3).join('')}
                      </span>
                    )}
                    {hoverMsg === m.id && (
                      <div className={`absolute -top-9 ${m.mine ? 'right-0' : 'left-0'} flex gap-0.5 bg-card rounded-full shadow-lg border border-border px-1.5 py-1 animate-scale-in z-10`}>
                        {reactions.map((r) => (
                          <button key={r} onClick={() => react(m.id, r)} className="text-base hover:scale-125 transition-transform">{r}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <footer className="p-4 bg-card/50 backdrop-blur-sm border-t border-border">
              <div className="flex items-center gap-2 bg-secondary/70 rounded-3xl pl-2 pr-2 py-1.5">
                <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder="Напишите тёплое сообщение..." className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-muted-foreground px-2" />
                {draft.trim() ? (
                  <button onClick={send} className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center transition-all hover:scale-110 shadow-md shadow-primary/30">
                    <Icon name="Send" size={20} />
                  </button>
                ) : (
                  <button onClick={() => { setRecording(true); setTimeout(() => { setRecording(false); sendVoice(); }, 800); }}
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-md shadow-primary/30 ${recording ? 'bg-destructive text-destructive-foreground animate-pulse-soft' : 'bg-primary text-primary-foreground'}`}>
                    <Icon name="Mic" size={22} />
                  </button>
                )}
              </div>
            </footer>
          </>
        )}
      </main>

      {dialog && <NewChatDialog mode={dialog} onClose={() => setDialog(null)} onCreated={onChatCreated} />}
    </div>
  );
}
