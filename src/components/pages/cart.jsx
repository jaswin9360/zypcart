import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './cart.css';

export default function Cart() {
    const { user, updatePrice } = useContext(AuthContext);
    const navigate = useNavigate();

    const [dbCartItems, setDbCartItems] = useState([]);

    const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

    // ============================================================
    // PAGE LOADING
    // ============================================================

    const [pageLoading, setPageLoading] = useState(true);

    const activeUserId =
        user?.id ||
        user?._id ||
        "user_guest_99";

    // ============================================================
    // FETCH CART
    // ============================================================

    const fetchDBCart = async () => {
        try {
            const response = await fetch(
                `https://zypcart-product-backend.onrender.com/api/cart/${activeUserId}`
            );

            if (response.ok) {
                const data = await response.json();

                setDbCartItems(
                    Array.isArray(data) ? data : []
                );
            }

        } catch (err) {

            console.error(
                "Error reading database items:",
                err
            );

        } finally {

            // Cart data is now ready
            setPageLoading(false);

        }
    };

    // ============================================================
    // LOAD CART WHEN USER CHANGES
    // ============================================================

    useEffect(() => {
        if (activeUserId) {
            setPageLoading(true);
            fetchDBCart();
        }
    }, [activeUserId]);

    // ============================================================
    // ACTIVE CART ITEMS
    // NO 7-DAY EXPIRATION
    // ============================================================

    const activeCartItems = dbCartItems
        .map(item => {

            if (!item || !item.productId) {
                return null;
            }

            // productId is populated by backend
            if (
                typeof item.productId === 'object' &&
                item.productId.name
            ) {
                return {
                    ...item.productId,

                    // Cart quantity
                    quantity: item.quantity || 1,

                    // CartItem database ID
                    cartItemId: item._id
                };
            }

            return null;
        })
        .filter(Boolean);

    // ============================================================
    // PRICE CALCULATIONS
    // ============================================================

    const totalMRP = activeCartItems.reduce(
        (sum, item) =>
            sum +
            ((Number(item.mrpPrice) || 0) *
                item.quantity),
        0
    );

    const totalCurrentDealPrice =
        activeCartItems.reduce(
            (sum, item) =>
                sum +
                ((Number(item.discountPrice) || 0) *
                    item.quantity),
            0
        );

    const price =
        updatePrice(totalCurrentDealPrice);

    const totalSavingsCalculated = Math.max(
        0,
        totalMRP - totalCurrentDealPrice
    );

    // ============================================================
    // QUANTITY
    // ============================================================

    const handleQuantityAdjustment = async (
        productId,
        currentQty,
        adjustmentAmount
    ) => {

        const targetQty =
            currentQty + adjustmentAmount;

        if (targetQty <= 0) {
            handleRemoveItem(productId);
            return;
        }

        if (targetQty > 5) {
            alert(
                "Maximum purchase cap limit is 5 units per item."
            );
            return;
        }

        try {

            const response = await fetch(
                'https://zypcart-product-backend.onrender.com/api/cart',
                {
                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    body: JSON.stringify({
                        userId: activeUserId,
                        productId,
                        quantity: targetQty
                    })
                }
            );

            if (response.ok) {
                fetchDBCart();
            }

        } catch (err) {

            console.error(
                "Error updating cart quantity:",
                err
            );

        }
    };

    // ============================================================
    // REMOVE ITEM
    // ============================================================

    const handleRemoveItem = async (productId) => {

        try {

            const response = await fetch(
                `https://zypcart-product-backend.onrender.com/api/cart/${activeUserId}/${productId}`,
                {
                    method: 'DELETE'
                }
            );

            if (response.ok) {
                fetchDBCart();
            }

        } catch (err) {

            console.error(
                "Error removing cart item:",
                err
            );

        }
    };

    // ============================================================
    // CHECKOUT
    // ============================================================

    const processSecureCheckout = async () => {

        if (activeCartItems.length === 0) {
            return;
        }

        setIsProcessingCheckout(true);

        try {

            const response = await fetch(
                'https://zypcart-product-backend.onrender.com/api/products/orders/checkout',
                {
                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    body: JSON.stringify({
                        userId: activeUserId,

                        buyerName:
                            user?.name ||
                            "Verified Customer",

                        buyerEmail:
                            user?.email ||
                            "customer@zypcart.com",

                        cartItems:
                            activeCartItems
                    })
                }
            );

            if (response.ok) {

                alert(
                    'Checkout completed successfully! 🎉'
                );

                navigate('/products');

            } else {

                const errorData =
                    await response.json();

                alert(
                    errorData.message ||
                    "Checkout failed."
                );
            }

        } catch (err) {

            console.error(
                "Checkout error:",
                err
            );

            alert(
                "Unable to complete checkout."
            );

        } finally {

            setIsProcessingCheckout(false);

        }
    };

    // ============================================================
    // CHECKOUT NAVIGATION LOADING
    // ============================================================

    const handleProceedToCheckout = () => {

        if (activeCartItems.length === 0) {
            return;
        }

        setIsProcessingCheckout(true);

        setTimeout(() => {
            navigate('/checkout');
        }, 500);
    };

    // ============================================================
    // PAGE LOADING SCREEN
    // ============================================================

    if (pageLoading) {

        return (
            <div className="cart-loading-screen">

                <div className="cart-loading-box">

                    <div className="cart-loading-logo">

                        <img
                            src="/Zypcart.png"
                            alt="Zypcart"
                        />

                    </div>

                    <div className="cart-loading-spinner"></div>

                    <h2>
                        Loading your cart
                    </h2>

                    <p>
                        Please wait while we prepare your shopping cart...
                    </p>

                </div>

            </div>
        );
    }

    // ============================================================
    // UI
    // ============================================================

    return (
        <div className="cart-page-wrapper">

            {/* ================================================== */}
            {/* HEADER */}
            {/* ================================================== */}

            <header className="cart-header">

                <button
                    className="back-to-store-btn"
                    onClick={() =>
                        navigate('/products')
                    }
                >
                    ← Return to Marketplace
                </button>

                <h2>
                    Your Shopping Cart Basket
                </h2>

            </header>

            {/* ================================================== */}
            {/* EMPTY CART */}
            {/* ================================================== */}

            {activeCartItems.length === 0 ? (

                <div className="empty-cart-fallback">

                    <div className="empty-icon-cloud">
                        🛒
                    </div>

                    <h3>
                        Your shopping bag is completely empty!
                    </h3>

                    <p>
                        Add products to your cart to continue shopping.
                    </p>

                </div>

            ) : (

                /* ==================================================
                   CART CONTENT
                   ================================================== */

                <div className="cart-layout-split-grid">

                    {/* ==================================================
                       CART ITEMS
                       ================================================== */}

                    <div className="cart-items-collection-deck">

                        {activeCartItems.map((item) => (

                            <div
                                key={item.cartItemId}
                                className="cart-item-row-card"
                            >

                                {/* PRODUCT IMAGE */}

                                <div className="cart-item-image-box">

                                    <img
                                        src={
                                            item.imageUrls?.[0] ||
                                            'https://placehold.co/100x100'
                                        }
                                        alt={
                                            item.name ||
                                            "Product"
                                        }
                                    />

                                </div>

                                {/* PRODUCT DETAILS */}

                                <div className="cart-item-details-box">

                                    <span className="cart-item-category-tag">
                                        {
                                            item.category ||
                                            "Electronics"
                                        }
                                    </span>

                                    <h4>
                                        {item.name}
                                    </h4>

                                    {/* NO 7-DAY TIMER */}

                                    <button
                                        className="cart-item-delete-link"
                                        onClick={() =>
                                            handleRemoveItem(
                                                item._id
                                            )
                                        }
                                    >
                                         Remove Item
                                    </button>

                                </div>

                                {/* ==================================================
                                   QUANTITY
                                   ================================================== */}

                                <div className="cart-item-quantity-deck">

                                    <label>
                                        Quantity
                                    </label>

                                    <div className="quantity-stepper-control">

                                        <button
                                            onClick={() =>
                                                handleQuantityAdjustment(
                                                    item._id,
                                                    item.quantity,
                                                    -1
                                                )
                                            }
                                        >
                                            −
                                        </button>

                                        <span className="qty-counter-value">
                                            {item.quantity}
                                        </span>

                                        <button
                                            onClick={() =>
                                                handleQuantityAdjustment(
                                                    item._id,
                                                    item.quantity,
                                                    1
                                                )
                                            }
                                        >
                                            +
                                        </button>

                                    </div>

                                </div>

                                {/* ==================================================
                                   PRICE
                                   ================================================== */}

                                <div className="cart-item-pricing-box">

                                    <span className="cart-item-deal-price">

                                        ₹
                                        {(
                                            (Number(
                                                item.discountPrice
                                            ) || 0) *
                                            item.quantity
                                        ).toLocaleString(
                                            'en-IN'
                                        )}

                                    </span>

                                </div>

                            </div>

                        ))}

                    </div>

                    {/* ==================================================
                       RECEIPT / SUMMARY
                       ================================================== */}

                    <div className="cart-receipt-summary-panel">

                        <h3>
                            Order Financial Overview
                        </h3>

                        <div className="receipt-calculations-table">

                            {/* MRP */}

                            <div className="receipt-calc-row">

                                <span>
                                    Items Subtotal (Gross MRP)
                                </span>

                                <span>
                                    ₹
                                    {totalMRP.toLocaleString(
                                        'en-IN'
                                    )}
                                </span>

                            </div>

                            {/* SAVINGS */}

                            <div className="receipt-calc-row promo-savings-deduction">

                                <span>
                                    Promotional Discount Savings
                                </span>

                                <span>
                                    − ₹
                                    {totalSavingsCalculated.toLocaleString(
                                        'en-IN'
                                    )}
                                </span>

                            </div>

                            {/* DIVIDER */}

                            <div
                                className="dropdown-divider"
                                style={{
                                    margin: '14px 0',
                                    height: '1px',
                                    background:
                                        '#e2e8f0'
                                }}
                            />

                            {/* TOTAL */}

                            <div className="receipt-calc-row ultimate-total-row">

                                <span>
                                    Total Amount Due
                                </span>

                                <span className="final-bill-price">

                                    ₹
                                    {totalCurrentDealPrice.toLocaleString(
                                        'en-IN'
                                    )}

                                </span>

                            </div>

                        </div>

                        <br />

                        {/* CHECKOUT */}

                        <button
                            className="checkout-payment-btn"
                            disabled={
                                isProcessingCheckout ||
                                activeCartItems.length === 0
                            }
                            onClick={
                                handleProceedToCheckout
                            }
                        >

                            {isProcessingCheckout
                                ? (
                                    <span className="checkout-loading-content">

                                        <span className="checkout-spinner"></span>

                                        Preparing Checkout...

                                    </span>
                                )
                                : (
                                    "Proceed to Secure Checkout "
                                )}

                        </button>

                    </div>

                </div>
            )}

        </div>
    );
}