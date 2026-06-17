import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { api, type User } from '@/lib/api';

const emojis = ['🙂', '🌸', '🦊', '🐻', '🌷', '🌞', '🐱', '🌿', '🍀', '🐰', '🦄', '🌺'];

export default function AuthScreen({ onAuth }: { onAuth: (u: User) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [emoji, setEmoji] = useState('🙂');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      const user =
        mode === 'register'
          ? await api.register(username, name, password, emoji)
          : await api.login(username, password);
      onAuth(user);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen warm-gradient flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-card rounded-[2rem] shadow-2xl shadow-primary/10 p-8 animate-scale-in">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-3xl bg-primary mx-auto flex items-center justify-center text-4xl shadow-lg shadow-primary/30 mb-4">
            🤗
          </div>
          <h1 className="font-display text-4xl text-primary">Тёплый</h1>
          <p className="text-muted-foreground mt-1">мессенджер для самых близких</p>
        </div>

        <div className="flex gap-2 p-1 bg-secondary rounded-2xl mb-6">
          {(['register', 'login'] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); }}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
                mode === m ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'
              }`}
            >
              {m === 'register' ? 'Регистрация' : 'Вход'}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {mode === 'register' && (
            <>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Как вас зовут?"
                className="w-full h-12 px-4 rounded-2xl bg-secondary/70 border border-transparent focus:border-primary/40 outline-none text-[15px]"
              />
              <div>
                <p className="text-xs text-muted-foreground mb-2 px-1">Выберите аватар</p>
                <div className="grid grid-cols-6 gap-2">
                  {emojis.map((e) => (
                    <button
                      key={e}
                      onClick={() => setEmoji(e)}
                      className={`aspect-square rounded-xl text-xl flex items-center justify-center transition-all ${
                        emoji === e ? 'bg-primary/15 ring-2 ring-primary scale-105' : 'bg-secondary/70 hover:bg-secondary'
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Логин (латиницей)"
            className="w-full h-12 px-4 rounded-2xl bg-secondary/70 border border-transparent focus:border-primary/40 outline-none text-[15px]"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Пароль"
            className="w-full h-12 px-4 rounded-2xl bg-secondary/70 border border-transparent focus:border-primary/40 outline-none text-[15px]"
          />

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-xl px-3 py-2">
              <Icon name="CircleAlert" size={16} />
              {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={loading}
            className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-bold transition-all hover:scale-[1.02] shadow-md shadow-primary/30 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Icon name="Loader" size={20} className="animate-spin" />
            ) : (
              <>
                <Icon name={mode === 'register' ? 'Sparkles' : 'LogIn'} size={18} />
                {mode === 'register' ? 'Создать аккаунт' : 'Войти'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
