import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import "./order.css";

const OrderHistory = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    
    const { user } = useContext(AuthContext);
    const buyerId = user?.id || user?._id;

    // --- PAYMENT MODAL STATES ---
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [activeOrderToPay, setActiveOrderToPay] = useState(null);
    const [selectedPayment, setSelectedPayment] = useState('upi_app');
    const [showQR, setShowQR] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvv: '' });

    // Payment methods for paying pending orders (NO COD)
    const paymentMethods = [
        { id: 'paytm', label: 'Paytm', icon: '📱' },
        { id: 'upi_app', label: 'UPI App (Google Pay, PhonePe)', icon: '⚡' },
        { id: 'cashfree', label: 'Cards / NetBanking', icon: '💳' }
    ];

    useEffect(() => {
        fetch(`https://zypcart-product-backend.onrender.com/api/products/marketplace`)
            .then((res) => {
                if (!res.ok) throw new Error('Failed to fetch marketplace');
                return res.json();
            })
            .then((data) => {
                setSelectedProducts(data);
            })
            .catch((err) => console.error(err));
    }, []);

    useEffect(() => {
        if (buyerId) {
            fetchOrders();
        }
    }, [buyerId]);

    // Helper: Check if today is the delivery date (or past it)
    const isDeliveryDay = (dtdDate) => {
        if (!dtdDate) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const deliveryDate = new Date(dtdDate);
        deliveryDate.setHours(0, 0, 0, 0);
        return today.getTime() >= deliveryDate.getTime();
    };

    // Helper: Format Payment Method Label
    const formatPaymentMethod = (method) => {
        if (!method) return 'Unknown';
        const lowerMethod = method.toLowerCase();
        if (lowerMethod === 'cod') return 'Cash on Delivery';
        if (lowerMethod === 'upi_app' || lowerMethod === 'upi') return 'UPI App';
        if (lowerMethod === 'paytm') return 'Paytm';
        if (lowerMethod === 'cashfree' || lowerMethod === 'card') return 'Card / NetBanking';
        return method;
    };

    // Helper: Silently update order status in the backend
    const autoUpdateStatusToDelivered = async (orderId) => {
        try {
            await fetch(`https://zypcart-product-backend.onrender.com/api/products/orders/status/${orderId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Delivered', deliveredAt: new Date().toISOString() })
            });
        } catch (error) {
            console.error("Failed to auto-update order to Delivered:", error);
        }
    };

    const fetchOrders = () => {
        setLoading(true);
        fetch(`https://zypcart-product-backend.onrender.com/api/products/orders/buyer/${buyerId}`)
            .then((res) => {
                if (!res.ok) throw new Error('Failed to fetch orders');
                return res.json();
            })
            .then((data) => {
                // Check if any order needs to be auto-marked as Delivered
                const processedOrders = data.map(order => {
                    const prepaidMethods = ['paytm', 'upi_app', 'cashfree', 'upi', 'card'];
                    const isPrepaid = prepaidMethods.includes(order.paymentMethods?.toLowerCase());
                    const isDueForDelivery = isDeliveryDay(order.DTD);
                    
                    // If delivery day arrived, it is prepaid, and status is not yet 'Delivered'
                    if (isDueForDelivery && isPrepaid && order.status !== 'Delivered') {
                        // Update the backend silently
                        autoUpdateStatusToDelivered(order._id);
                        
                        // Update local UI state instantly
                        return { 
                            ...order, 
                            status: 'Delivered', 
                            deliveredAt: new Date().toISOString() 
                        };
                    }
                    return order;
                });

                setOrders(processedOrders);
                setLoading(false);
            })
            .catch((err) => {
                setError(err.message);
                setLoading(false);
            });
    };

    const fullProductDetails = selectedProduct
        ? selectedProducts?.find(p => p._id === selectedProduct)
        : null;

    // --- PAYMENT PROCESSING LOGIC ---
    const handleOpenPayment = (order) => {
        setActiveOrderToPay(order);
        setShowPaymentModal(true);
    };

    const processPayment = async () => {
        setIsProcessing(true);
        
        try {
            const res = await fetch(`https://zypcart-product-backend.onrender.com/api/products/orders/checkout/${activeOrderToPay._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    paymentMethods: selectedPayment, 
                    paymentStatus: 'Success',
                    status: 'Delivered', // Mark as delivered upon payment
                    deliveredAt: new Date().toISOString()
                })
            });

            if (!res.ok) throw new Error("Payment failed to update on the server.");
            
            const amountPaid = activeOrderToPay.totalAmountPaid || activeOrderToPay.finalAmountPaid;
            alert(`Payment of ₹${amountPaid} successful via ${formatPaymentMethod(selectedPayment)}. Order is now Delivered!`);
            
            setShowPaymentModal(false);
            setShowQR(false);
            setActiveOrderToPay(null);
            
            // Re-fetch orders to reflect updated status in UI
            fetchOrders();
        } catch (error) {
            console.error("Payment Error:", error);
            alert(`Payment failed: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleProceedPayment = async () => {
        const cardRegex = /^[0-9]{16}$/;
        const expiryRegex = /^(0[1-9]|1[0-2])\/?([0-9]{2})$/;
        const cvvRegex = /^[0-9]{3}$/;

        if (selectedPayment === 'upi_app' || selectedPayment === 'paytm') {
            setShowQR(true); // Open QR Scanner view
        } else if (selectedPayment === 'cashfree') {
            if (!cardRegex.test(cardDetails.number)) return alert("Invalid Card Number");
            if (!expiryRegex.test(cardDetails.expiry)) return alert("Invalid Expiry (MM/YY)");
            if (!cvvRegex.test(cardDetails.cvv)) return alert("Invalid CVV");
            await processPayment();
        }
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading your orders...</div>;
    if (error) return <div style={{ padding: '40px', color: 'red' }}>Error: {error}</div>;

    return (
        <div style={{ padding: '40px 24px', maxWidth: '800px', margin: '0 auto' }}>
            <button
                onClick={() => navigate(-1)}
                style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748b',
                    marginBottom: '20px',
                    fontSize: '1rem',
                    padding: '0'
                }}
            >
                &#8592; Back
            </button>
            <h2 style={{ marginBottom: '24px' }}>Order History</h2>
            
            {orders.length === 0 ? (
                <p>You haven't placed any orders yet.</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {orders.map((order) => {
                        const isCOD = order.paymentMethods?.toLowerCase() === 'cod';
                        const paymentStatus = order.paymentStatus || (isCOD ? 'Pending' : 'Success');
                        // Show pay button if it's COD, payment is pending, and delivery day has arrived
                        const showPayButton = isCOD && paymentStatus === 'Pending' && isDeliveryDay(order.DTD);
                        const discount = order.discountApplied || 0;
                        const finalTotal = order.totalAmountPaid || order.finalAmountPaid || 0;
                        const subTotal = finalTotal + discount;

                        return (
                            <div key={order._id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', background: '#fff', position: 'relative' }}>
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
                                        Ordered: {new Date(order.createdAt).toLocaleDateString()}
                                    </span>
                                    <div>
                                        <span className={`status-badge status-${order.status?.toLowerCase() || 'pending'}`} style={{ 
                                            fontWeight: 'bold',
                                            color: order.status === 'Delivered' ? '#16a34a' : '#2563eb'
                                        }}>
                                            Order: {order.status || 'Pending'}
                                        </span>
                                    </div>
                                </div>

                                {/* Order Items */}
                                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', paddingBottom: '12px' }}>
                                    {order.items.map((item, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <span>{item.name} <small className="text-muted">(x{item.quantity})</small></span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <span style={{ fontWeight: '500' }}>₹{item.dealPricePaid * item.quantity}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedProduct(item.productId)}
                                                    style={{ padding: '4px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.8rem', transition: 'background 0.2s' }}
                                                    onMouseOver={(e) => e.target.style.background = '#f1f5f9'}
                                                    onMouseOut={(e) => e.target.style.background = '#fff'}
                                                >
                                                    👁️ View
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Delivery & Payment Details Grid */}
                                <div style={{ 
                                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', 
                                    background: '#f8fafc', padding: '12px', borderRadius: '8px', fontSize: '0.9rem' 
                                }}>
                                    <div>
                                        <strong>Delivery Date:</strong><br/>
                                        {order.status === 'Delivered' && order.deliveredAt ? (
                                            <span style={{ color: '#16a34a', fontWeight: 'bold' }}>Delivered: {new Date(order.deliveredAt).toLocaleDateString()}</span>
                                        ) : (
                                            <span>{order.DTD ? new Date(order.DTD).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Pending'}</span>
                                        )}
                                    </div>
                                    <div>
                                        <strong>Payment Method:</strong><br/>
                                        <span>{formatPaymentMethod(order.paymentMethods)}</span>
                                    </div>
                                    <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                        <div>
                                            <strong>Payment Status: </strong>
                                            <span style={{ 
                                                color: paymentStatus === 'Success' ? '#16a34a' : '#ea580c', 
                                                fontWeight: 'bold' 
                                            }}>
                                                {paymentStatus}
                                            </span>
                                        </div>
                                        {showPayButton && order.status !== 'Delivered' && (
                                            <button 
                                                onClick={() => handleOpenPayment(order)}
                                                style={{ background: '#2563eb', color: 'white', border: 'none', padding: '6px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                                                Pay Now
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Financial Summary */}
                                <div style={{ marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '12px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                    {discount > 0 && (
                                        <>
                                            <div style={{ color: '#64748b' }}>Subtotal: ₹{subTotal}</div>
                                            <div style={{ color: '#16a34a' }}>Coupon Discount: -₹{discount}</div>
                                        </>
                                    )}
                                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                                        Total: ₹{finalTotal}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* --- PRODUCT VIEW MODAL --- */}
            {selectedProduct && fullProductDetails && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', zIndex: 1000
                }} onClick={() => setSelectedProduct(null)}>
                    <div style={{
                        background: '#fff', padding: '24px', borderRadius: '16px',
                        maxWidth: '500px', width: '90%', position: 'relative'
                    }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelectedProduct(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
                        <img
                            src={fullProductDetails.imageUrls?.[0] || 'https://placehold.co/400x300?text=No+Image'}
                            alt={fullProductDetails.name}
                            style={{ width: '100%', height: '250px', objectFit: 'contain', marginBottom: '16px' }}
                        />
                        <h2 style={{ margin: '0 0 8px 0' }}>{fullProductDetails.name}</h2>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#16a34a' }}>
                            ₹{fullProductDetails.discountPrice}
                        </div>
                        <button
                            onClick={() => setSelectedProduct(null)}
                            style={{
                                width: '100%', marginTop: '16px', padding: '12px', background: '#f1f5f9',
                                color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
                            }}
                        >
                            ← Back
                        </button>
                    </div>
                </div>
            )}

            {/* --- PAYMENT MODAL (For COD Pending) --- */}
            {showPaymentModal && activeOrderToPay && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', zIndex: 2000
                }}>
                    <div style={{
                        background: '#fff', padding: '30px', borderRadius: '12px',
                        maxWidth: '450px', width: '90%', position: 'relative'
                    }}>
                        <button onClick={() => {setShowPaymentModal(false); setShowQR(false);}} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
                        
                        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Pay Order Due: ₹{activeOrderToPay.totalAmountPaid || activeOrderToPay.finalAmountPaid}</h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                            {paymentMethods.map(method => (
                                <label key={method.id} style={{
                                    display: 'flex', alignItems: 'center', padding: '16px',
                                    border: `1px solid ${selectedPayment === method.id ? '#2563eb' : '#d1d5db'}`,
                                    background: selectedPayment === method.id ? '#eff6ff' : '#fff',
                                    borderRadius: '8px', cursor: 'pointer'
                                }}>
                                    <input type="radio" name="pay_method" value={method.id} checked={selectedPayment === method.id} onChange={() => setSelectedPayment(method.id)} style={{ marginRight: '16px', transform: 'scale(1.2)' }} />
                                    <span style={{ flexGrow: 1, fontWeight: '500' }}>{method.label}</span>
                                    <span style={{ fontSize: '1.5rem' }}>{method.icon}</span>
                                </label>
                            ))}
                        </div>

                        {selectedPayment === 'cashfree' && !isProcessing && !showQR && (
                            <div style={{ marginBottom: '20px', padding: '16px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                                <input type="text" placeholder="Card Number (16 digits)" onChange={(e) => setCardDetails({ ...cardDetails, number: e.target.value })} style={{ width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #d1d5db', borderRadius: '4px', boxSizing: 'border-box' }} />
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input type="text" placeholder="MM/YY" onChange={(e) => setCardDetails({ ...cardDetails, expiry: e.target.value })} style={{ width: '50%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '4px' }} />
                                    <input type="password" placeholder="CVV" maxLength="3" onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value })} style={{ width: '50%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '4px' }} />
                                </div>
                            </div>
                        )}

                        {isProcessing ? (
                            <div style={{ textAlign: 'center', padding: '20px', color: '#2563eb', fontWeight: 'bold' }}>
                                Processing your payment...
                            </div>
                        ) : (
                            <button 
                                onClick={handleProceedPayment} 
                                style={{ width: '100%', background: '#16a34a', color: 'white', padding: '14px', border: 'none', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}>
                                Proceed to Pay
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* --- QR CODE OVERLAY (For UPI/Paytm) --- */}
            {showQR && activeOrderToPay && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', zIndex: 3000
                }}>
                    <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', textAlign: 'center', maxWidth: '350px' }}>
                        <h3 style={{ marginTop: 0 }}>Scan to Pay ₹{activeOrderToPay.totalAmountPaid || activeOrderToPay.finalAmountPaid}</h3>
                        <p style={{ color: '#64748b' }}>Open your UPI app and scan the code below</p>
                        
                        <div style={{ margin: '20px 0', padding: '20px', background: '#f9fafb', borderRadius: '8px', display: 'inline-block' }}>
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=merchant@upi&am=${activeOrderToPay.totalAmountPaid || activeOrderToPay.finalAmountPaid}`}
                                alt="QR Code"
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '10px' }}>
                            <button onClick={() => setShowQR(false)} style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', background: '#f1f5f9', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                            <button onClick={processPayment} disabled={isProcessing} style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', background: '#2563eb', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>
                                {isProcessing ? 'Processing...' : 'I have paid'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderHistory;