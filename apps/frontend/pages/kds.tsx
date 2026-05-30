import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { authHeaders, clearToken, getToken } from '../lib/auth';

interface OrderItem {
  menuId: number;
  name?: string;
  quantity: number;
  note?: string;
}
interface Order {
  id: number;
  table?: string;
  items: OrderItem[];
  status: 'received' | 'preparing' | 'ready' | 'served';
  total: number;
}

const statusFlow = ['received', 'preparing', 'ready', 'served'] as const;

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
  const [loading, setLoading] = useState(false);
  const notifiedOrderIds = useRef<Set<number>>(new Set());

  async function fetchOrders() {
    if (!getToken()) {
      router.push('/login');
      return;
    }

    setLoading(true);
    const res = await fetch('http://localhost:4000/orders', {
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    });

    if (res.status === 401) {
      clearToken();
      router.push('/login');
      return;
    }

    const data = await res.json();
    const newOrders = data.filter((o: Order) => !notifiedOrderIds.current.has(o.id));

    if (newOrders.length > 0) {
      newOrders.forEach((order: Order) => {
        notifiedOrderIds.current.add(order.id);
        playNotificationSound();
        const itemsDesc = order.items.map((i: OrderItem) => `${i.name} x${i.quantity}`).join(', ');
        toast.info(`🍽️ Order Baru: #${order.id} - Meja ${order.table || '-'}\n${itemsDesc}`, {
          position: 'top-right',
          autoClose: 5000,
        });
      });
    }

    setOrders(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchOrders();
    const intv = setInterval(fetchOrders, 3000);
    return () => clearInterval(intv);
  }, []);

  async function nextStatus(order: Order) {
    const idx = statusFlow.indexOf(order.status);
    if (idx === -1 || idx === statusFlow.length - 1) return;
    const next = statusFlow[idx + 1];

    const res = await fetch(`http://localhost:4000/orders/${order.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ status: next }),
    });

    if (res.status === 401) {
      clearToken();
      router.push('/login');
      return;
    }

    fetchOrders();
  }

  function logout() {
    clearToken();
    router.push('/login');
  }

  return (
    <main style={{ padding: 32, fontFamily: 'Inter, system-ui' }}>
      <ToastContainer />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1>KDS — Kitchen Display System</h1>
        <button onClick={logout}>Logout</button>
      </div>
      <button onClick={fetchOrders} disabled={loading} style={{ marginBottom: 16 }}>
        Refresh
      </button>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
        {orders.map((order) => (
          <div key={order.id} style={{ border: '1px solid #ccc', borderRadius: 8, padding: 16, minWidth: 260 }}>
            <div><strong>Order #{order.id}</strong> — Table: {order.table || '-'}</div>
            <div>Status: <b>{order.status}</b></div>
            <ul>
              {order.items.map((item, idx) => (
                <li key={idx}><strong>{item.name}</strong> x {item.quantity}</li>
              ))}
            </ul>
            <div>Total: Rp {order.total}</div>
            {order.status !== 'served' && (
              <button onClick={() => nextStatus(order)} style={{ marginTop: 8 }}>
                Next: {statusFlow[statusFlow.indexOf(order.status) + 1]}
              </button>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
