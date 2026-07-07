import { useState } from 'react';
import { useRouter } from 'next/router';
import { getRoleFromToken, setToken } from '../lib/auth';
import { apiUrl } from '../lib/api';

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

    try {
      const res = await fetch(apiUrl('/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        setError('Login gagal. Cek username dan password.');
        return;
      }

      const data = await res.json();
      setToken(data.access_token);

      const role = getRoleFromToken(data.access_token);
      if (role === 'kitchen') {
        router.push('/kds');
      } else if (role === 'cashier') {
        router.push('/cashier');
      } else {
        router.push('/admin');
      }
    } catch {
      setError('Tidak bisa terhubung ke backend. Pastikan server berjalan.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <section className="panel">
        <div className="intro">
          <p>Staff Area</p>
          <h1>Masuk ke Dashboard</h1>
          <span>Akses khusus staff untuk mengelola order, dapur, pembayaran, dan menu.</span>
        </div>

        <form onSubmit={handleSubmit} className="form">
          <label>
            Username
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="Masukkan username"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="Masukkan password"
            />
          </label>

          {error && <div className="error">{error}</div>}

          <button type="submit" disabled={loading || !username || !password}>
            {loading ? 'Memproses...' : 'Login'}
          </button>
        </form>
      </section>

      <style jsx>{`
        .page {
          display: grid;
          max-width: none;
          min-height: 100%;
          margin: 0;
          place-items: center;
          background: #f6f7f9;
          padding: 32px 20px;
          color: #111827;
        }

        .panel {
          width: 100%;
          max-width: 430px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #fff;
          padding: 30px;
          box-shadow: 0 12px 30px rgba(16, 24, 40, 0.08);
        }

        .intro {
          display: grid;
          gap: 8px;
          margin-bottom: 24px;
        }

        .intro p {
          margin: 0;
          color: #8b5e34;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0;
          text-transform: uppercase;
        }

        h1 {
          margin: 0;
          font-size: 30px;
          line-height: 1.15;
        }

        .intro span {
          color: #667085;
          font-size: 14px;
          line-height: 1.45;
        }

        .form {
          display: grid;
          gap: 14px;
        }

        label {
          display: grid;
          gap: 6px;
          font-size: 14px;
          font-weight: 700;
        }

        input {
          min-height: 46px;
          border: 1px solid #c9d1d9;
          border-radius: 8px;
          padding: 0 12px;
          font: inherit;
        }

        input:focus {
          border-color: #8b5e34;
          outline: 3px solid rgba(139, 94, 52, 0.14);
        }

        .error {
          border: 1px solid #f0b8b8;
          border-radius: 8px;
          background: #fff1f1;
          color: #8a1f1f;
          padding: 10px 12px;
          font-size: 14px;
        }

        button {
          min-height: 46px;
          border: 1px solid #8b5e34;
          border-radius: 8px;
          background: #8b5e34;
          color: #fff;
          font: inherit;
          font-weight: 800;
          cursor: pointer;
        }

        button:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        @media (max-width: 520px) {
          .panel {
            padding: 22px;
          }
        }
      `}</style>
    </main>
  );
}
