import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { authHeaders, clearToken, fetchProfile, getToken } from '../lib/auth';
import { apiUrl } from '../lib/api';
import {
  connectWebSocket,
  getSocket,
  isWebSocketConnected,
  onWebSocketStatusChange,
  subscribeToOrders,
  unsubscribeFromOrders,
} from '../lib/websocket';
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
  const [socketConnected, setSocketConnected] = useState(false);
  const [realtimeReady, setRealtimeReady] = useState(false);
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
    return orders.filter((o) => o.paymentStatus === 'pending' && o.status !== 'canceled');
  }, [orders]);

  useEffect(() => {
    let mounted = true;
    let cleanupSocketStatus: () => void = () => {};

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
        setSocketConnected(isWebSocketConnected());
        cleanupSocketStatus = onWebSocketStatusChange(setSocketConnected);
        setRealtimeReady(true);

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
      cleanupSocketStatus();
    };
  }, []);

  useEffect(() => {
    if (!realtimeReady || socketConnected) return;

    const timer = window.setInterval(() => {
      fetchOrders();
    }, 45000);

    return () => window.clearInterval(timer);
  }, [realtimeReady, socketConnected]);

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

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'Payment failed');
      }

      const result = await res.json();
      setPaymentResult({
        ...result,
        change,
      });
      setPaidAmount(0);
      setSelectedOrderId(null);
      await fetchOrders();
    } catch (err: any) {
      setError(err?.message || 'Gagal memproses pembayaran. Coba ulang.');
    } finally {
      setSaving(false);
    }
  }

  async function cancelSelectedOrder() {
    if (!selectedOrder || saving) return;
    const reason = prompt(`Alasan batalkan order #${selectedOrder.id}?`);
    if (reason === null) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(apiUrl(`/orders/${selectedOrder.id}/cancel`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });

      if (res.status === 401) {
        clearToken();
        router.push('/login');
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'Cancel failed');
      }

      setSelectedOrderId(null);
      setPaidAmount(0);
      await fetchOrders();
    } catch (err: any) {
      setError(err?.message || 'Gagal membatalkan order.');
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
          <span className={`connection ${socketConnected ? 'online' : 'offline'}`}>
            {socketConnected ? 'Realtime' : 'Sync cadangan'}
          </span>
          <button type="button" onClick={fetchOrders} disabled={loading}>
            Refresh
          </button>
          <button type="button" onClick={() => router.push('/account')}>
            Akun
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
            <div className="paymentAmounts">
              <div>Total: {currency.format(paymentResult.total)}</div>
              <div>Dibayar: {currency.format(paymentResult.paidAmount)}</div>
              <strong>Kembalian: {currency.format(paymentResult.change)}</strong>
            </div>
          </div>
          <button onClick={() => setPaymentResult(null)}>Tutup</button>
        </div>
      )}

      <section className="content">
        <div className="panel">
          <div className="panelHead">
            <div>
              <h2>Order Belum Dibayar</h2>
              <span>{unpaidOrders.length} menunggu konfirmasi</span>
            </div>
          </div>
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
                  <strong>{currency.format(order.total)}</strong>
                </div>
                <div className="orderBadges">
                  <span className={`methodBadge ${getPaymentMethodTone(order.paymentMethod)}`}>
                    {formatPaymentMethod(order.paymentMethod)}
                  </span>
                  {order.status === 'pending_payment' && <span className="badge pending">Menunggu bayar</span>}
                  {order.paymentStatus === 'paid' && <span className="badge">Lunas</span>}
                </div>
              </article>
            ))}
          </div>
        </div>

        {selectedOrder && (
          <div className="panel paymentForm">
            <div className="panelHead">
              <div>
                <h2>Detail Pembayaran</h2>
                <span>Order #{selectedOrder.id}</span>
              </div>
            </div>

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
              <div className="row">
                <span>Metode</span>
                <strong className={`methodText ${getPaymentMethodTone(selectedOrder.paymentMethod)}`}>
                  {formatPaymentMethod(selectedOrder.paymentMethod)}
                </strong>
              </div>
            </div>

            <div className="orderItems">
              <h3>Item</h3>
              <table>
                <tbody>
                  {selectedOrder.items.map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <span>{item.name}</span>
                        {item.note && <em>{item.note}</em>}
                      </td>
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
              <button
                type="button"
                onClick={cancelSelectedOrder}
                disabled={saving}
                className="cancelButton"
              >
                Batalkan Order
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

        .orderBadges {
          display: flex;
          align-items: flex-start;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 8px;
        }

        .methodBadge {
          border: 1px solid #d8dee4;
          border-radius: 999px;
          background: #fff;
          color: #344054;
          padding: 5px 9px;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }

        .methodBadge.cash,
        .methodText.cash {
          border-color: #f1d5b8;
          background: #fff7ed;
          color: #8b5e34;
        }

        .methodBadge.online,
        .methodText.online {
          border-color: #c7d7fe;
          background: #eef4ff;
          color: #3538cd;
        }

        .methodBadge.card,
        .methodText.card {
          border-color: #d9d6fe;
          background: #f4f3ff;
          color: #5925dc;
        }

        .methodText {
          justify-self: end;
          border: 1px solid #d8dee4;
          border-radius: 999px;
          background: #fff;
          color: #344054;
          padding: 4px 9px;
          font-size: 13px;
        }

        .badge.pending {
          background: #f59e0b;
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

        .orderItems td:first-child {
          display: grid;
          gap: 2px;
        }

        .orderItems em {
          color: #777;
          font-size: 12px;
          font-style: normal;
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

        .cancelButton {
          padding: 12px;
          background: #fff;
          color: #c33;
          border: 1px solid #f0b8b8;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        .cancelButton:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .page {
          display: block;
          max-width: none;
          min-height: 100%;
          margin: 0;
          background: #f6f7f9;
          color: #111827;
          padding: 24px;
        }

        .topbar {
          max-width: 1180px;
          margin: 0 auto 18px;
          gap: 18px;
          border-bottom: 0;
          background: transparent;
          padding: 0;
        }

        .topbar p {
          margin: 0 0 4px;
          font-weight: 800;
          letter-spacing: 0;
        }

        .topbar h1 {
          font-size: 30px;
          line-height: 1.1;
        }

        .actions {
          align-items: center;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .connection {
          display: inline-flex;
          align-items: center;
          min-height: 34px;
          border: 1px solid #d8dee4;
          border-radius: 8px;
          background: #fff;
          padding: 0 10px;
          color: #667085;
          font-size: 13px;
          font-weight: 700;
        }

        .connection.online {
          border-color: #b7e4c7;
          color: #16803c;
        }

        .connection.offline {
          border-color: #f2c5a8;
          color: #a24c16;
        }

        .actions button {
          min-height: 34px;
          border-radius: 8px;
          padding: 0 14px;
          font: inherit;
          font-weight: 700;
        }

        .alert {
          max-width: 1180px;
          margin: 0 auto 14px;
          border: 1px solid #f0b8b8;
          border-radius: 8px;
          background: #fff1f1;
          color: #8a1f1f;
          padding: 12px 14px;
        }

        .content {
          grid-template-columns: minmax(0, 1fr) 420px;
          align-items: start;
          max-width: 1180px;
          margin: 0 auto;
          gap: 18px;
          padding: 0;
          overflow: visible;
        }

        .panel {
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
        }

        .panelHead {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
        }

        .panel h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 800;
        }

        .panelHead span {
          display: inline-block;
          margin-top: 4px;
          color: #667085;
          font-size: 13px;
        }

        .empty {
          min-height: 180px;
          place-items: center;
          border: 1px dashed #cfd8e3;
          border-radius: 8px;
          padding: 28px 20px;
          color: #667085;
        }

        .empty strong {
          color: #344054;
          font-weight: 800;
        }

        .success {
          max-width: 1180px;
          margin: 0 auto 16px;
          border-color: #bbf7d0;
          background: #f0fdf4;
          padding: 14px 16px;
        }

        .paymentSummary {
          gap: 16px;
        }

        .paymentHead {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 24px;
        }

        .paymentHead > div {
          margin-bottom: 0;
        }

        .paymentHead > div:first-child {
          display: grid;
          gap: 4px;
        }

        .paymentHead strong {
          color: #15803d;
        }

        .paymentHead span,
        .paymentAmounts {
          color: #475467;
          font-size: 14px;
        }

        .paymentAmounts {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 12px;
        }

        .paymentAmounts strong {
          color: #15803d;
          font-size: 16px;
        }

        .success button {
          min-height: 34px;
          border-radius: 8px;
          padding: 0 14px;
          font: inherit;
          font-weight: 800;
        }

        .orderList {
          display: grid;
        }

        .orderItem {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: start;
          gap: 10px;
          border-color: #e5e7eb;
          border-radius: 8px;
          padding: 14px;
          background: #fff;
        }

        .orderItem:hover {
          background: #fffaf5;
        }

        .orderItem.active {
          background: #fff7ed;
          box-shadow: 0 0 0 3px rgba(139, 94, 52, 0.1);
        }

        .orderInfo {
          display: grid;
          align-items: start;
          gap: 10px;
        }

        .orderInfo div span {
          color: #667085;
          font-size: 13px;
        }

        .orderInfo > strong {
          font-size: 18px;
        }

        .badge {
          align-self: start;
          border-radius: 999px;
          padding: 5px 9px;
          background: #16a34a;
          font-weight: 800;
          white-space: nowrap;
        }

        .orderBadges {
          margin-left: auto;
        }

        .paymentForm {
          position: sticky;
          top: 20px;
          display: grid;
        }

        .orderDetail,
        .orderItems,
        .paymentCalc {
          border: 1px solid #eef2f6;
          border-radius: 8px;
          background: #f8fafc;
          padding: 14px;
        }

        .row.total {
          font-size: 18px;
          border-color: #d8dee4;
        }

        .orderItems table {
          border-collapse: collapse;
        }

        label {
          display: grid;
          font-weight: 800;
        }

        input {
          min-height: 46px;
          border-radius: 8px;
          font-weight: 800;
        }

        .payButton {
          min-height: 46px;
          border-radius: 8px;
          background: #16a34a;
          font-weight: 800;
        }

        .cancelButton {
          min-height: 42px;
          border-radius: 8px;
          color: #b42318;
          font-weight: 800;
        }

        .page {
          padding: 22px 24px 28px;
        }

        .topbar {
          margin-bottom: 20px;
        }

        .topbar h1 {
          font-size: 28px;
        }

        .connection,
        .actions button {
          min-height: 36px;
        }

        .panel {
          padding: 18px 20px;
        }

        .panelHead {
          margin-bottom: 14px;
        }

        .orderList {
          gap: 10px;
        }

        .orderItem {
          align-items: center;
          gap: 14px;
          padding: 16px;
        }

        .orderInfo {
          gap: 8px;
        }

        .orderInfo > strong {
          font-size: 20px;
          line-height: 1.1;
        }

        .paymentForm {
          gap: 14px;
        }

        .orderDetail {
          display: grid;
          gap: 4px;
        }

        .paymentCalc {
          display: grid;
          gap: 10px;
        }

        .row {
          align-items: center;
          padding: 7px 0;
        }

        .orderItems h3 {
          margin-bottom: 10px;
        }

        .orderItems td {
          padding: 8px 0;
        }

        label {
          gap: 7px;
        }

        input {
          min-height: 52px;
          font-size: 18px;
        }

        .payButton,
        .cancelButton {
          min-height: 46px;
          width: 100%;
        }

        .paymentCalc .payButton + .cancelButton {
          margin-top: -2px;
        }

        @media (min-width: 1025px) {
          .content {
            grid-template-columns: minmax(0, 1fr) 430px;
          }
        }

        @media (max-width: 1024px) {
          .content {
            grid-template-columns: 1fr;
          }

          .paymentForm {
            position: static;
          }
        }

        @media (max-width: 680px) {
          .page {
            padding: 18px 14px;
          }

          .topbar,
          .paymentSummary {
            align-items: stretch;
            flex-direction: column;
          }

          .paymentHead {
            grid-template-columns: 1fr;
          }

          .actions {
            justify-content: flex-start;
          }

          .actions button {
            flex: 1;
          }

          .paymentAmounts {
            justify-content: flex-start;
          }

          .orderItem {
            grid-template-columns: 1fr;
          }

          .orderBadges {
            justify-content: flex-start;
          }
        }
      `}</style>
    </main>
  );
}

function formatPaymentMethod(method?: string) {
  const labels: Record<string, string> = {
    cash: 'Cash di Kasir',
    midtrans: 'Online',
    qris: 'QRIS',
    gopay: 'GoPay QRIS',
    shopeepay: 'ShopeePay QRIS',
    bank_transfer: 'Virtual Account',
    echannel: 'Mandiri Bill',
    permata_va: 'Permata VA',
    bca_va: 'BCA VA',
    credit_card: 'Kartu',
  };
  return method ? labels[method] || method : '-';
}

function getPaymentMethodTone(method?: string) {
  if (method === 'cash') return 'cash';
  if (method === 'credit_card') return 'card';
  if (method) return 'online';
  return '';
}
