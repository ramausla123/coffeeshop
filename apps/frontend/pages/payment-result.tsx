import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { apiUrl } from '../lib/api';
import type { Order } from '../types';

const currency = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

export default function PaymentResult() {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const orderId = typeof router.query.orderId === 'string' ? router.query.orderId : '';
  const table = typeof router.query.table === 'string' ? router.query.table : '';
  const paymentQuery = typeof router.query.payment === 'string' ? router.query.payment : '';

  const state = useMemo(() => {
    if (paymentQuery === 'error') return 'error';
    if (paymentQuery === 'pending') return 'pending';
    if (order?.paymentStatus === 'paid') return 'success';
    if (order?.paymentStatus === 'pending') return 'pending';
    return 'checking';
  }, [order?.paymentStatus, paymentQuery]);

  useEffect(() => {
    if (!orderId) return;

    async function loadOrder() {
      setLoading(true);
      try {
        const res = await fetch(apiUrl(`/orders/${orderId}`));
        const data = await res.json();
        if (res.ok && !data.error) setOrder(data);
      } finally {
        setLoading(false);
      }
    }

    loadOrder();
  }, [orderId]);

  function backToMenu() {
    router.push(table ? `/?table=${encodeURIComponent(table)}` : '/');
  }

  return (
    <main className="page">
      <section className={`panel ${state}`}>
        <p className="eyebrow">Coffee Shop</p>
        <h1>{getTitle(state, loading)}</h1>
        <p className="message">{getMessage(state, loading)}</p>

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
              <span>Status</span>
              <strong>{order.paymentStatus === 'paid' ? 'Lunas' : 'Menunggu'}</strong>
            </div>
          </div>
        )}

        <button type="button" onClick={backToMenu}>
          Kembali ke Menu
        </button>
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
          max-width: 520px;
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
          margin: 10px 0 22px;
          color: #667085;
          line-height: 1.5;
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

        button {
          width: 100%;
          min-height: 46px;
          border: 1px solid #8b5e34;
          border-radius: 8px;
          background: #8b5e34;
          color: #fff;
          font: inherit;
          font-weight: 800;
          cursor: pointer;
        }
      `}</style>
    </main>
  );
}

function getTitle(state: string, loading: boolean) {
  if (loading || state === 'checking') return 'Mengecek pembayaran';
  if (state === 'success') return 'Terima kasih';
  if (state === 'pending') return 'Pembayaran diproses';
  return 'Pembayaran belum berhasil';
}

function getMessage(state: string, loading: boolean) {
  if (loading || state === 'checking') return 'Kami sedang memastikan status pembayaran Anda.';
  if (state === 'success') return 'Pembayaran berhasil. Pesanan Anda sudah masuk ke dapur dan akan segera diproses.';
  if (state === 'pending') return 'Pembayaran masih menunggu konfirmasi. Pesanan akan masuk dapur setelah pembayaran berhasil.';
  return 'Pembayaran belum selesai atau gagal. Anda bisa kembali ke menu dan mencoba lagi, atau hubungi kasir.';
}
