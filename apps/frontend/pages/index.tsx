import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { apiUrl } from '../lib/api'
import type { MenuItem } from '../types'

type CartItem = { id: number; menuId: number; name: string; price: number; qty: number; note: string }
type MenuCategory = 'minuman' | 'makanan' | 'snack'

const menuCategories: Array<{ value: MenuCategory; label: string }> = [
  { value: 'minuman', label: 'Minuman' },
  { value: 'makanan', label: 'Makanan' },
  { value: 'snack', label: 'Snack' },
]

const currency = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

export default function Home() {
  const router = useRouter()
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [table, setTable] = useState('')
  const [loadingMenu, setLoadingMenu] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const total = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.qty, 0), [cart])
  const groupedMenu = useMemo(() => {
    return menuCategories.map((category) => ({
      ...category,
      items: menu.filter((item) => (item.category || 'minuman') === category.value),
    }))
  }, [menu])

  useEffect(() => {
    fetchMenu()
    const raw = window.localStorage.getItem('coffee_checkout')
    if (!raw) return
    try {
      const draft = JSON.parse(raw)
      if (Array.isArray(draft.items)) setCart(draft.items)
      if (typeof draft.table === 'string') setTable(draft.table)
    } catch {
      window.localStorage.removeItem('coffee_checkout')
    }
  }, [])

  useEffect(() => {
    const tableQuery = router.query.table
    if (typeof tableQuery === 'string') {
      setTable(tableQuery)
    }
  }, [router.query.table])

  async function fetchMenu() {
    setLoadingMenu(true)
    setError(null)

    try {
      const res = await fetch(apiUrl('/menu'))
      if (!res.ok) throw new Error('Menu request failed')

      const data = await res.json()
      setMenu(data)
    } catch {
      setError('Gagal memuat menu. Pastikan backend berjalan di port 4000.')
    } finally {
      setLoadingMenu(false)
    }
  }

  function addToCart(item: MenuItem) {
    if (item.isAvailable === false) return

    setCart((current) => {
      const existing = current.find((cartItem) => cartItem.menuId === item.id)
      if (existing) {
        return current.map((cartItem) =>
          cartItem.menuId === item.id ? { ...cartItem, qty: cartItem.qty + 1 } : cartItem,
        )
      }

      return [...current, { id: Date.now(), menuId: item.id, name: item.name, price: item.price, qty: 1, note: '' }]
    })
  }

  function decreaseQty(id: number) {
    setCart((current) =>
      current
        .map((item) => (item.id === id ? { ...item, qty: item.qty - 1 } : item))
        .filter((item) => item.qty > 0),
    )
  }

  function increaseQty(id: number) {
    setCart((current) => current.map((item) => (item.id === id ? { ...item, qty: item.qty + 1 } : item)))
  }

  function removeFromCart(id: number) {
    setCart((current) => current.filter((item) => item.id !== id))
  }

  function updateNote(id: number, note: string) {
    setCart((current) => current.map((item) => (item.id === id ? { ...item, note } : item)))
  }

  function goToCheckout() {
    if (cart.length === 0) return

    const checkout = {
      table: table.trim(),
      items: cart,
    }
    window.localStorage.setItem('coffee_checkout', JSON.stringify(checkout))
    router.push(`/checkout${table.trim() ? `?table=${encodeURIComponent(table.trim())}` : ''}`)
  }

  return (
    <main className="page">
      <section className="header">
        <div>
          <p className="eyebrow">Coffee Shop</p>
          <h1>Table Ordering</h1>
        </div>
        <label className="tableInput">
          <span>Meja</span>
          <input
            value={table}
            onChange={(event) => setTable(event.target.value)}
            placeholder="Contoh: T1"
            aria-label="Nomor meja"
          />
        </label>
      </section>

      {error && (
        <div className="alert" role="alert">
          <span>{error}</span>
          <button type="button" onClick={fetchMenu}>
            Coba lagi
          </button>
        </div>
      )}

      <section className="content">
        <div className="menuPanel">
          <div className="sectionTitle">
            <h2>Menu</h2>
            <button type="button" onClick={fetchMenu} disabled={loadingMenu}>
              Refresh
            </button>
          </div>

          {loadingMenu && <p className="muted">Memuat menu...</p>}

          {!loadingMenu && menu.length === 0 && (
            <div className="empty">
              <strong>Menu masih kosong</strong>
              <span>Tambahkan menu dari dashboard admin.</span>
            </div>
          )}

          <div className="menuGroups">
            {groupedMenu.map((group) => (
              group.items.length > 0 && (
                <section className="menuGroup" key={group.value}>
                  <h3>{group.label}</h3>
                  <div className="menuGrid">
                    {group.items.map((item) => {
                      const soldOut = item.isAvailable === false

                      return (
                        <article className={`menuItem ${soldOut ? 'soldOut' : ''}`} key={item.id}>
                          <div>
                            <div className="menuTitle">
                              <h4>{item.name}</h4>
                              {soldOut && <span>Habis</span>}
                            </div>
                            {item.description && <p>{item.description}</p>}
                          </div>
                          <div className="menuFooter">
                            <strong>{currency.format(item.price)}</strong>
                            <button type="button" onClick={() => addToCart(item)} disabled={soldOut}>
                              {soldOut ? 'Kosong' : 'Tambah'}
                            </button>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                </section>
              )
            ))}
          </div>
        </div>

        <aside className="cartPanel">
          <div className="sectionTitle">
            <h2>Cart</h2>
            {cart.length > 0 && (
              <button type="button" onClick={() => setCart([])}>
                Kosongkan
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="empty compact">
              <strong>Cart kosong</strong>
              <span>Pilih menu untuk mulai order.</span>
            </div>
          ) : (
            <div className="cartList">
              {cart.map((item) => (
                <div className="cartItem" key={item.id}>
                  <div className="cartInfo">
                    <strong>{item.name}</strong>
                    <span>{currency.format(item.price * item.qty)}</span>
                  </div>
                  <div className="qtyControls">
                    <button type="button" aria-label={`Kurangi ${item.name}`} onClick={() => decreaseQty(item.id)}>
                      -
                    </button>
                    <span>{item.qty}</span>
                    <button type="button" aria-label={`Tambah ${item.name}`} onClick={() => increaseQty(item.id)}>
                      +
                    </button>
                    <button type="button" className="remove" onClick={() => removeFromCart(item.id)}>
                      Hapus
                    </button>
                  </div>
                  <input
                    className="noteInput"
                    value={item.note}
                    onChange={(event) => updateNote(item.id, event.target.value)}
                    placeholder="Catatan item, misal: less sugar"
                    aria-label={`Catatan untuk ${item.name}`}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="summary">
            <span>Total</span>
            <strong>{currency.format(total)}</strong>
          </div>

          <button
            type="button"
            className="checkout"
            onClick={goToCheckout}
            disabled={cart.length === 0}
          >
            Checkout
          </button>
        </aside>
      </section>

      <style jsx>{`
        .page {
          max-width: 1180px;
          margin: 0 auto;
          padding: 32px 20px 48px;
          color: #1f2933;
        }

        .header {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 22px;
        }

        .eyebrow {
          margin: 0 0 4px;
          color: #8b5e34;
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
        }

        h1,
        h2,
        h3,
        h4,
        p {
          margin: 0;
        }

        h1 {
          font-size: 34px;
          line-height: 1.1;
        }

        h2 {
          font-size: 20px;
        }

        .tableInput {
          display: grid;
          gap: 6px;
          min-width: 190px;
          font-size: 13px;
          font-weight: 700;
        }

        input {
          min-height: 42px;
          border: 1px solid #c9d1d9;
          border-radius: 8px;
          padding: 0 12px;
          font: inherit;
        }

        .noteInput {
          min-height: 38px;
          font-size: 14px;
        }

        .alert {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          border-radius: 8px;
          padding: 14px 16px;
          margin-bottom: 16px;
        }

        .alert {
          border: 1px solid #f0b8b8;
          background: #fff1f1;
          color: #8a1f1f;
        }

        .content {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 360px;
          gap: 24px;
          align-items: start;
        }

        .menuPanel,
        .cartPanel {
          border: 1px solid #d8dee4;
          border-radius: 8px;
          background: #fff;
          padding: 18px;
        }

        .cartPanel {
          position: sticky;
          top: 20px;
        }

        .sectionTitle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
        }

        .menuGroups {
          display: grid;
          gap: 24px;
        }

        .menuGroup {
          display: grid;
          gap: 12px;
        }

        .menuGroup > h3 {
          border-bottom: 1px solid #eef0f2;
          padding-bottom: 8px;
          color: #111827;
          font-size: 18px;
        }

        .menuGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 14px;
        }

        .menuItem {
          display: grid;
          min-height: 150px;
          gap: 18px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
        }

        .menuItem.soldOut {
          background: #f8fafc;
          opacity: 0.72;
        }

        .menuTitle {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }

        .menuTitle span {
          border-radius: 999px;
          background: #fff1f1;
          color: #8a1f1f;
          padding: 4px 9px;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }

        .menuItem h4 {
          margin-bottom: 8px;
          font-size: 17px;
        }

        .menuItem p,
        .muted,
        .empty span,
        .cartInfo span {
          color: #667085;
          font-size: 14px;
          line-height: 1.4;
        }

        .menuFooter {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          align-self: end;
        }

        .empty {
          display: grid;
          gap: 6px;
          border: 1px dashed #c9d1d9;
          border-radius: 8px;
          padding: 28px;
          text-align: center;
        }

        .empty.compact {
          padding: 22px 12px;
        }

        .cartList {
          display: grid;
          gap: 12px;
        }

        .cartItem {
          display: grid;
          gap: 10px;
          border-bottom: 1px solid #eef0f2;
          padding-bottom: 12px;
        }

        .cartInfo {
          display: flex;
          justify-content: space-between;
          gap: 12px;
        }

        .qtyControls {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .qtyControls span {
          min-width: 28px;
          text-align: center;
          font-weight: 700;
        }

        button {
          min-height: 36px;
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

        .qtyControls button {
          width: 36px;
          padding: 0;
        }

        .qtyControls .remove {
          width: auto;
          margin-left: auto;
          padding: 0 10px;
          color: #8a1f1f;
        }

        .summary {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid #d8dee4;
          margin-top: 16px;
          padding-top: 16px;
          font-size: 18px;
        }

        .checkout {
          width: 100%;
          min-height: 46px;
          margin-top: 16px;
          border-color: #8b5e34;
          background: #8b5e34;
          color: #fff;
        }

        .checkout:hover:not(:disabled) {
          background: #6f461f;
          color: #fff;
        }

        @media (max-width: 860px) {
          .header {
            align-items: stretch;
            flex-direction: column;
          }

          .content {
            grid-template-columns: 1fr;
          }

          .cartPanel {
            position: static;
          }

          .orderSummaryHead {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>
    </main>
  )
}
