import { useState } from 'react';
import Icon from '@/components/ui/icon';

type Chat = {
  id: number;
  name: string;
  emoji: string;
  last: string;
  time: string;
  unread: number;
  online: boolean;
  group?: boolean;
  color: string;
};

type Message = {
  id: number;
  text?: string;
  mine: boolean;
  time: string;
  voice?: boolean;
  voiceLen?: string;
  reaction?: string;
};

const chats: Chat[] = [
  { id: 1, name: 'Мама', emoji: '🌸', last: 'Не забудь поесть! 💛', time: '12:40', unread: 2, online: true, color: 'bg-rose-200' },
  { id: 2, name: 'Семья ❤️', emoji: '🏡', last: 'Папа: смотрите какой закат', time: '11:05', unread: 5, online: false, group: true, color: 'bg-amber-200' },
  { id: 3, name: 'Аня', emoji: '🦊', last: 'Голосовое сообщение', time: '10:22', unread: 0, online: true, color: 'bg-orange-200' },
  { id: 4, name: 'Дима', emoji: '🐻', last: 'Созвонимся вечером?', time: 'Вчера', unread: 0, online: false, color: 'bg-yellow-200' },
  { id: 5, name: 'Подружки 🌿', emoji: '🌷', last: 'Катя: реакция ❤️ на ваше фото', time: 'Вчера', unread: 0, online: false, group: true, color: 'bg-green-200' },
  { id: 6, name: 'Бабушка', emoji: '👵', last: 'Целую, мой родной', time: 'Пн', unread: 0, online: false, color: 'bg-pink-200' },
];

const messages: Message[] = [
  { id: 1, text: 'Привет, солнышко! Как ты сегодня? 🌞', mine: false, time: '12:30' },
  { id: 2, text: 'Привет, мам! Всё хорошо, работаю 💛', mine: true, time: '12:32', reaction: '❤️' },
  { id: 3, text: 'Ты уже пообедал?', mine: false, time: '12:35' },
  { id: 4, voice: true, voiceLen: '0:14', mine: true, time: '12:37' },
  { id: 5, text: 'Не забудь поесть! 💛', mine: false, time: '12:40' },
];

const reactions = ['❤️', '😂', '👍', '😮', '😢', '🔥'];

export default function Index() {
  const [active, setActive] = useState(chats[0]);
  const [draft, setDraft] = useState('');
  const [hoverMsg, setHoverMsg] = useState<number | null>(null);

  return (
    <div className="h-screen warm-gradient flex overflow-hidden font-sans">
      {/* Боковая навигация */}
      <nav className="hidden md:flex flex-col items-center gap-6 w-20 py-8 bg-card/60 backdrop-blur-sm border-r border-border">
        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-2xl shadow-lg shadow-primary/30">
          🤗
        </div>
        <div className="flex flex-col gap-4 mt-4 flex-1">
          {[
            { icon: 'MessageCircle', label: 'Чаты', on: true },
            { icon: 'Users', label: 'Контакты' },
            { icon: 'UsersRound', label: 'Группы' },
            { icon: 'CircleDashed', label: 'Статусы' },
          ].map((i) => (
            <button
              key={i.icon}
              title={i.label}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all hover:scale-110 ${
                i.on ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-secondary'
              }`}
            >
              <Icon name={i.icon} size={22} />
            </button>
          ))}
        </div>
        <button title="Настройки" className="w-12 h-12 rounded-2xl flex items-center justify-center text-muted-foreground hover:bg-secondary transition-all hover:scale-110">
          <Icon name="Settings" size={22} />
        </button>
        <button title="Профиль" className="w-12 h-12 rounded-full bg-amber-200 flex items-center justify-center text-xl ring-2 ring-primary/30">
          🧑
        </button>
      </nav>

      {/* Список чатов */}
      <aside className="w-full sm:w-[340px] flex flex-col bg-card/40 backdrop-blur-sm border-r border-border">
        <header className="px-6 pt-7 pb-4">
          <div className="flex items-center justify-between mb-5">
            <h1 className="font-display text-3xl text-primary">Тёплый</h1>
            <div className="flex gap-2">
              <button title="Добавить контакт" className="w-10 h-10 rounded-full bg-secondary hover:bg-accent flex items-center justify-center transition-all hover:scale-110 text-foreground">
                <Icon name="UserPlus" size={18} />
              </button>
              <button title="Создать группу" className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center transition-all hover:scale-110 shadow-md shadow-primary/30">
                <Icon name="Plus" size={20} />
              </button>
            </div>
          </div>
          <div className="relative">
            <Icon name="Search" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Поиск близких..."
              className="w-full h-12 pl-11 pr-4 rounded-2xl bg-secondary/70 border border-transparent focus:border-primary/40 outline-none text-sm placeholder:text-muted-foreground transition-all"
            />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto scrollbar-hide px-3 pb-4 space-y-1">
          {chats.map((c, idx) => (
            <button
              key={c.id}
              onClick={() => setActive(c)}
              style={{ animationDelay: `${idx * 50}ms` }}
              className={`animate-fade-in w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left ${
                active.id === c.id ? 'bg-card shadow-md shadow-primary/5' : 'hover:bg-card/60'
              }`}
            >
              <div className="relative shrink-0">
                <div className={`w-14 h-14 rounded-full ${c.color} flex items-center justify-center text-2xl`}>
                  {c.emoji}
                </div>
                {c.online && (
                  <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full ring-2 ring-card" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-[15px] truncate flex items-center gap-1">
                    {c.name}
                    {c.group && <Icon name="Users" size={13} className="text-muted-foreground" />}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">{c.time}</span>
                </div>
                <div className="flex justify-between items-center mt-0.5">
                  <span className="text-sm text-muted-foreground truncate">{c.last}</span>
                  {c.unread > 0 && (
                    <span className="ml-2 shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                      {c.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Диалог */}
      <main className="hidden sm:flex flex-1 flex-col">
        <header className="h-20 px-6 flex items-center justify-between bg-card/50 backdrop-blur-sm border-b border-border">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full ${active.color} flex items-center justify-center text-xl`}>
              {active.emoji}
            </div>
            <div>
              <div className="font-bold text-[17px] flex items-center gap-1">
                {active.name}
                <Icon name="Lock" size={13} className="text-green-600" />
              </div>
              <div className="text-xs text-muted-foreground">
                {active.online ? 'в сети' : 'был(а) недавно'} · сквозное шифрование
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {['Phone', 'Video', 'Search', 'MoreVertical'].map((i) => (
              <button key={i} className="w-11 h-11 rounded-full hover:bg-secondary flex items-center justify-center transition-all hover:scale-110 text-foreground">
                <Icon name={i} size={20} />
              </button>
            ))}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto scrollbar-hide p-6 space-y-3">
          <div className="text-center">
            <span className="text-xs text-muted-foreground bg-card/70 px-3 py-1 rounded-full">Сегодня</span>
          </div>
          {messages.map((m) => (
            <div
              key={m.id}
              onMouseEnter={() => setHoverMsg(m.id)}
              onMouseLeave={() => setHoverMsg(null)}
              className={`flex ${m.mine ? 'justify-end' : 'justify-start'} animate-bubble-in`}
            >
              <div className="relative max-w-[70%]">
                <div
                  className={`px-4 py-2.5 rounded-3xl ${
                    m.mine
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-card text-card-foreground rounded-bl-md shadow-sm'
                  }`}
                >
                  {m.voice ? (
                    <div className="flex items-center gap-2 py-1 min-w-[140px]">
                      <Icon name="Play" size={18} />
                      <div className="flex items-center gap-0.5 flex-1">
                        {[8, 14, 20, 12, 18, 10, 16, 22, 9, 15, 11, 19].map((h, i) => (
                          <span
                            key={i}
                            className={`w-0.5 rounded-full ${m.mine ? 'bg-primary-foreground/70' : 'bg-primary/60'}`}
                            style={{ height: `${h}px` }}
                          />
                        ))}
                      </div>
                      <span className="text-xs opacity-80">{m.voiceLen}</span>
                    </div>
                  ) : (
                    <p className="text-[15px] leading-snug">{m.text}</p>
                  )}
                  <div className={`text-[10px] mt-0.5 flex items-center gap-1 justify-end ${m.mine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {m.time}
                    {m.mine && <Icon name="CheckCheck" size={13} />}
                  </div>
                </div>
                {m.reaction && (
                  <span className="absolute -bottom-2 left-2 bg-card text-sm px-1.5 py-0.5 rounded-full shadow-md border border-border">
                    {m.reaction}
                  </span>
                )}
                {hoverMsg === m.id && (
                  <div className={`absolute -top-9 ${m.mine ? 'right-0' : 'left-0'} flex gap-0.5 bg-card rounded-full shadow-lg border border-border px-1.5 py-1 animate-scale-in z-10`}>
                    {reactions.map((r) => (
                      <button key={r} className="text-base hover:scale-125 transition-transform">
                        {r}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <footer className="p-4 bg-card/50 backdrop-blur-sm border-t border-border">
          <div className="flex items-center gap-2 bg-secondary/70 rounded-3xl pl-2 pr-2 py-1.5">
            <button className="w-10 h-10 rounded-full hover:bg-card flex items-center justify-center transition-all text-muted-foreground">
              <Icon name="Smile" size={22} />
            </button>
            <button className="w-10 h-10 rounded-full hover:bg-card flex items-center justify-center transition-all text-muted-foreground">
              <Icon name="Paperclip" size={22} />
            </button>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Напишите тёплое сообщение..."
              className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-muted-foreground"
            />
            <button className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center transition-all hover:scale-110 shadow-md shadow-primary/30">
              <Icon name={draft ? 'Send' : 'Mic'} size={draft ? 20 : 22} />
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
}
