import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { apiUrl } from '../lib/api';

type CheckoutItem = {
  id: number;
  menuId: number;
  name: string;
  price: number;
  qty: number;
  note: string;
};

type CheckoutDraft = {
  table?: string;
  items?: CheckoutItem[];
  orderId?: number;
};

const currency = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CheckoutItem[]>([]);
  const [table, setTable] = useState('');
  const [orderId, setOrderId] = useState<number | null>(null);
  const [paymentChoice, setPaymentChoice] = useState<'online' | 'cash'>('online');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const total = useMemo(() => items.reduce((sum, item) => sum + item.price * item.qty, 0), [items]);
  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.qty, 0), [items]);

  useEffect(() => {
    const raw = window.localStorage.getItem('coffee_checkout');
    if (!raw) {
      router.replace('/');
      return;
    }

    try {
      const draft = JSON.parse(raw) as CheckoutDraft;
      setItems(Array.isArray(draft.items) ? draft.items : []);
      setTable(typeof draft.table === 'string' ? draft.table : '');
      setOrderId(typeof draft.orderId === 'number' ? draft.orderId : null);
    } catch {
      router.replace('/');
    }
  }, [router]);

  async function submitOrder() {
    if (items.length === 0 || submitting) return;

    setSubmitting(true);
    setError('');

    try {
      const activeOrderId = orderId ?? await createOrder();

      if (paymentChoice === 'cash') {
        await updatePaymentMethod(activeOrderId, 'cash');
      }

      if (paymentChoice === 'cash') {
        router.push(`/order-status?orderId=${activeOrderId}${table ? `&table=${encodeURIComponent(table)}` : ''}&payment=cash`);
        return;
      }

      await updatePaymentMethod(activeOrderId, 'midtrans');
      const paymentRes = await fetch(apiUrl('/payments/midtrans/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: activeOrderId }),
      });
      const paymentData = await paymentRes.json();
      if (!paymentRes.ok || !paymentData.redirectUrl) throw new Error(paymentData?.message || 'Payment request failed');

      window.location.href = paymentData.redirectUrl;
    } catch {
      setError('Gagal membuat order atau pembayaran. Silakan coba lagi.');
      setSubmitting(false);
    }
  }

  async function createOrder() {
    const res = await fetch(apiUrl('/orders'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: table || undefined,
        paymentMethod: paymentChoice === 'cash' ? 'cash' : 'midtrans',
        items: items.map((item) => ({
          menuId: item.menuId,
          quantity: item.qty,
          note: item.note?.trim() || undefined,
        })),
      }),
    });

    const order = await res.json();
    if (!res.ok) throw new Error(order?.message || 'Order request failed');

    const nextOrderId = Number(order.id);
    if (!Number.isFinite(nextOrderId)) throw new Error('Invalid order id');

    setOrderId(nextOrderId);
    window.localStorage.setItem('coffee_checkout', JSON.stringify({
      table,
      items,
      orderId: nextOrderId,
    }));

    return nextOrderId;
  }

  async function updatePaymentMethod(activeOrderId: number, method: 'cash' | 'midtrans') {
    const res = await fetch(apiUrl(`/orders/${activeOrderId}/payment-method`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethod: method }),
    });

    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data?.message || 'Payment method request failed');
  }

  function editOrder() {
    if (orderId) {
      router.push(`/order-status?orderId=${orderId}${table ? `&table=${encodeURIComponent(table)}` : ''}`);
      return;
    }
    router.push(table ? `/?table=${encodeURIComponent(table)}` : '/');
  }

  return (
    <main className="page">
      <header className="header">
        <div>
          <p className="eyebrow">Coffee Shop</p>
          <h1>Checkout</h1>
        </div>
        <button type="button" onClick={editOrder}>{orderId ? 'Kembali ke Status' : 'Ubah Pesanan'}</button>
      </header>

      {error && <div className="alert">{error}</div>}

      <section className="content">
        <div className="panel">
          <div className="sectionTitle">
            <div>
              <h2>Final Pesanan</h2>
              <span>Meja {table || '-'} - {itemCount} item</span>
            </div>
          </div>

          <div className="items">
            {items.map((item) => (
              <article className="item" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  {item.note && <span>{item.note}</span>}
                </div>
                <div className="itemTotal">
                  <span>x{item.qty}</span>
                  <strong>{currency.format(item.price * item.qty)}</strong>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="panel summary">
          <h2>Pembayaran</h2>
          <div className="total">
            <span>Total</span>
            <strong>{currency.format(total)}</strong>
          </div>

          <div className="paymentChoice" aria-label="Pilihan pembayaran">
            <button
              type="button"
              className={paymentChoice === 'online' ? 'active' : ''}
              onClick={() => setPaymentChoice('online')}
            >
              Bayar Online
            </button>
            <button
              type="button"
              className={paymentChoice === 'cash' ? 'active' : ''}
              onClick={() => setPaymentChoice('cash')}
            >
              Cash di Kasir
            </button>
          </div>

          <p className="hint">
            {paymentChoice === 'cash'
              ? 'Tunjukkan nomor order ke kasir. Pesanan masuk dapur setelah pembayaran dikonfirmasi.'
              : 'Anda akan diarahkan ke halaman pembayaran aman Midtrans.'}
          </p>

          <button className="submit" type="button" onClick={submitOrder} disabled={items.length === 0 || submitting}>
            {submitting ? 'Memproses...' : paymentChoice === 'cash' ? 'Buat Order Cash' : 'Bayar Sekarang'}
          </button>
        </aside>
      </section>

      <style jsx>{`
        .page {
          max-width: 1080px;
          margin: 0 auto;
          padding: 32px 20px 48px;
          color: #111827;
        }

        .header,
        .sectionTitle,
        .item,
        .itemTotal,
        .total {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
        }

        .header {
          margin-bottom: 22px;
        }

        .eyebrow {
          margin: 0 0 4px;
          color: #8b5e34;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
        }

        h1,
        h2,
        p {
          margin: 0;
        }

        h1 {
          font-size: 32px;
          line-height: 1.1;
        }

        h2 {
          font-size: 20px;
        }

        .content {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 360px;
          gap: 20px;
          align-items: start;
        }

        .panel {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #fff;
          padding: 18px;
        }

        .sectionTitle span,
        .item span,
        .hint {
          color: #667085;
          font-size: 14px;
          line-height: 1.45;
        }

        .items {
          display: grid;
          gap: 10px;
          margin-top: 16px;
        }

        .item {
          border: 1px solid #eef2f6;
          border-radius: 8px;
          background: #f8fafc;
          padding: 14px;
        }

        .item div:first-child {
          display: grid;
          gap: 4px;
        }

        .itemTotal {
          align-items: flex-end;
          flex-direction: column;
          gap: 4px;
        }

        .summary {
          position: sticky;
          top: 20px;
          display: grid;
          gap: 16px;
        }

        .total {
          border-top: 1px solid #e5e7eb;
          border-bottom: 1px solid #e5e7eb;
          padding: 14px 0;
          font-size: 18px;
        }

        .paymentChoice {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        button {
          min-height: 40px;
          border: 1px solid #b7c2cc;
          border-radius: 8px;
          background: #fff;
          color: #1f2933;
          padding: 0 12px;
          font: inherit;
          font-weight: 800;
          cursor: pointer;
        }

        .paymentChoice button.active {
          border-color: #8b5e34;
          background: #fff7ed;
          color: #6f461f;
        }

        .submit {
          min-height: 48px;
          border-color: #8b5e34;
          background: #8b5e34;
          color: #fff;
        }

        button:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .alert {
          border: 1px solid #f0b8b8;
          border-radius: 8px;
          background: #fff1f1;
          color: #8a1f1f;
          padding: 12px 14px;
          margin-bottom: 16px;
        }

        @media (max-width: 820px) {
          .header {
            align-items: stretch;
            flex-direction: column;
          }

          .content {
            grid-template-columns: 1fr;
          }

          .summary {
            position: static;
          }
        }
      `}</style>
    </main>
  );
}
