import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './cart.css';

export default function Cart() {
    const { user , updatePrice} = useContext(AuthContext);
    const navigate = useNavigate();
    const [dbCartItems, setDbCartItems] = useState([]);
    const [timeStateTicker, setTimeStateTicker] = useState(Date.now());
    const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

    const activeUserId = user?.id || user?._id || "user_guest_99";
    


    const fetchDBCart = async () => {
        try {
            const response = await fetch(`https://zypcart-product-backend.onrender.com/api/cart/${activeUserId}`);
            if (response.ok) {
                const data = await response.json();
                setDbCartItems(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error("Error reading database items:", err);
        }
    };

    useEffect(() => {
        if (activeUserId) {
            fetchDBCart();
        }
    }, [activeUserId]);

    useEffect(() => {
        const clockTimerInterval = setInterval(() => setTimeStateTicker(Date.now()), 1000);
        return () => clearInterval(clockTimerInterval);
    }, []);

    const activeCartItems = dbCartItems.map(item => {
        if (!item || !item.productId) return null;

        let productDetails = {};
        if (item.productId && typeof item.productId === 'object' && item.productId.name) {
            productDetails = { ...item.productId };
        } else {
            return null; // Skip if product reference becomes unlinked or deleted
        }

        const creationDateMS = new Date(item.createdAt || Date.now()).getTime();
        const expirationDateMS = creationDateMS + (7 * 24 * 60 * 60 * 1000); // 7 Days TTL
        const timeLeftDeltaMS = expirationDateMS - Date.now();

        if (timeLeftDeltaMS <= 0) return null; // Instant client-side removal threshold

        return { ...productDetails, quantity: item.quantity || 1, cartItemId: item._id, timeLeftDeltaMS };
    }).filter(Boolean);

    const totalMRP = activeCartItems.reduce((sum, item) => sum + ((Number(item.mrpPrice) || 0) * item.quantity), 0);
    const totalCurrentDealPrice = activeCartItems.reduce((sum, item) => sum + ((Number(item.discountPrice) || 0) * item.quantity), 0);
    const price =  updatePrice(totalCurrentDealPrice);
    const totalSavingsCalculated = Math.max(0, totalMRP - totalCurrentDealPrice);
    const calculateTimeRemainingString = (timeLeftDeltaMS) => {
        if (isNaN(timeLeftDeltaMS) || timeLeftDeltaMS <= 0) return "0d 0h 0m 0s left";
        const daysLeft = Math.floor(timeLeftDeltaMS / (1000 * 60 * 60 * 24));
        const hoursLeft = Math.floor((timeLeftDeltaMS % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutesLeft = Math.floor((timeLeftDeltaMS % (1000 * 60 * 60)) / (1000 * 60));
        const secondsLeft = Math.floor((timeLeftDeltaMS % (1000 * 60)) / 1000);
        return `${daysLeft}d ${hoursLeft}h ${minutesLeft}m ${secondsLeft}s left`;
    };

    const handleQuantityAdjustment = async (productId, currentQty, adjustmentAmount) => {
        const targetQty = currentQty + adjustmentAmount;
        if (targetQty <= 0) {
            handleRemoveItem(productId);
            return;
        }
        if (targetQty > 5) {
            alert("Maximum purchase cap limit is 5 units per item.");
            return;
        }

        try {
            await fetch('https://zypcart-product-backend.onrender.com/api/cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: activeUserId, productId, quantity: targetQty })
            });
            fetchDBCart();
        } catch (err) {
            console.error(err);
        }
    };

    const handleRemoveItem = async (productId) => {
        try {
            await fetch(`https://zypcart-product-backend.onrender.com/api/cart/${activeUserId}/${productId}`, { method: 'DELETE' });
            fetchDBCart();
        } catch (err) {
            console.error(err);
        }
    };

    const processSecureCheckout = async () => {
        if (activeCartItems.length === 0) return;
        setIsProcessingCheckout(true);
        try {
            const response = await fetch('https://zypcart-product-backend.onrender.com/api/products/orders/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: activeUserId,
                    buyerName: user?.name || "Verified Customer",
                    buyerEmail: user?.email || "customer@zypcart.com",
                    cartItems: activeCartItems
                })
            });
            if (response.ok) {
                alert('Checkout completed successfully! 🎉');
                navigate('/products');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsProcessingCheckout(false);
        }
    };

    return (
        <div className="cart-page-wrapper">
            <header className="cart-header">
                <button className="back-to-store-btn" onClick={() => navigate('/products')}>
                    ← Return to Marketplace
                </button>
                <h2>Your Shopping Cart Basket</h2>
            </header>

            {activeCartItems.length === 0 ? (
                <div className="empty-cart-fallback">
                    <div className="empty-icon-cloud">🛒</div>
                    <h3>Your shopping bag is completely empty!</h3>
                    <p>Reservations drop after 7 days automatically.</p>
                </div>
            ) : (
                <div className="cart-layout-split-grid">

                    <div className="cart-items-collection-deck">
                        {activeCartItems.map((item) => (
                            <div key={item._id} className="cart-item-row-card">
                                <div className="cart-item-image-box">
                                    <img src={item.imageUrls?.[0] || 'https://placehold.co/100x100'} alt="" />
                                </div>

                                <div className="cart-item-details-box">
                                    <span className="cart-item-category-tag">{item.category || "Electronics"}</span>
                                    <h4>{item.name}</h4>

                                    <div className="cart-ttl-countdown-ticker">
                                        ⏳ {calculateTimeRemainingString(item.timeLeftDeltaMS)}
                                    </div>

                                    <button className="cart-item-delete-link" onClick={() => handleRemoveItem(item._id)}>
                                        🗑️ Remove Item
                                    </button>
                                </div>

                                <div className="cart-item-quantity-deck">
                                    <label>Quantity</label>
                                    <div className="quantity-stepper-control">
                                        <button onClick={() => handleQuantityAdjustment(item._id, item.quantity, -1)}>−</button>
                                        <span className="qty-counter-value">{item.quantity}</span>
                                        <button onClick={() => handleQuantityAdjustment(item._id, item.quantity, 1)}>+</button>
                                    </div>
                                </div>

                                <div className="cart-item-pricing-box">
                                    <span className="cart-item-deal-price">₹{((Number(item.discountPrice) || 0) * item.quantity).toLocaleString('en-IN')}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="cart-receipt-summary-panel">
                        <h3>Order Financial Overview</h3>
                        <div className="receipt-calculations-table">
                            <div className="receipt-calc-row">
                                <span>Items Subtotal (Gross MRP)</span>
                                <span>₹{totalMRP.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="receipt-calc-row promo-savings-deduction">
                                <span>Promotional Discount Savings</span>
                                <span>− ₹{totalSavingsCalculated.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="dropdown-divider" style={{ margin: '14px 0', height: '1px', background: '#e2e8f0' }}></div>
                            <div className="receipt-calc-row ultimate-total-row">
                                <span>Total Amount Due</span>
                                <span className="final-bill-price">₹{totalCurrentDealPrice.toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                        <br/>
                        <button
                            className="checkout-payment-btn"
                            onClick={() => navigate('/checkout')}
                        >
                            Proceed to Secure Checkout 🔒
                        </button>

                    </div>

                </div>
            )}
        </div>
    );
}