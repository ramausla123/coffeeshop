import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { authHeaders, clearToken, fetchProfile, getToken } from '../lib/auth';
import { apiUrl } from '../lib/api';
import type { Order } from '../types';

const statusFlow = ['received', 'preparing', 'ready', 'served'] as const;
const activeStatuses = ['received', 'preparing', 'ready'] as const;

const statusLabel = {
  received: 'Baru',
  preparing: 'Diproses',
  ready: 'Siap',
  served: 'Selesai',
};

const currency = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

function playNotificationSound() {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const now = audioContext.currentTime;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();

  osc.connect(gain);
  gain.connect(audioContext.destination);

  osc.frequency.setValueAtTime(800, now);
  osc.frequency.setValueAtTime(600, now + 0.1);
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.setValueAtTime(0, now + 0.2);

  osc.start(now);
  osc.stop(now + 0.2);
}

export default function KDS() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);
  const knownOrderIds = useRef<Set<number>>(new Set());

  const groupedOrders = useMemo(
    () =>
      activeStatuses.map((status) => ({
        status,
        orders: orders.filter((order) => order.status === status),
      })),
    [orders],
  );

  async function fetchOrders() {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(apiUrl('/orders'), {
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      });

      if (res.status === 401) {
        clearToken();
        router.push('/login');
        return;
      }

      if (!res.ok) throw new Error('Orders request failed');

      const data = await res.json();
      const newOrders = data.filter((order: Order) => !knownOrderIds.current.has(order.id));

      if (initialized.current && newOrders.length > 0) {
        newOrders.forEach((order: Order) => {
          playNotificationSound();
          const itemsDesc = order.items.map((item) => `${item.name || 'Item'} x${item.quantity}`).join(', ');
          toast.info(`Order baru #${order.id} - Meja ${order.table || '-'}: ${itemsDesc}`, {
            position: 'top-right',
            autoClose: 5000,
          });
        });
      }

      data.forEach((order: Order) => knownOrderIds.current.add(order.id));
      initialized.current = true;
      setOrders(data);
    } catch {
      setError('Gagal memuat order. Pastikan backend berjalan dan akun masih valid.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let intv: ReturnType<typeof setInterval> | undefined;
    let mounted = true;

    async function startKds() {
      try {
        const profile = await fetchProfile();
        if (!mounted) return;

        if (profile.role !== 'admin' && profile.role !== 'kitchen') {
          clearToken();
          router.push('/login');
          return;
        }

        await fetchOrders();
        intv = setInterval(fetchOrders, 3000);
      } catch {
        clearToken();
        router.push('/login');
      }
    }

    startKds();

    return () => {
      mounted = false;
      if (intv) clearInterval(intv);
    };
  }, []);

  async function nextStatus(order: Order) {
    const idx = statusFlow.indexOf(order.status);
    if (idx === -1 || idx === statusFlow.length - 1) return;

    const next = statusFlow[idx + 1];

    try {
      const res = await fetch(apiUrl(`/orders/${order.id}/status`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ status: next }),
      });

      if (res.status === 401) {
        clearToken();
        router.push('/login');
        return;
      }

      if (!res.ok) throw new Error('Status update failed');
      fetchOrders();
    } catch {
      setError(`Gagal mengubah status order #${order.id}.`);
    }
  }

  function logout() {
    clearToken();
    router.push('/login');
  }

  return (
    <main className="page">
      <ToastContainer />

      <header className="topbar">
        <div>
          <p>Kitchen</p>
          <h1>Display System</h1>
        </div>
        <div className="actions">
          <button type="button" onClick={fetchOrders} disabled={loading}>
            {loading ? 'Memuat...' : 'Refresh'}
          </button>
          <button type="button" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      {error && <div className="alert">{error}</div>}

      <section className="board">
        {groupedOrders.map((group) => (
          <div className="column" key={group.status}>
            <div className="columnTitle">
              <h2>{statusLabel[group.status]}</h2>
              <span>{group.orders.length}</span>
            </div>

            {group.orders.length === 0 ? (
              <div className="empty">Tidak ada order.</div>
            ) : (
              <div className="cards">
                {group.orders.map((order) => (
                  <article className="orderCard" key={order.id}>
                    <div className="orderHead">
                      <div>
                        <strong>#{order.id}</strong>
                        <span>Meja {order.table || '-'}</span>
                      </div>
                      <span className={`status ${order.status}`}>{statusLabel[order.status]}</span>
                    </div>

                    <ul>
                      {order.items.map((item, idx) => (
                        <li key={`${order.id}-${item.menuId}-${idx}`}>
                          <span>
                            <strong>{item.name || 'Item'}</strong>
                            {item.note && <em>{item.note}</em>}
                          </span>
                          <b>x{item.quantity}</b>
                        </li>
                      ))}
                    </ul>

                    <div className="orderFoot">
                      <strong>{currency.format(order.total)}</strong>
                      <button type="button" onClick={() => nextStatus(order)}>
                        Next: {statusLabel[statusFlow[statusFlow.indexOf(order.status) + 1]]}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        ))}
      </section>

      <style jsx>{`
        .page {
          max-width: 1280px;
          margin: 0 auto;
          padding: 32px 20px 48px;
          color: #1f2933;
        }

        .topbar,
        .actions,
        .columnTitle,
        .orderHead,
        .orderFoot,
        li {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .topbar,
        .columnTitle,
        .orderHead,
        .orderFoot,
        li {
          justify-content: space-between;
        }

        .topbar {
          margin-bottom: 22px;
        }

        .topbar p {
          margin: 0 0 4px;
          color: #8b5e34;
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
        }

        h1,
        h2,
        ul {
          margin: 0;
        }

        h1 {
          font-size: 34px;
          line-height: 1.1;
        }

        h2 {
          font-size: 20px;
        }

        .alert {
          border: 1px solid #f0b8b8;
          border-radius: 8px;
          background: #fff1f1;
          color: #8a1f1f;
          padding: 12px 14px;
          margin-bottom: 16px;
        }

        .board {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          align-items: start;
        }

        .column {
          min-height: 360px;
          border: 1px solid #d8dee4;
          border-radius: 8px;
          background: #fff;
          padding: 14px;
        }

        .columnTitle {
          margin-bottom: 14px;
        }

        .columnTitle span {
          display: inline-grid;
          min-width: 30px;
          height: 30px;
          place-items: center;
          border-radius: 999px;
          background: #eef2f7;
          font-weight: 800;
        }

        .cards {
          display: grid;
          gap: 12px;
        }

        .orderCard {
          display: grid;
          gap: 14px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 14px;
        }

        .orderHead div {
          display: grid;
          gap: 3px;
        }

        .orderHead strong {
          font-size: 20px;
        }

        .orderHead span,
        .empty,
        em {
          color: #667085;
          font-size: 14px;
        }

        .status {
          border-radius: 999px;
          padding: 4px 10px;
          font-size: 13px;
          font-weight: 800;
        }

        .status.received {
          background: #fff7e8;
          color: #8b5e00;
        }

        .status.preparing {
          background: #e8f1ff;
          color: #174ea6;
        }

        .status.ready {
          background: #eefaf2;
          color: #14532d;
        }

        ul {
          display: grid;
          gap: 8px;
          padding: 0;
          list-style: none;
        }

        li {
          border-bottom: 1px solid #eef0f2;
          padding-bottom: 8px;
        }

        li span {
          display: grid;
          gap: 3px;
        }

        em {
          font-style: normal;
        }

        button {
          min-height: 38px;
          border: 1px solid #b7c2cc;
          border-radius: 8px;
          background: #fff;
          color: #1f2933;
          padding: 0 12px;
          font: inherit;
          font-weight: 700;
          cursor: pointer;
        }

        button:hover:not(:disabled) {
          border-color: #8b5e34;
          color: #6f461f;
        }

        button:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .empty {
          display: grid;
          min-height: 120px;
          place-items: center;
          border: 1px dashed #c9d1d9;
          border-radius: 8px;
        }

        @media (max-width: 980px) {
          .board {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 560px) {
          .topbar {
            align-items: stretch;
            flex-direction: column;
          }

          .actions button {
            flex: 1;
          }

          .orderFoot {
            align-items: stretch;
            flex-direction: column;
          }
        }
      `}</style>
    </main>
  );
}
