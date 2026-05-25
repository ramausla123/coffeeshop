import React, { useEffect, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
  // Create simple beep using Web Audio API
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
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [prevOrderIds, setPrevOrderIds] = useState<Set<number>>(new Set());

  async function fetchOrders() {
    setLoading(true);
    const res = await fetch('http://localhost:4000/orders');
    const data = await res.json();
    
    // Detect new orders
    const newOrderIds = new Set(data.map((o: Order) => o.id));
    const newOrders = data.filter((o: Order) => !prevOrderIds.has(o.id));
    
    if (newOrders.length > 0) {
      newOrders.forEach((order: Order) => {
        playNotificationSound();
        const itemsDesc = order.items.map((i: OrderItem) => `${i.name} x${i.quantity}`).join(', ');
        toast.info(
          `🍽️ Order Baru: #${order.id} - Meja ${order.table || '-'}\n${itemsDesc}`,
          { position: 'top-right', autoClose: 5000 }
        );
      });
    }
    
    setPrevOrderIds(newOrderIds);
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
    await fetch(`http://localhost:4000/orders/${order.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    fetchOrders();
  }

  return (
    <main style={{ padding: 32, fontFamily: 'Inter, system-ui' }}>
      <ToastContainer />
      <h1>KDS — Kitchen Display System</h1>
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
