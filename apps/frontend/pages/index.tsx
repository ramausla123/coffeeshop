import React, { useEffect, useState } from 'react'
import Head from 'next/head'

type MenuItem = { id: number; name: string; price: number; description?: string }
type CartItem = { id: number; menuId: number; name: string; price: number; qty: number }

export default function Home() {
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [orderResult, setOrderResult] = useState<any>(null)
  const [paymentProcessing, setPaymentProcessing] = useState(false)

  useEffect(() => {
    // Load Midtrans Snap script
    const script = document.createElement('script')
    script.src = 'https://app.sandbox.midtrans.com/snap/snap.js'
    script.setAttribute('data-client-key', 'SB-Mid-client-yXjJhWJw9XN0jJdJ')
    document.body.appendChild(script)

    fetch('http://localhost:4000/menu')
      .then((r) => r.json())
      .then(setMenu)
      .catch((e) => console.error('menu fetch', e))
  }, [])

  function addToCart(item: MenuItem) {
    setCart((c) => {
      const existing = c.find((x) => x.menuId === item.id)
      if (existing) {
        return c.map((x) => (x.menuId === item.id ? { ...x, qty: x.qty + 1 } : x))
      }
      return [...c, { id: Date.now(), menuId: item.id, name: item.name, price: item.price, qty: 1 }]
    })
  }

  function removeFromCart(id: number) {
    setCart((c) => c.filter((x) => x.id !== id))
  }

  async function placeOrder() {
    if (cart.length === 0) return
    const body = {
      table: 'T1',
      items: cart.map((c) => ({ menuId: c.menuId, quantity: c.qty })),
    }
    const res = await fetch('http://localhost:4000/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    setOrderResult(data)
    setCart([])
  }

  async function proceedToPayment() {
    if (!orderResult) return
    setPaymentProcessing(true)
    try {
      const res = await fetch(`http://localhost:4000/payment/create/${orderResult.id}`, {
        method: 'POST',
      })
      const { token } = await res.json()

      // Trigger Midtrans Snap
      if (window.snap) {
        window.snap.pay(token, {
          onSuccess: function (result: any) {
            alert('Payment success! Transaction ID: ' + result.transaction_id)
            setOrderResult({ ...orderResult, paymentStatus: 'paid' })
            setPaymentProcessing(false)
          },
          onPending: function (result: any) {
            alert('Waiting for payment. Transaction ID: ' + result.transaction_id)
            setPaymentProcessing(false)
          },
          onError: function (result: any) {
            alert('Payment failed!')
            setPaymentProcessing(false)
          },
          onClose: function () {
            alert('Payment modal closed')
            setPaymentProcessing(false)
          },
        })
      }
    } catch (err) {
      console.error('Payment error:', err)
      setPaymentProcessing(false)
    }
  }

  return (
    <>
      <Head>
        <script src="https://app.sandbox.midtrans.com/snap/snap.js" 
          data-client-key="SB-Mid-client-yXjJhWJw9XN0jJdJ"></script>
      </Head>
      <main style={{ padding: 24, fontFamily: 'Inter, system-ui' }}>
        <h1>Coffee PWA — Table Ordering</h1>
        <section style={{ display: 'flex', gap: 24 }}>
          <div style={{ flex: 1 }}>
            <h2>Menu</h2>
            {menu.length === 0 && <p>Loading menu...</p>}
            <ul>
              {menu.map((m) => (
                <li key={m.id} style={{ marginBottom: 12 }}>
                  <strong>{m.name}</strong> — Rp {m.price}
                  <div style={{ fontSize: 13, color: '#666' }}>{m.description}</div>
                  <button onClick={() => addToCart(m)} style={{ marginTop: 6 }}>Add</button>
                </li>
              ))}
            </ul>
          </div>

          <div style={{ width: 320 }}>
            <h2>Cart</h2>
            {cart.length === 0 && <p>Cart is empty</p>}
            <ul>
              {cart.map((c) => (
                <li key={c.id} style={{ marginBottom: 10 }}>
                  {c.name} x {c.qty} — Rp {c.price * c.qty}
                  <div>
                    <button onClick={() => removeFromCart(c.id)}>Remove</button>
                  </div>
                </li>
              ))}
            </ul>
            <div style={{ marginTop: 12 }}>
              <strong>Total: </strong>Rp {cart.reduce((s, c) => s + c.price * c.qty, 0)}
            </div>
            <div style={{ marginTop: 12 }}>
              <button onClick={placeOrder} disabled={cart.length === 0}>Place Order</button>
            </div>

            {orderResult && (
              <div style={{ marginTop: 16, padding: 12, background: '#f3f3f3', borderRadius: 6 }}>
                <div>✅ Order placed: <strong>#{orderResult.id}</strong></div>
                <div>Table: {orderResult.table}</div>
                <div>Status: {orderResult.status}</div>
                <div>Total: Rp {orderResult.total}</div>
                <div style={{ marginTop: 10 }}>
                  Payment: <strong>{orderResult.paymentStatus || 'unpaid'}</strong>
                </div>
                {(!orderResult.paymentStatus || orderResult.paymentStatus === 'unpaid') && (
                  <button 
                    onClick={proceedToPayment}
                    disabled={paymentProcessing}
                    style={{ marginTop: 10, background: '#4CAF50', color: 'white', padding: '8px 16px', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                  >
                    {paymentProcessing ? 'Processing...' : 'Pay with Midtrans'}
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  )
}
