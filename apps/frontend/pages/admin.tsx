import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { authHeaders, clearToken, getToken } from '../lib/auth';

interface MenuItem {
  id: number;
  name: string;
  price: number;
  description?: string;
}

interface Order {
  id: number;
  table?: string;
  status: string;
  total: number;
}

export default function Admin() {
  const router = useRouter();
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [formData, setFormData] = useState({ name: '', price: 0, description: '' });
  const [editId, setEditId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    fetchMenu();
    fetchOrders();
  }, []);

  async function fetchMenu() {
    const res = await fetch('http://localhost:4000/menu', {
      headers: { ...authHeaders() },
    });
    if (res.status === 401) {
      return router.push('/login');
    }
    const data = await res.json();
    setMenu(data);
  }

  async function fetchOrders() {
    const res = await fetch('http://localhost:4000/orders', {
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    });
    if (res.status === 401) {
      return router.push('/login');
    }
    const data = await res.json();
    setOrders(data);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name || formData.price <= 0) return;

    const url = editId ? `http://localhost:4000/menu/${editId}` : 'http://localhost:4000/menu';
    const method = editId ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(formData),
    });

    if (res.status === 401) {
      return router.push('/login');
    }
    if (!res.ok) {
      setError('Gagal menyimpan item menu. Pastikan Anda login sebagai admin.');
      return;
    }

    setEditId(null);
    setFormData({ name: '', price: 0, description: '' });
    setError(null);
    fetchMenu();
  }

  async function handleDelete(id: number) {
    if (!confirm('Hapus item menu?')) return;
    const res = await fetch(`http://localhost:4000/menu/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (res.status === 401) {
      return router.push('/login');
    }
    fetchMenu();
  }

  function handleEdit(item: MenuItem) {
    setFormData({ name: item.name, price: item.price, description: item.description || '' });
    setEditId(item.id);
  }

  function handleLogout() {
    clearToken();
    router.push('/login');
  }

  const totalSales = orders.reduce((s, o) => s + o.total, 0);
  const ordersByStatus = {
    received: orders.filter((o) => o.status === 'received').length,
    preparing: orders.filter((o) => o.status === 'preparing').length,
    ready: orders.filter((o) => o.status === 'ready').length,
    served: orders.filter((o) => o.status === 'served').length,
  };

  return (
    <main style={{ padding: 32, fontFamily: 'Inter, system-ui', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1>Admin Dashboard</h1>
        <button onClick={handleLogout}>Logout</button>
      </div>

      {error && <div style={{ marginBottom: 16, color: 'red' }}>{error}</div>}

      <section style={{ marginBottom: 40 }}>
        <h2>Menu Management</h2>
        <form onSubmit={handleSubmit} style={{ marginBottom: 20, padding: 16, background: '#f9f9f9', borderRadius: 8 }}>
          <input
            type="text"
            placeholder="Nama"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            style={{ marginRight: 8, padding: 8 }}
          />
          <input
            type="number"
            placeholder="Harga"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
            style={{ marginRight: 8, padding: 8 }}
          />
          <input
            type="text"
            placeholder="Deskripsi"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            style={{ marginRight: 8, padding: 8 }}
          />
          <button type="submit">{editId ? 'Update' : 'Tambah'} Item</button>
          {editId && (
            <button type="button" onClick={() => { setEditId(null); setFormData({ name: '', price: 0, description: '' }); }}>
              Batal
            </button>
          )}
        </form>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f0f0f0' }}>
              <th style={{ padding: 12, textAlign: 'left', border: '1px solid #ddd' }}>Nama</th>
              <th style={{ padding: 12, textAlign: 'left', border: '1px solid #ddd' }}>Harga</th>
              <th style={{ padding: 12, textAlign: 'left', border: '1px solid #ddd' }}>Deskripsi</th>
              <th style={{ padding: 12, textAlign: 'left', border: '1px solid #ddd' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {menu.map((item) => (
              <tr key={item.id}>
                <td style={{ padding: 12, border: '1px solid #ddd' }}>{item.name}</td>
                <td style={{ padding: 12, border: '1px solid #ddd' }}>Rp {item.price}</td>
                <td style={{ padding: 12, border: '1px solid #ddd' }}>{item.description}</td>
                <td style={{ padding: 12, border: '1px solid #ddd' }}>
                  <button onClick={() => handleEdit(item)} style={{ marginRight: 8 }}>
                    Edit
                  </button>
                  <button onClick={() => handleDelete(item.id)}>Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Order Report</h2>
        <div style={{ display: 'flex', gap: 24, marginBottom: 20 }}>
          <div style={{ padding: 16, background: '#e8f5e9', borderRadius: 8 }}>
            <div>Total Penjualan</div>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>Rp {totalSales.toLocaleString('id-ID')}</div>
          </div>
          <div style={{ padding: 16, background: '#e3f2fd', borderRadius: 8 }}>
            <div>Total Order</div>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>{orders.length}</div>
          </div>
          <div style={{ padding: 16, background: '#fff3e0', borderRadius: 8 }}>
            <div>Baru</div>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>{ordersByStatus.received}</div>
          </div>
          <div style={{ padding: 16, background: '#fce4ec', borderRadius: 8 }}>
            <div>Proses</div>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>{ordersByStatus.preparing}</div>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f0f0f0' }}>
              <th style={{ padding: 12, textAlign: 'left', border: '1px solid #ddd' }}>Order ID</th>
              <th style={{ padding: 12, textAlign: 'left', border: '1px solid #ddd' }}>Meja</th>
              <th style={{ padding: 12, textAlign: 'left', border: '1px solid #ddd' }}>Status</th>
              <th style={{ padding: 12, textAlign: 'left', border: '1px solid #ddd' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td style={{ padding: 12, border: '1px solid #ddd' }}>#{order.id}</td>
                <td style={{ padding: 12, border: '1px solid #ddd' }}>{order.table || '-'}</td>
                <td style={{ padding: 12, border: '1px solid #ddd' }}>{order.status}</td>
                <td style={{ padding: 12, border: '1px solid #ddd' }}>Rp {order.total.toLocaleString('id-ID')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
