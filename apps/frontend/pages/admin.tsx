import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { authHeaders, clearToken, fetchProfile, getToken } from '../lib/auth';
import { apiUrl } from '../lib/api';
import { connectWebSocket, getSocket, subscribeToOrders, unsubscribeFromOrders } from '../lib/websocket';
import type { MenuItem, Order, OrderStatus } from '../types';

const currency = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

const emptyForm = { name: '', price: 0, description: '' };
type OrderFilter = 'all' | OrderStatus;
type DateFilter = 'today' | 'all';

const orderFilters: { value: OrderFilter; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'received', label: 'Baru' },
  { value: 'preparing', label: 'Diproses' },
  { value: 'ready', label: 'Siap' },
  { value: 'served', label: 'Selesai' },
];

const dateFilters: { value: DateFilter; label: string }[] = [
  { value: 'today', label: 'Hari ini' },
  { value: 'all', label: 'Semua tanggal' },
];

const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export default function Admin() {
  const router = useRouter();
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [formData, setFormData] = useState(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');

  const stats = useMemo(() => {
    const byStatus = orders.reduce(
      (acc, order) => {
        acc[order.status] += 1;
        return acc;
      },
      { received: 0, preparing: 0, ready: 0, served: 0 },
    );

    return {
      totalSales: orders.reduce((sum, order) => sum + order.total, 0),
      totalOrders: orders.length,
      byStatus,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus = orderFilter === 'all' || order.status === orderFilter;
      const matchesDate = dateFilter === 'all' || isToday(order.createdAt);
      return matchesStatus && matchesDate;
    });
  }, [dateFilter, orderFilter, orders]);

  useEffect(() => {
    let mounted = true;

    async function initAdmin() {
      try {
        const token = getToken();
        if (!token) {
          router.push('/login');
          return;
        }

        const profile = await fetchProfile();
        if (!mounted) return;

        if (profile.role === 'kitchen') {
          router.push('/kds');
          return;
        }

        if (profile.role !== 'admin') {
          clearToken();
          router.push('/login');
          return;
        }

        await fetchData();

        // Connect WebSocket
        connectWebSocket();
        const socket = getSocket();

        if (socket) {
          subscribeToOrders((event: string, data: any) => {
            if (!mounted) return;

            if (event === 'order:new') {
              setOrders((prev) => [data, ...prev]);
            } else if (event === 'order:updated') {
              setOrders((prev) =>
                prev.map((o) => (o.id === data.id ? data : o))
              );
            } else if (event === 'order:paid') {
              setOrders((prev) =>
                prev.map((o) => (o.id === data.id ? data : o))
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

    initAdmin();

    return () => {
      mounted = false;
      unsubscribeFromOrders();
    };
  }, []);

  async function fetchData() {
    setLoading(true);
    setError(null);

    try {
      const [menuRes, ordersRes] = await Promise.all([
        fetch(apiUrl('/menu'), { headers: authHeaders() }),
        fetch(apiUrl('/orders'), { headers: { ...authHeaders(), 'Content-Type': 'application/json' } }),
      ]);

      if (menuRes.status === 401 || ordersRes.status === 401) {
        clearToken();
        router.push('/login');
        return;
      }

      if (!menuRes.ok || !ordersRes.ok) throw new Error('Request failed');

      setMenu(await menuRes.json());
      setOrders(await ordersRes.json());
    } catch {
      setError('Gagal memuat dashboard. Pastikan backend berjalan dan akun Anda valid.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name || formData.price <= 0 || saving) return;

    setSaving(true);
    setError(null);

    const url = editId ? apiUrl(`/menu/${editId}`) : apiUrl('/menu');
    const method = editId ? 'PATCH' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(formData),
      });

      if (res.status === 401) {
        clearToken();
        router.push('/login');
        return;
      }

      if (!res.ok) throw new Error('Save failed');

      setEditId(null);
      setFormData(emptyForm);
      await fetchData();
    } catch {
      setError('Gagal menyimpan item menu. Pastikan Anda login sebagai admin.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Hapus item menu?')) return;

    try {
      const res = await fetch(apiUrl(`/menu/${id}`), {
        method: 'DELETE',
        headers: authHeaders(),
      });

      if (res.status === 401) {
        clearToken();
        router.push('/login');
        return;
      }

      if (!res.ok) throw new Error('Delete failed');
      await fetchData();
    } catch {
      setError('Gagal menghapus item menu.');
    }
  }

  function handleEdit(item: MenuItem) {
    setFormData({ name: item.name, price: item.price, description: item.description || '' });
    setEditId(item.id);
  }

  function cancelEdit() {
    setEditId(null);
    setFormData(emptyForm);
  }

  function handleLogout() {
    clearToken();
    router.push('/login');
  }

  return (
    <main className="page">
      <header className="topbar">
        <div>
          <p>Admin</p>
          <h1>Dashboard</h1>
        </div>
        <div className="actions">
          <button type="button" onClick={fetchData} disabled={loading}>
            Refresh
          </button>
          <button type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {error && <div className="alert">{error}</div>}

      <section className="stats">
        <article>
          <span>Total Penjualan</span>
          <strong>{currency.format(stats.totalSales)}</strong>
        </article>
        <article>
          <span>Total Order</span>
          <strong>{stats.totalOrders}</strong>
        </article>
        <article>
          <span>Baru</span>
          <strong>{stats.byStatus.received}</strong>
        </article>
        <article>
          <span>Proses</span>
          <strong>{stats.byStatus.preparing}</strong>
        </article>
      </section>

      <section className="content">
        <div className="panel">
          <div className="sectionTitle">
            <h2>Menu Management</h2>
            {editId && <span>Editing #{editId}</span>}
          </div>

          <form className="menuForm" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Nama menu"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <input
              type="number"
              placeholder="Harga"
              value={formData.price || ''}
              onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
            />
            <input
              type="text"
              placeholder="Deskripsi"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <button type="submit" disabled={saving || !formData.name || formData.price <= 0}>
              {saving ? 'Menyimpan...' : editId ? 'Update' : 'Tambah'}
            </button>
            {editId && (
              <button type="button" onClick={cancelEdit}>
                Batal
              </button>
            )}
          </form>

          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Harga</th>
                  <th>Deskripsi</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {menu.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{currency.format(item.price)}</td>
                    <td>{item.description || '-'}</td>
                    <td>
                      <div className="rowActions">
                        <button type="button" onClick={() => handleEdit(item)}>
                          Edit
                        </button>
                        <button type="button" className="danger" onClick={() => handleDelete(item.id)}>
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && menu.length === 0 && (
                  <tr>
                    <td colSpan={4}>Menu masih kosong.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="sectionTitle">
            <div>
              <h2>Order Report</h2>
              {loading && <span>Memuat...</span>}
            </div>
            <div className="filters">
              <div className="filterGroup" aria-label="Filter tanggal order">
                {dateFilters.map((filter) => (
                  <button
                    type="button"
                    key={filter.value}
                    className={dateFilter === filter.value ? 'active' : ''}
                    onClick={() => setDateFilter(filter.value)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              <div className="filterGroup" aria-label="Filter status order">
                {orderFilters.map((filter) => (
                  <button
                    type="button"
                    key={filter.value}
                    className={orderFilter === filter.value ? 'active' : ''}
                    onClick={() => setOrderFilter(filter.value)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Waktu</th>
                  <th>Meja</th>
                  <th>Item</th>
                  <th>Status</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td>#{order.id}</td>
                    <td>{formatOrderDate(order.createdAt)}</td>
                    <td>{order.table || '-'}</td>
                    <td>
                      <div className="orderItems">
                        {order.items?.map((item, index) => (
                          <span key={`${order.id}-${item.menuId}-${index}`}>
                            {item.name || 'Item'} x{item.quantity}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className={`status ${order.status}`}>{order.status}</span>
                    </td>
                    <td>{currency.format(order.total)}</td>
                  </tr>
                ))}
                {!loading && filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={6}>Tidak ada order untuk filter ini.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <style jsx>{`
        .page {
          max-width: 1180px;
          margin: 0 auto;
          padding: 32px 20px 48px;
          color: #1f2933;
        }

        .topbar,
        .sectionTitle,
        .actions,
        .rowActions,
        .filterGroup {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .topbar,
        .sectionTitle {
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
        h2 {
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

        .stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 24px;
        }

        .stats article,
        .panel {
          border: 1px solid #d8dee4;
          border-radius: 8px;
          background: #fff;
        }

        .stats article {
          display: grid;
          gap: 8px;
          padding: 16px;
        }

        .stats span,
        .sectionTitle span {
          color: #667085;
          font-size: 14px;
        }

        .filterGroup {
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 8px;
        }

        .filters {
          display: grid;
          justify-items: end;
          gap: 8px;
        }

        .stats strong {
          font-size: 24px;
        }

        .content {
          display: grid;
          gap: 24px;
        }

        .panel {
          padding: 18px;
        }

        .menuForm {
          display: grid;
          grid-template-columns: minmax(160px, 1fr) 130px minmax(180px, 1.4fr) auto auto;
          gap: 10px;
          margin: 16px 0;
        }

        input {
          min-height: 40px;
          border: 1px solid #c9d1d9;
          border-radius: 8px;
          padding: 0 12px;
          font: inherit;
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

        .danger {
          color: #8a1f1f;
        }

        .orderItems {
          display: grid;
          gap: 4px;
          min-width: 180px;
          color: #344054;
          font-size: 14px;
        }

        .filterGroup button.active {
          border-color: #8b5e34;
          background: #8b5e34;
          color: #fff;
        }

        .tableWrap {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 680px;
        }

        th,
        td {
          border-bottom: 1px solid #e5e7eb;
          padding: 12px;
          text-align: left;
          vertical-align: top;
        }

        th {
          color: #667085;
          font-size: 13px;
          text-transform: uppercase;
        }

        .status {
          display: inline-flex;
          border-radius: 999px;
          padding: 4px 10px;
          background: #eef2f7;
          color: #344054;
          font-size: 13px;
          font-weight: 700;
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

        .status.served {
          background: #f1f5f9;
          color: #475569;
        }

        @media (max-width: 920px) {
          .stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .menuForm {
            grid-template-columns: 1fr;
          }

          .sectionTitle {
            align-items: flex-start;
            flex-direction: column;
          }

          .filters,
          .filterGroup {
            justify-items: start;
            justify-content: flex-start;
          }
        }

        @media (max-width: 560px) {
          .topbar {
            align-items: stretch;
            flex-direction: column;
          }

          .actions {
            justify-content: stretch;
          }

          .actions button {
            flex: 1;
          }

          .stats {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}

function isToday(value?: string) {
  if (!value) return false;

  const date = new Date(value);
  const today = new Date();

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function formatOrderDate(value?: string) {
  if (!value) return '-';
  return dateTimeFormatter.format(new Date(value));
}
