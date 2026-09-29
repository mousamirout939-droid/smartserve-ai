import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import customerClient from '../api/customerClient.js';

const currency = import.meta.env.VITE_CURRENCY_SYMBOL || '₹';
const statusLabels = {
  PENDING_CONFIRMATION: 'Order received',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Being prepared',
  READY: 'Ready',
  OUT_FOR_DELIVERY: 'On the way',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export default function CustomerShop() {
  const navigate = useNavigate();
  const customer = JSON.parse(localStorage.getItem('smartserve_customer') || '{}');
  const [items, setItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [view, setView] = useState('menu');
  const [orderType, setOrderType] = useState('DELIVERY');
  const [paymentMethod, setPaymentMethod] = useState('RAZORPAY');
  const [address, setAddress] = useState(customer.defaultAddress || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    Promise.all([customerClient.get('/menu?available=true'), customerClient.get('/customer/orders')])
      .then(([menuResponse, orderResponse]) => {
        setItems(menuResponse.data.data);
        setOrders(orderResponse.data.data);
      })
      .catch((err) => {
        if (err.response?.status === 401) logout();
        else setError('Could not load the menu. Please refresh.');
      });
  }, []);

  useEffect(() => {
    if (view !== 'orders') return undefined;
    const timer = setInterval(async () => {
      try {
        const response = await customerClient.get('/customer/orders');
        setOrders(response.data.data);
      } catch (err) {
        if (err.response?.status === 401) logout();
      }
    }, 10000);
    return () => clearInterval(timer);
  }, [view]);

  function logout() {
    localStorage.removeItem('smartserve_customer_token');
    localStorage.removeItem('smartserve_customer');
    navigate('/customer/login');
  }

  function add(item) {
    setCart((current) => {
      const existing = current.find((entry) => entry.menuItemId === item._id);
      if (existing) return current.map((entry) => entry.menuItemId === item._id ? { ...entry, quantity: entry.quantity + 1 } : entry);
      return [...current, { menuItemId: item._id, name: item.name, price: item.price, quantity: 1 }];
    });
    setNotice(`${item.name} added to your order`);
    setTimeout(() => setNotice(''), 1800);
  }

  function changeQuantity(id, delta) {
    setCart((current) => current.flatMap((entry) => {
      if (entry.menuItemId !== id) return [entry];
      const quantity = entry.quantity + delta;
      return quantity > 0 ? [{ ...entry, quantity }] : [];
    }));
  }

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
  const deliveryFee = orderType === 'DELIVERY' && cart.length ? 40 : 0;
  const tax = Math.round(subtotal * 0.05 * 100) / 100;
  const total = subtotal + deliveryFee + tax;
  const grouped = items.reduce((groups, item) => {
    groups[item.category] = groups[item.category] || [];
    groups[item.category].push(item);
    return groups;
  }, {});

  async function placeOrder() {
    if (!cart.length) return setError('Add something delicious first.');
    if (orderType === 'DELIVERY' && !address.trim()) return setError('Add a delivery address to continue.');
    setBusy(true);
    setError('');
    try {
      const response = await customerClient.post('/customer/orders', {
        items: cart.map((item) => ({ menuItemId: item.menuItemId, quantity: item.quantity })),
        orderType,
        address: orderType === 'DELIVERY' ? address : null,
        paymentMethod,
      });
      const order = response.data.data;
      if (paymentMethod === 'RAZORPAY') await payForOrder(order);
      else finishOrder(order, `Order ${order.orderId} placed. Estimated time: ${order.estimatedMinutes} minutes.`);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not place the order.');
    } finally {
      setBusy(false);
    }
  }

  async function payForOrder(order) {
    const paymentResponse = await customerClient.post(`/customer/orders/${order.orderId}/payment`);
    await loadRazorpay();
    await new Promise((resolve, reject) => {
      const checkout = new window.Razorpay({
        key: paymentResponse.data.data.key,
        amount: paymentResponse.data.data.amount,
        currency: paymentResponse.data.data.currency,
        name: 'SmartServe Kitchen',
        description: `Order ${order.orderId}`,
        order_id: paymentResponse.data.data.razorpayOrderId,
        prefill: { name: customer.name, email: customer.email, contact: customer.phone },
        theme: { color: '#D4A017' },
        handler: async (result) => {
          try {
            const verified = await customerClient.post('/customer/payments/verify', result);
            finishOrder(verified.data.data, `Payment received. Order ${order.orderId} is confirmed.`);
            resolve();
          } catch (err) {
            reject(err);
          }
        },
      });
      checkout.on('payment.failed', () => reject(new Error('Payment was not completed.')));
      checkout.open();
    });
  }

  function loadRazorpay() {
    if (window.Razorpay) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Could not load the payment service.'));
      document.body.appendChild(script);
    });
  }

  function finishOrder(order, message) {
    setCart([]);
    setOrders((current) => [order, ...current.filter((entry) => entry.orderId !== order.orderId)]);
    setNotice(message);
    setView('orders');
  }

  return (
    <main className="min-h-screen bg-char-900 text-cream">
      <header className="border-b border-char-700 sticky top-0 z-10 bg-char-900/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between gap-4">
          <div><div className="font-display text-2xl">SmartServe</div><div className="text-xs text-muted">Kitchen ordering</div></div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden sm:block text-muted">Hi, {customer.name || 'there'}</span>
            <button onClick={logout} className="text-muted hover:text-sauce">Sign out</button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div><p className="text-xs uppercase tracking-[0.25em] text-gold-400">Order at your table</p><h1 className="font-display text-4xl mt-2">What are you hungry for?</h1></div>
          <div className="flex border border-char-600">
            <button onClick={() => setView('menu')} className={`px-4 py-2 text-sm ${view === 'menu' ? 'bg-gold-500 text-char-950' : 'text-muted'}`}>Menu</button>
            <button onClick={() => setView('orders')} className={`px-4 py-2 text-sm ${view === 'orders' ? 'bg-gold-500 text-char-950' : 'text-muted'}`}>My orders ({orders.length})</button>
          </div>
        </div>

        {notice && <div className="border border-herb text-herb px-4 py-3 mb-5 text-sm">{notice}</div>}
        {error && <div className="border border-sauce text-sauce px-4 py-3 mb-5 text-sm">{error}</div>}

        {view === 'orders' ? <OrderHistory orders={orders} /> : (
          <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">
            <section className="space-y-8">
              {Object.entries(grouped).map(([category, categoryItems]) => (
                <div key={category}>
                  <div className="flex items-center gap-3 mb-3"><h2 className="font-display text-2xl">{category}</h2><span className="h-px bg-char-700 flex-1" /></div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {categoryItems.map((item) => <MenuItem key={item._id} item={item} onAdd={() => add(item)} />)}
                  </div>
                </div>
              ))}
            </section>

            <aside className="ticket p-5 lg:sticky lg:top-24">
              <div className="flex items-center justify-between mb-5"><h2 className="font-display text-2xl">Your order</h2><span className="text-xs text-muted">{cart.reduce((sum, item) => sum + item.quantity, 0)} items</span></div>
              {!cart.length ? <p className="text-sm text-muted py-8 text-center border-y border-char-700">Your tray is waiting.</p> : <>
                <div className="space-y-3 border-y border-char-700 py-4">{cart.map((item) => <CartItem key={item.menuItemId} item={item} onChange={changeQuantity} />)}</div>
                <div className="space-y-2 text-sm py-4 border-b border-char-700"><SummaryRow label="Subtotal" value={subtotal} /><SummaryRow label="Delivery" value={deliveryFee} /><SummaryRow label="Tax" value={tax} /><SummaryRow label="Total" value={total} strong /></div>
                <div className="pt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2">{['DELIVERY', 'PICKUP'].map((type) => <button key={type} onClick={() => setOrderType(type)} className={`border px-3 py-2 text-xs ${orderType === type ? 'border-gold-500 text-gold-400' : 'border-char-600 text-muted'}`}>{type === 'DELIVERY' ? 'Deliver to me' : 'I will pick up'}</button>)}</div>
                  {orderType === 'DELIVERY' && <textarea value={address} onChange={(event) => setAddress(event.target.value)} rows={2} placeholder="Delivery address" className="w-full bg-char-800 border border-char-600 px-3 py-2 text-sm text-cream" />}
                  <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="w-full bg-char-800 border border-char-600 px-3 py-2 text-sm text-cream"><option value="RAZORPAY">Pay online</option><option value="COD">Cash on delivery</option><option value="PAY_ON_PICKUP">Pay at pickup</option></select>
                  <button disabled={busy} onClick={placeOrder} className="w-full bg-gold-500 hover:bg-gold-600 text-char-950 font-medium px-4 py-3 disabled:opacity-60">{busy ? 'Preparing your order…' : `Place order · ${currency}${total.toFixed(2)}`}</button>
                  <p className="text-xs text-muted text-center">Estimated arrival: {orderType === 'DELIVERY' ? '45' : '30'} minutes</p>
                </div>
              </>}
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}

function MenuItem({ item, onAdd }) {
  return <article className="ticket overflow-hidden flex flex-col"><div className="aspect-[16/9] bg-char-800 overflow-hidden">{item.imageUrl && <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />}</div><div className="p-4 flex-1 flex flex-col"><div className="flex justify-between gap-3"><h3 className="font-medium">{item.name}</h3><span className="text-gold-400 font-mono">{currency}{item.price}</span></div><p className="text-sm text-muted mt-2 flex-1">{item.description}</p><button onClick={onAdd} className="mt-4 border border-gold-500 text-gold-400 hover:bg-gold-500 hover:text-char-950 px-3 py-2 text-sm">Add to order</button></div></article>;
}

function CartItem({ item, onChange }) {
  return <div className="flex justify-between gap-3 text-sm"><div><div>{item.name}</div><div className="text-xs text-muted">{currency}{item.price} each</div></div><div className="flex items-center gap-2"><button onClick={() => onChange(item.menuItemId, -1)} className="w-6 h-6 border border-char-600 text-muted">−</button><span className="w-4 text-center">{item.quantity}</span><button onClick={() => onChange(item.menuItemId, 1)} className="w-6 h-6 border border-char-600 text-muted">+</button></div></div>;
}

function SummaryRow({ label, value, strong = false }) {
  return <div className={`flex justify-between ${strong ? 'text-gold-400 font-medium text-base pt-2' : 'text-muted'}`}><span>{label}</span><span>{currency}{value.toFixed(2)}</span></div>;
}

function OrderHistory({ orders }) {
  if (!orders.length) return <div className="ticket p-10 text-center text-muted">Your confirmed orders will appear here.</div>;
  return <div className="space-y-4">{orders.map((order) => <article key={order.orderId} className="ticket p-5"><div className="flex flex-wrap justify-between gap-3"><div><div className="font-mono text-gold-400">{order.orderId}</div><div className="text-xs text-muted mt-1">{new Date(order.createdAt).toLocaleString()}</div></div><div className="text-right"><div className="text-sm">{statusLabels[order.status] || order.status}</div><div className="text-xs text-muted mt-1">{order.paymentStatus === 'PAID' ? 'Paid online' : 'Payment due at handoff'}</div></div></div><div className="border-t border-char-700 mt-4 pt-4 flex flex-wrap justify-between gap-3 text-sm"><span className="text-muted">{order.items.map((item) => `${item.itemName} ×${item.quantity}`).join(', ')}</span><span className="text-gold-400 font-mono">{currency}{order.total.toFixed(2)}</span></div><div className="text-xs text-muted mt-3">Estimated time: {order.estimatedMinutes} minutes · {order.orderType === 'DELIVERY' ? 'Delivery' : 'Pickup'}</div></article>)}</div>;
}
