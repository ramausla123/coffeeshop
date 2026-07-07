import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { apiUrl } from '../lib/api';
import { connectWebSocket, subscribeToOrders, unsubscribeFromOrders } from '../lib/websocket';
import type { Order } from '../types';

const currency = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

export default function OrderStatusPage() {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const orderId = typeof router.query.orderId === 'string' ? router.query.orderId : '';
  const table = typeof router.query.table === 'string' ? router.query.table : '';
  const paymentQuery = typeof router.query.payment === 'string' ? router.query.payment : '';

  const state = useMemo(() => {
    if (paymentQuery === 'error') return 'error';
    if (order?.paymentStatus === 'paid') return 'success';
    if (order?.status === 'canceled') return 'error';
    if (paymentQuery === 'cash') return 'cash';
    return 'pending';
  }, [order?.paymentStatus, order?.status, paymentQuery]);

  useEffect(() => {
    if (!orderId) return;
    loadOrder();
  }, [orderId]);

  useEffect(() => {
    if (!orderId || order?.paymentStatus === 'paid' || order?.status === 'canceled') return;

    const timer = window.setInterval(() => {
      loadOrder();
    }, 10000);

    return () => window.clearInterval(timer);
  }, [order?.paymentStatus, order?.status, orderId]);

  useEffect(() => {
    if (!orderId) return;

    connectWebSocket();
    subscribeToOrders((event, data: Order) => {
      if ((event === 'order:updated' || event === 'order:paid') && data?.id === Number(orderId)) {
        setOrder(data);
      }
    });

    return () => unsubscribeFromOrders();
  }, [orderId]);

  async function loadOrder() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(apiUrl(`/orders/${orderId}`));
      const data = await res.json();
      if (!res.ok || data.error) throw new Error('Order not found');
      setOrder(data);
    } catch {
      setError('Order tidak ditemukan. Silakan hubungi kasir.');
    } finally {
      setLoading(false);
    }
  }

  function backToMenu() {
    if (order?.paymentStatus === 'paid') {
      window.localStorage.removeItem('coffee_checkout');
    }
    router.push(table ? `/?table=${encodeURIComponent(table)}` : '/');
  }

  function changePaymentMethod() {
    const hasCheckoutDraft = typeof window !== 'undefined' && window.localStorage.getItem('coffee_checkout');
    if (hasCheckoutDraft) {
      router.push(`/checkout${table ? `?table=${encodeURIComponent(table)}` : ''}`);
      return;
    }
    backToMenu();
  }

  return (
    <main className="page">
      <section className={`panel ${state}`}>
        <p className="eyebrow">Coffee Shop</p>
        <h1>{getTitle(state, loading)}</h1>
        <p className="message">{getMessage(state, loading)}</p>

        {error && <div className="alert">{error}</div>}

        {order && (
          <div className="summary">
            <div>
              <span>Order</span>
              <strong>#{order.id}</strong>
            </div>
            <div>
              <span>Meja</span>
              <strong>{order.table || '-'}</strong>
            </div>
            <div>
              <span>Total</span>
              <strong>{currency.format(order.total)}</strong>
            </div>
            <div>
              <span>Pembayaran</span>
              <strong>{order.paymentStatus === 'paid' ? 'Lunas' : 'Menunggu'}</strong>
            </div>
            <div>
              <span>Dapur</span>
              <strong>{formatOrderStatus(order.status)}</strong>
            </div>
          </div>
        )}

        <div className="actions">
          {order?.paymentStatus === 'pending' && (
            <button type="button" className="primary" onClick={changePaymentMethod}>
              Ganti Metode Pembayaran
            </button>
          )}
          <button type="button" onClick={backToMenu}>
            Kembali ke Menu
          </button>
        </div>
      </section>

      <style jsx>{`
        .page {
          display: grid;
          min-height: 100%;
          max-width: none;
          margin: 0;
          place-items: center;
          background: #f6f7f9;
          padding: 24px;
          color: #111827;
        }

        .panel {
          width: 100%;
          max-width: 540px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #fff;
          padding: 28px;
          box-shadow: 0 12px 30px rgba(16, 24, 40, 0.08);
        }

        .panel.success {
          border-color: #bbf7d0;
        }

        .panel.error {
          border-color: #fecaca;
        }

        .eyebrow {
          margin: 0 0 8px;
          color: #8b5e34;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
        }

        h1 {
          margin: 0;
          font-size: 30px;
          line-height: 1.15;
        }

        .message {
          margin: 10px 0 20px;
          color: #667085;
          line-height: 1.5;
        }

        .alert {
          border: 1px solid #f0b8b8;
          border-radius: 8px;
          background: #fff1f1;
          color: #8a1f1f;
          padding: 10px 12px;
          margin-bottom: 14px;
        }

        .summary {
          display: grid;
          gap: 10px;
          border: 1px solid #eef2f6;
          border-radius: 8px;
          background: #f8fafc;
          padding: 14px;
          margin-bottom: 18px;
        }

        .summary div {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
        }

        .summary span {
          color: #667085;
        }

        .actions {
          display: grid;
          gap: 10px;
        }

        button {
          width: 100%;
          min-height: 46px;
          border: 1px solid #b7c2cc;
          border-radius: 8px;
          background: #fff;
          color: #1f2933;
          font: inherit;
          font-weight: 800;
          cursor: pointer;
        }

        button.primary {
          border-color: #8b5e34;
          background: #8b5e34;
          color: #fff;
        }

        button:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }
      `}</style>
    </main>
  );
}

function getTitle(state: string, loading: boolean) {
  if (loading) return 'Mengecek order';
  if (state === 'success') return 'Terima kasih';
  if (state === 'cash') return 'Silakan bayar di kasir';
  if (state === 'error') return 'Pembayaran belum berhasil';
  return 'Menunggu pembayaran';
}

function getMessage(state: string, loading: boolean) {
  if (loading) return 'Kami sedang mengambil status order Anda.';
  if (state === 'success') return 'Pembayaran berhasil. Pesanan Anda sudah masuk ke dapur dan akan segera diproses.';
  if (state === 'cash') return 'Tunjukkan nomor order ini ke kasir untuk pembayaran cash. Pesanan akan masuk dapur setelah kasir mengonfirmasi pembayaran.';
  if (state === 'error') return 'Pembayaran belum selesai atau gagal. Anda bisa mencoba pembayaran lagi atau hubungi kasir.';
  return 'Pesanan belum masuk dapur. Halaman ini akan memperbarui status otomatis setelah pembayaran dikonfirmasi.';
}

function formatOrderStatus(status: Order['status']) {
  const labels: Record<Order['status'], string> = {
    pending_payment: 'Menunggu bayar',
    received: 'Baru',
    preparing: 'Diproses',
    ready: 'Siap',
    served: 'Selesai',
    canceled: 'Batal',
  };
  return labels[status];
}
