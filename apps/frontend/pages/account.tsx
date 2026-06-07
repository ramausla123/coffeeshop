import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { authHeaders, clearToken, fetchProfile, getToken } from '../lib/auth';
import { apiUrl } from '../lib/api';
import type { AuthUser } from '../types';

export default function Account() {
  const router = useRouter();
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      if (!getToken()) {
        router.push('/login');
        return;
      }

      try {
        setProfile(await fetchProfile());
      } catch {
        clearToken();
        router.push('/login');
      }
    }

    loadProfile();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password tidak sama.');
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(apiUrl('/auth/change-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (res.status === 401) {
        setError('Password lama salah atau sesi sudah habis.');
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message || 'Gagal mengganti password.');
        return;
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage('Password berhasil diganti.');
    } catch {
      setError('Tidak bisa terhubung ke backend.');
    } finally {
      setSaving(false);
    }
  }

  function goBack() {
    if (profile?.role === 'kitchen') router.push('/kds');
    else if (profile?.role === 'cashier') router.push('/cashier');
    else router.push('/admin');
  }

  return (
    <main className="page">
      <section className="panel">
        <div className="top">
          <div>
            <p>Account</p>
            <h1>Ganti Password</h1>
            {profile && <span>{profile.username} - {profile.role}</span>}
          </div>
          <button type="button" onClick={goBack}>Kembali</button>
        </div>

        <form onSubmit={handleSubmit}>
          <label>
            Password lama
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </label>
          <label>
            Password baru
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} />
          </label>
          <label>
            Konfirmasi password baru
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={8} />
          </label>

          {error && <div className="error">{error}</div>}
          {message && <div className="success">{message}</div>}

          <button type="submit" disabled={saving || !currentPassword || newPassword.length < 8 || !confirmPassword}>
            {saving ? 'Menyimpan...' : 'Simpan Password'}
          </button>
        </form>
      </section>

      <style jsx>{`
        .page {
          display: grid;
          min-height: 100%;
          place-items: center;
          padding: 32px 20px;
          color: #1f2933;
        }

        .panel {
          width: 100%;
          max-width: 480px;
          border: 1px solid #d8dee4;
          border-radius: 8px;
          background: #fff;
          padding: 24px;
        }

        .top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 20px;
        }

        p, h1 {
          margin: 0;
        }

        p {
          color: #8b5e34;
          font-size: 13px;
          font-weight: 800;
          text-transform: uppercase;
        }

        h1 {
          margin-top: 4px;
          font-size: 26px;
        }

        span {
          color: #667085;
          font-size: 14px;
        }

        form {
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
          min-height: 42px;
          border: 1px solid #c9d1d9;
          border-radius: 8px;
          padding: 0 12px;
          font: inherit;
        }

        button {
          min-height: 40px;
          border: 1px solid #8b5e34;
          border-radius: 8px;
          background: #8b5e34;
          color: #fff;
          padding: 0 12px;
          font: inherit;
          font-weight: 700;
          cursor: pointer;
        }

        .top button {
          border-color: #b7c2cc;
          background: #fff;
          color: #1f2933;
        }

        button:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .error,
        .success {
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 14px;
        }

        .error {
          border: 1px solid #f0b8b8;
          background: #fff1f1;
          color: #8a1f1f;
        }

        .success {
          border: 1px solid #a7d8bd;
          background: #eefaf2;
          color: #14532d;
        }
      `}</style>
    </main>
  );
}
