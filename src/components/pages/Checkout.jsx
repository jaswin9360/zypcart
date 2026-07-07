import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './checkout.css';

export default function Checkout() {
    const { user, price_total } = useContext(AuthContext);
    const [showQR, setShowQR] = useState(false);
    const [checkoutStep, setCheckoutStep] = useState('payment');
    const [cartItems, setcartItems] = useState([]);
    const [selectedPayment, setSelectedPayment] = useState('cod');
    const [addresses, setAddresses] = useState([]);
    const [selectedAddressId, setSelectedAddressId] = useState('');
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvv: '' });

    // Coupon States
    const [couponCode, setCouponCode] = useState('');
    const [discountAmount, setDiscountAmount] = useState(0);
    const [isCouponApplied, setIsCouponApplied] = useState(false);
    const [couponMessage, setCouponMessage] = useState({ text: '', type: '' });

    const navigate = useNavigate();
    const activeUserId = user?.id || user?._id;

    const getDeliveryDate = () => {
        const deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() + 5);
        return deliveryDate.toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const paymentMethods = [
        { id: 'paytm', label: 'Paytm', icon: '📱' },
        { id: 'upi_app', label: 'UPI App (Google Pay, PhonePe)', icon: '⚡' },
        { id: 'cashfree', label: 'Cards / NetBanking (Cashfree)', icon: '💳' },
        { id: 'cod', label: 'Cash on Delivery', icon: '💵' }
    ];

    useEffect(() => {
        const fetchDBCart = async () => {
            try {
                const response = await fetch(`https://zypcart-user-backend.onrender.com/api/cart/${activeUserId}`);
                if (response.ok) {
                    const data = await response.json();
                    setcartItems(Array.isArray(data) ? data : []);
                }
            } catch (err) {
                console.error("Error reading database items:", err);
            }
        };
        fetchDBCart();
    }, [activeUserId]);

    const getPaymentLabel = (id) => paymentMethods.find(m => m.id === id)?.label || 'Payment Method';

    useEffect(() => {
        const fetchAddresses = async () => {
            if (!activeUserId) return setLoading(false);
            try {
                const res = await fetch(`https://zypcart-user-backend.onrender.com/api/auth/${activeUserId}/addresses`);
                const data = await res.json();
                if (res.ok) {
                    setAddresses(data.addresses || []);
                    setSelectedAddressId(data.selectedAddressId || '');
                }
            } catch (err) { 
                console.error(err); 
            } finally { 
                setLoading(false); 
            }
        };
        fetchAddresses();
    }, [activeUserId]);

    // Apply Coupon Handler
    const handleApplyCoupon = async () => {
        console.log(couponCode)
        if (!couponCode) return;
        
        try {
            console.log("hee")
            const response = await fetch('https://zypcart-user-backend.onrender.com/api/coupons/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    code: couponCode,
                    cartItems: cartItems ,
                    userId: activeUserId
                })
            });
            console.log(response)
            const data = await response.json();
            console.log(data)

            if (response.ok && data.valid) {
                setDiscountAmount(data.discount);
                setIsCouponApplied(true);
                setCouponMessage({ text: `Success! Seller coupon applied. You saved ₹${data.discount}`, type: 'success' });
            } else {
                setDiscountAmount(0);
                setIsCouponApplied(false);
                setCouponMessage({ text: data.message || 'Invalid or expired coupon.', type: 'error' });
            }
        } catch (error) {
            console.error("Coupon error:", error);
            setCouponMessage({ text: 'Error applying coupon. Try again.', type: 'error' });
        }
    };

    const handleRemoveCoupon = () => {
        setCouponCode('');
        setDiscountAmount(0);
        setIsCouponApplied(false);
        setCouponMessage({ text: '', type: '' });
    };

    const selectedAddress = addresses.find(addr => addr._id === selectedAddressId);
    const hasValidAddress = !!selectedAddress;
    
    // Price Calculations
    const currentFee = selectedPayment === 'cod' ? 20 : 0;
    const subTotal = price_total - discountAmount;
    const finalTotal = (subTotal > 0 ? subTotal : 0) + currentFee;

    const adrs = selectedAddress ? [
        selectedAddress?.street,
        selectedAddress?.cityStateZip,
        selectedAddress?.country,
        selectedAddress?.phone
    ].filter(Boolean).join(', ') : "";

    const orderData = {
        userId: activeUserId,
        buyerName: user.name,
        buyerEmail: user.email,
        DTD: getDeliveryDate(),
        address: adrs,
        couponCode: isCouponApplied ? couponCode : null,
        paymentMethods: selectedPayment,
        discountApplied: discountAmount,
        finalAmountPaid: finalTotal,
        cartItems: cartItems.map(item => ({
            _id: item.productId._id,
            userId: item.productId.userId,
            name: item.productId.name,
            quantity: Number(item.quantity),
            discountPrice: Number(item.price || item.productId.discountPrice)
        }))
    };

    const processCheckoutAPI = async () => {
        const response = await fetch('https://zypcart-user-backend.onrender.com/api/products/orders/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        const result = await response.json();
        if (response.ok) {
            setIsProcessing(true);
            await new Promise(resolve => setTimeout(resolve, 3000));
            alert(result.message);
            navigate('/products');
        } else {
            setIsProcessing(false);
            throw new Error(result.message || 'Failed to place order');
        }
    };

    const handleProceed = async () => {
        const cardRegex = /^[0-9]{16}$/;
        const expiryRegex = /^(0[1-9]|1[0-2])\/?([0-9]{2})$/;
        const cvvRegex = /^[0-9]{3}$/;

        if (selectedPayment === 'upi_app' || selectedPayment === 'paytm') {
            setShowQR(true);
        } else if (selectedPayment === 'cashfree') {
            if (!cardRegex.test(cardDetails.number)) return alert("Invalid Card Number");
            if (!expiryRegex.test(cardDetails.expiry)) return alert("Invalid Expiry");
            if (!cvvRegex.test(cardDetails.cvv)) return alert("Invalid CVV");
            
            try {
                await processCheckoutAPI();
            } catch (error) {
                console.error(error);
                alert(`Checkout Failed: ${error.message}`);
            }
        } else {
            try {
                await processCheckoutAPI();
            } catch (error) {
                console.error(error);
                alert(`Checkout Failed: ${error.message}`);
            }
        }
    };

    const upiPayButton = async () => {
        alert("Payment received! Order confirmed.");
        setShowQR(false);
        try {
            await processCheckoutAPI();
        } catch (error) {
            setShowQR(true);
            alert(`Checkout Failed: ${error.message}`);
        }
    };

    return (
        <div className="checkout-container">
            {checkoutStep === 'payment' ? (
                <>
                    <div className="checkout-header">
                        <button className="back-button" onClick={() => navigate('/cart')}>Cancel</button>
                        <h2>Select a Payment Method</h2>
                    </div>

                    <div className="checkout-section">
                        {loading ? <p>Loading...</p> : hasValidAddress ? (
                            <div className="address-display">
                                <div className="address-name"><strong>Delivering to {selectedAddress.name}</strong></div>
                                <div className="address-line">{selectedAddress.street}, {selectedAddress.cityStateZip}</div>
                                <div className="address-line">Phone: {selectedAddress.phone}</div>
                                <button className="text-link-btn" onClick={() => navigate('/profile')}>Change address</button>
                            </div>
                        ) : <p className="error-block">No address found. Please update profile.</p>}
                    </div>

                    <br />

                    {/* --- NEW COUPON SECTION --- */}
                    <div className="checkout-section coupon-section">
                        <h4>Apply Seller Coupon</h4>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                            <input 
                                type="text" 
                                placeholder="Enter Code" 
                                value={couponCode} 
                                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                disabled={isCouponApplied}
                                style={{ padding: '8px', flexGrow: '1' }}
                            />
                            {!isCouponApplied ? (
                                <button className="apply-btn" onClick={handleApplyCoupon} style={{ padding: '8px 16px' }}>Apply</button>
                            ) : (
                                <button className="remove-btn" onClick={handleRemoveCoupon} style={{ padding: '8px 16px', backgroundColor: '#dc2626', color: 'white' }}>Remove</button>
                            )}
                        </div>
                        {couponMessage.text && (
                            <p style={{ marginTop: '8px', fontSize: '0.9rem', color: couponMessage.type === 'success' ? '#16a34a' : '#dc2626' }}>
                                {couponMessage.text}
                            </p>
                        )}
                    </div>

                    {/* Money Display Block */}
                    <div className="checkout-section money-summary">
                        <div className="summary-row">
                            <span>Order Amount:</span>
                            <span>₹{price_total.toLocaleString('en-IN')}</span>
                        </div>
                        {isCouponApplied && (
                            <div className="summary-row">
                                <span>Seller Discount:</span>
                                <span style={{ color: '#16a34a' }}>- ₹{discountAmount.toLocaleString('en-IN')}</span>
                            </div>
                        )}
                        <div className="summary-row">
                            <span>Processing/COD Fee:</span>
                            <span>{currentFee === 0 ? 'Free' : `₹${currentFee}`}</span>
                        </div>
                        <div className="summary-row total-row" style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #eee' }}>
                            <span>Total Payable:</span>
                            <strong style={{ fontSize: '1.2rem', color: '#b91c1c' }}>₹{finalTotal.toLocaleString('en-IN')}</strong>
                        </div>
                    </div>

                    {/* Payment Group */}
                    <div className="payment-group-container">
                        {paymentMethods.map(method => (
                            <label key={method.id} className={`payment-option-card ${selectedPayment === method.id ? 'active-selection' : ''}`}>
                                <input type="radio" name="payment_method" value={method.id} checked={selectedPayment === method.id} onChange={() => setSelectedPayment(method.id)} />
                                <span className="payment-method-name">{method.label}</span>
                                <span className="payment-icon">{method.icon}</span>
                            </label>
                        ))}
                    </div>

                    <button className="proceed-secure-btn" onClick={() => setCheckoutStep('review')} disabled={!hasValidAddress}>
                        Proceed to Review
                    </button>
                </>
            ) : (
                /* Review Section */
                <div className="review-container">
                    <h3>Final Order Review</h3>
                    <div className="checkout-section">
                        <p><strong>Total Payable:</strong> ₹{finalTotal.toLocaleString('en-IN')}</p>
                        {isCouponApplied && <p><strong>Coupon Applied:</strong> {couponCode} (-₹{discountAmount})</p>}
                        <p><strong>Payment Method:</strong> {getPaymentLabel(selectedPayment)}</p>
                        <p><strong>Delivery:</strong> {selectedAddress.name}, {selectedAddress.street}</p>
                        <div className="delivery-info">
                            <p><strong>Estimated Delivery:</strong> {getDeliveryDate()}</p>
                        </div>
                        <br />

                        {!isProcessing && selectedPayment === 'cashfree' && (
                            <div className="card-input-section">
                                <h4>Enter Card Details</h4>
                                <input type="text" placeholder="Card Number" onChange={(e) => setCardDetails({ ...cardDetails, number: e.target.value })} />
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input type="text" placeholder="MM/YY" onChange={(e) => setCardDetails({ ...cardDetails, expiry: e.target.value })} />
                                    <input type="password" placeholder="CVV" maxLength="3" onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value })} />
                                </div>
                            </div>
                        )}
                        {isProcessing ? (
                            <div className="processing-wrapper">
                                <div className="spinner"></div>
                                <p>Processing your order...</p>
                            </div>
                        ) : (
                            <>
                                <button className="place-order-btn" onClick={handleProceed}>Place your order</button>
                                <button className="text-link-btn" onClick={() => setCheckoutStep('payment')}>Go back</button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {showQR && (
                <div className="qr-modal-overlay">
                    <div className="qr-modal-content">
                        <h3>Scan to Pay ₹{finalTotal.toLocaleString('en-IN')}</h3>
                        <p>Open your UPI app and scan the code below</p>

                        <div className="qr-placeholder">
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=merchant@upi&am=${finalTotal}`}
                                alt="QR Code"
                            />
                        </div>

                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setShowQR(false)}>Cancel</button>
                            <button className="pay-btn" onClick={upiPayButton}>I have paid</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}