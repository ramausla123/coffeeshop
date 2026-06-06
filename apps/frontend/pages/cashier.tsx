import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { authHeaders, clearToken, fetchProfile, getToken } from '../lib/auth';
import { apiUrl } from '../lib/api';
import { connectWebSocket, getSocket, subscribeToOrders, unsubscribeFromOrders } from '../lib/websocket';
import type { Order } from '../types';

const currency = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export default function Cashier() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentResult, setPaymentResult] = useState<any>(null);

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId),
    [orders, selectedOrderId]
  );

  const change = useMemo(() => {
    if (!selectedOrder || paidAmount < selectedOrder.total) return 0;
    return paidAmount - selectedOrder.total;
  }, [selectedOrder, paidAmount]);

  const unpaidOrders = useMemo(() => {
    return orders.filter((o) => o.paymentStatus === 'pending' || o.paymentStatus !== 'paid');
  }, [orders]);

  useEffect(() => {
    let mounted = true;

    async function initCashier() {
      try {
        const token = getToken();
        if (!token) {
          router.push('/login');
          return;
        }

        const profile = await fetchProfile();
        if (!mounted) return;

        if (!['admin', 'cashier'].includes(profile.role)) {
          clearToken();
          router.push('/login');
          return;
        }

        await fetchOrders();

        // Connect WebSocket
        connectWebSocket();
        const socket = getSocket();

        // Ensure we always have latest orders when we receive websocket updates
        if (socket) {
          subscribeToOrders((event: string, data: any) => {
            if (!mounted) return;

            if (event === 'order:new' || event === 'order:updated' || event === 'order:paid') {
              setError(null)
              setOrders((prev) =>
                prev.some((o) => o.id === data.id)
                  ? prev.map((o) => (o.id === data.id ? data : o))
                  : [data, ...prev]
              );
            } else if (event === 'orders:refresh') {
              setOrders(data);
            }
          });
        }
      } catch {
        clearToken();
        router.push('/login');
      }
    }

    initCashier();

    return () => {
      mounted = false;
      unsubscribeFromOrders();
    };
  }, []);

  async function fetchOrders() {
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

      if (!res.ok) throw new Error('Failed to fetch orders');
      setOrders(await res.json());
    } catch {
      setError('Gagal memuat order. Pastikan backend berjalan dan akun masih valid.');
    } finally {
      setLoading(false);
    }
  }

  async function submitPayment() {
    if (!selectedOrder || !paidAmount || paidAmount < selectedOrder.total || saving) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(apiUrl(`/orders/${selectedOrder.id}/payment`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ paidAmount }),
      });

      if (res.status === 401) {
        clearToken();
        router.push('/login');
        return;
      }

      if (!res.ok) throw new Error('Payment failed');

      const result = await res.json();
      setPaymentResult({
        ...result,
        change,
      });
      setPaidAmount(0);
      setSelectedOrderId(null);
      await fetchOrders();
    } catch {
      setError('Gagal memproses pembayaran. Coba ulang.');
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    clearToken();
    router.push('/login');
  }

  return (
    <main className="page">
      <header className="topbar">
        <div>
          <p>Cashier</p>
          <h1>Payment</h1>
        </div>
        <div className="actions">
          <button type="button" onClick={fetchOrders} disabled={loading}>
            Refresh
          </button>
          <button type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {error && <div className="alert">{error}</div>}

      {paymentResult && (
        <div className="success paymentSummary">
          <div className="paymentHead">
            <div>
              <strong>Order #{paymentResult.id} dibayar</strong>
              <span>Waktu: {dateTimeFormatter.format(new Date(paymentResult.paidAt))}</span>
            </div>
            <div>
              <div>Total: {currency.format(paymentResult.total)}</div>
              <div>Dibayar: {currency.format(paymentResult.paidAmount)}</div>
              <strong style={{ fontSize: 18, color: '#27ae60' }}>Kembalian: {currency.format(paymentResult.change)}</strong>
            </div>
          </div>
          <button onClick={() => setPaymentResult(null)}>Tutup</button>
        </div>
      )}

      <section className="content">
        <div className="panel">
          <h2>Order Belum Dibayar</h2>
          {loading && <p className="muted">Memuat order...</p>}

          {!loading && unpaidOrders.length === 0 && (
            <div className="empty">
              <strong>Tidak ada order yang menunggu pembayaran</strong>
              <span>Semua order sudah lunas.</span>
            </div>
          )}

          <div className="orderList">
            {unpaidOrders.map((order) => (
              <article
                key={order.id}
                className={`orderItem ${selectedOrderId === order.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedOrderId(order.id);
                  setPaidAmount(order.total);
                  setPaymentResult(null);
                }}
              >
                <div className="orderInfo">
                  <div>
                    <strong>Order #{order.id}</strong>
                    <span>
                      Meja {order.table || '-'} • {dateTimeFormatter.format(new Date(order.createdAt || new Date()))}
                    </span>
                  </div>
                  <strong style={{ fontSize: 16 }}>{currency.format(order.total)}</strong>
                </div>
                {order.paymentStatus === 'paid' && <span className="badge">Lunas</span>}
              </article>
            ))}
          </div>
        </div>

        {selectedOrder && (
          <div className="panel paymentForm">
            <h2>Detail Pembayaran</h2>

            <div className="orderDetail">
              <div className="row">
                <span>Order ID</span>
                <strong>#{selectedOrder.id}</strong>
              </div>
              <div className="row">
                <span>Meja</span>
                <strong>{selectedOrder.table || '-'}</strong>
              </div>
              <div className="row">
                <span>Jumlah Item</span>
                <strong>{selectedOrder.items.reduce((sum, i) => sum + i.quantity, 0)}</strong>
              </div>
            </div>

            <div className="orderItems">
              <h3>Item</h3>
              <table>
                <tbody>
                  {selectedOrder.items.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.name}</td>
                      <td>x{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="paymentCalc">
              <div className="row total">
                <span>Total</span>
                <strong>{currency.format(selectedOrder.total)}</strong>
              </div>

              <label>
                <span>Dibayar</span>
                <input
                  type="number"
                  value={paidAmount || ''}
                  onChange={(e) => setPaidAmount(Number(e.target.value))}
                  min={selectedOrder.total}
                  placeholder="0"
                />
              </label>

              <div className="row change" style={{ opacity: paidAmount >= selectedOrder.total ? 1 : 0.5 }}>
                <span>Kembalian</span>
                <strong>{currency.format(change)}</strong>
              </div>

              <button
                type="button"
                onClick={submitPayment}
                disabled={!paidAmount || paidAmount < selectedOrder.total || saving}
                className="payButton"
              >
                {saving ? 'Memproses...' : 'Terima Pembayaran'}
              </button>
            </div>
          </div>
        )}
      </section>

      <style jsx>{`
        .page {
          display: grid;
          min-height: 100%;
          grid-template-rows: auto 1fr;
          background: #f5f5f5;
        }

        .topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #fff;
          border-bottom: 1px solid #e0e0e0;
          padding: 16px 24px;
        }

        .topbar > div:first-child {
          flex: 1;
        }

        .topbar p {
          margin: 0;
          color: #8b5e34;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .topbar h1 {
          margin: 0;
          font-size: 24px;
        }

        .actions {
          display: flex;
          gap: 8px;
        }

        .actions button {
          padding: 8px 16px;
          border: 1px solid #d0d0d0;
          background: #fff;
          border-radius: 6px;
          cursor: pointer;
        }

        .actions button:hover:not(:disabled) {
          background: #f0f0f0;
        }

        .actions button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .alert {
          background: #fee;
          color: #c33;
          padding: 12px 24px;
          border-bottom: 1px solid #fcc;
        }

        .content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          padding: 24px;
          overflow-y: auto;
        }

        @media (max-width: 1024px) {
          .content {
            grid-template-columns: 1fr;
          }
        }

        .panel {
          background: #fff;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .panel h2 {
          margin: 0 0 16px 0;
          font-size: 16px;
          font-weight: 600;
        }

        .panel h3 {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 600;
        }

        .muted {
          color: #999;
          text-align: center;
          padding: 20px;
        }

        .empty {
          display: grid;
          gap: 8px;
          text-align: center;
          padding: 40px 20px;
          color: #999;
        }

        .empty strong {
          color: #666;
          font-weight: 600;
        }

        .success {
          background: #f0f8f0;
          border: 1px solid #d4edda;
          border-radius: 8px;
          padding: 16px;
          margin: 0 24px 24px 24px;
        }

        .paymentSummary {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .paymentHead {
          flex: 1;
        }

        .paymentHead > div {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .paymentHead div strong {
          color: #27ae60;
        }

        .success button {
          padding: 8px 16px;
          background: #27ae60;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .success button:hover {
          background: #229954;
        }

        .orderList {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .orderItem {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .orderItem:hover {
          border-color: #8b5e34;
          background: #fafafa;
        }

        .orderItem.active {
          background: #fff8f0;
          border-color: #8b5e34;
          box-shadow: 0 2px 8px rgba(139, 94, 52, 0.15);
        }

        .orderInfo {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex: 1;
        }

        .orderInfo div span {
          display: block;
          color: #999;
          font-size: 12px;
          margin-top: 4px;
        }

        .badge {
          background: #27ae60;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          margin-left: 12px;
        }

        .paymentForm {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .orderDetail,
        .orderItems,
        .paymentCalc {
          padding: 12px;
          background: #f9f9f9;
          border-radius: 4px;
        }

        .row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 14px;
        }

        .row span {
          color: #666;
        }

        .row.total {
          font-size: 16px;
          font-weight: 600;
          border-top: 1px solid #e0e0e0;
          border-bottom: 1px solid #e0e0e0;
          padding: 12px 0;
        }

        .row.change {
          font-size: 14px;
          font-weight: 600;
          color: #27ae60;
        }

        .orderItems table {
          width: 100%;
          font-size: 13px;
        }

        .orderItems td {
          padding: 6px 0;
          border-bottom: 1px solid #e0e0e0;
        }

        .orderItems td:last-child {
          text-align: right;
          color: #999;
        }

        label {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-weight: 600;
          font-size: 14px;
        }

        input {
          padding: 12px;
          border: 1px solid #d0d0d0;
          border-radius: 4px;
          font-size: 16px;
          font-weight: 600;
        }

        input:focus {
          border-color: #8b5e34;
          outline: none;
          box-shadow: 0 0 0 3px rgba(139, 94, 52, 0.1);
        }

        .payButton {
          padding: 12px;
          background: #27ae60;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .payButton:hover:not(:disabled) {
          background: #229954;
        }

        .payButton:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </main>
  );
}
