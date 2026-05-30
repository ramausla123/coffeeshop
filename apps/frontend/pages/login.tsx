import { useState } from 'react';
import { useRouter } from 'next/router';
import { setToken } from '../lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('http://localhost:4000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      setError('Login gagal. Cek username/password.');
      setLoading(false);
      return;
    }

    const data = await res.json();
    setToken(data.access_token);
    setLoading(false);
    router.push('/admin');
  }

  return (
    <main style={{ padding: 32, fontFamily: 'Inter, system-ui' }}>
      <h1>Staff Login</h1>
      <form onSubmit={handleSubmit} style={{ maxWidth: 420, display: 'grid', gap: 12 }}>
        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} style={{ width: '100%', padding: 8 }} />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: 8 }} />
        </label>
        <button type="submit" disabled={loading} style={{ padding: 10, fontWeight: 'bold' }}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </form>
      <p style={{ marginTop: 24 }}>
        Default admin: <strong>admin</strong> / <strong>admin123</strong><br />
        Default kitchen: <strong>kitchen</strong> / <strong>kitchen123</strong>
      </p>
    </main>
  );
}
