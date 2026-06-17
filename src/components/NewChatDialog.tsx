import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import { api, type Contact } from '@/lib/api';

const groupEmojis = ['👨‍👩‍👧‍👦', '🏡', '❤️', '🌿', '🎉', '🌷', '⭐', '🍀'];

export default function NewChatDialog({
  mode,
  onClose,
  onCreated,
}: {
  mode: 'chat' | 'group';
  onClose: () => void;
  onCreated: (chatId: number) => void;
}) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupEmoji, setGroupEmoji] = useState('👨‍👩‍👧‍👦');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getContacts().then(setContacts);
  }, []);

  const toggle = (id: number) => {
    if (mode === 'chat') {
      pickChat(id);
      return;
    }
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const pickChat = async (id: number) => {
    setLoading(true);
    const res = await api.startChat(id);
    onCreated(res.chat_id);
  };

  const createGroup = async () => {
    if (!groupName.trim() || selected.length === 0) return;
    setLoading(true);
    const res = await api.createGroup(groupName, groupEmoji, selected);
    onCreated(res.chat_id);
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-md bg-card rounded-[2rem] shadow-2xl p-6 animate-scale-in max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-xl">{mode === 'chat' ? 'Новый чат' : 'Новая группа'}</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center">
            <Icon name="X" size={20} />
          </button>
        </div>

        {mode === 'group' && (
          <div className="mb-4 space-y-3">
            <div className="flex gap-2">
              <div className="grid grid-cols-4 gap-1.5 flex-1">
                {groupEmojis.map((e) => (
                  <button
                    key={e}
                    onClick={() => setGroupEmoji(e)}
                    className={`aspect-square rounded-xl text-lg flex items-center justify-center transition-all ${
                      groupEmoji === e ? 'bg-primary/15 ring-2 ring-primary' : 'bg-secondary/70'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Название группы"
              className="w-full h-11 px-4 rounded-2xl bg-secondary/70 outline-none text-[15px] border border-transparent focus:border-primary/40"
            />
            <p className="text-xs text-muted-foreground px-1">Выберите участников ({selected.length})</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto scrollbar-hide space-y-1 -mx-1 px-1">
          {contacts.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">Пока нет других пользователей.<br />Пригласите близких зарегистрироваться!</p>
          )}
          {contacts.map((c) => (
            <button
              key={c.id}
              onClick={() => toggle(c.id)}
              className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-secondary/60 transition-all text-left"
            >
              <div className="relative">
                <div className="w-11 h-11 rounded-full bg-amber-200 flex items-center justify-center text-xl">{c.emoji}</div>
                {c.online && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full ring-2 ring-card" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm">{c.name}</div>
                <div className="text-xs text-muted-foreground">@{c.username}</div>
              </div>
              {mode === 'group' && (
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selected.includes(c.id) ? 'bg-primary border-primary' : 'border-border'}`}>
                  {selected.includes(c.id) && <Icon name="Check" size={14} className="text-primary-foreground" />}
                </div>
              )}
            </button>
          ))}
        </div>

        {mode === 'group' && (
          <button
            onClick={createGroup}
            disabled={loading || !groupName.trim() || selected.length === 0}
            className="mt-4 w-full h-12 rounded-2xl bg-primary text-primary-foreground font-bold transition-all hover:scale-[1.02] shadow-md shadow-primary/30 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Icon name="Users" size={18} />
            Создать группу
          </button>
        )}
      </div>
    </div>
  );
}
