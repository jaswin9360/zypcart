import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './coupon.css'; // Make sure to merge your seller and scratch-card CSS into this file

// ==========================================
// 1. SELLER VIEW: Create Coupons
// ==========================================
function SellerCouponView({ user, sellerId }) {
    const [products, setProducts] = useState([]);
    const [selectedProducts, setSelectedProducts] = useState([]);
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        code: '',
        discountType: 'FLAT',
        discountValue: '',
        question: '',
        answer: '',
        expiryDate: ''
    });
    
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const fetchSellerProducts = async () => {
            if (!sellerId) return;
            try {
                const res = await fetch(`https://zypcart-product-backend.onrender.com/api/products/user-dashboard/${sellerId}`);
                if (res.ok) {
                    const data = await res.json();
                    setProducts(data);
                }
            } catch (err) {
                console.error("Failed to fetch products", err);
            }
        };
        fetchSellerProducts();
    }, [sellerId]);

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleProductToggle = (productId) => {
        setSelectedProducts(prev => 
            prev.includes(productId) 
                ? prev.filter(id => id !== productId)
                : [...prev, productId]
        );
    };

    const generateRandomCode = (e) => {
        e.preventDefault();
        const code = 'WIN-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        setFormData({ ...formData, code });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        if (selectedProducts.length === 0) {
            setMessage('Please select at least one product for this coupon.');
            setLoading(false);
            return;
        }

        const payload = {
            ...formData,
            sellerId,
            sellerName: user.name,
            applicableProducts: selectedProducts
        };

        try {
            const res = await fetch('https://zypcart-product-backend.onrender.com/api/coupons/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (res.ok) {
                setMessage('Coupon created successfully! Users can now unlock it.');
                setFormData({
                    code: '', discountType: 'FLAT', discountValue: '', 
                    question: '', answer: '', expiryDate: ''
                });
                setSelectedProducts([]);
            } else {
                setMessage(data.message || 'Failed to create coupon.');
            }
        } catch (err) {
            setMessage('Server error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="seller-coupon-container">
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
            <h2>Create a "Scratch to Win" Coupon</h2>
            <p className="subtitle">Users will have to answer your question correctly to unlock this discount.</p>

            <form onSubmit={handleSubmit} className="coupon-form-grid">
                <div className="form-section">
                    <h3>1. Setup The Prize</h3>
                    
                    <div className="form-group">
                        <label>Coupon Code</label>
                        <div className="code-input-group">
                            <input type="text" name="code" value={formData.code} onChange={handleInputChange} placeholder="e.g. SUMMER20" required />
                            <button type="button" onClick={generateRandomCode} className="generate-btn">Random</button>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Discount Type</label>
                            <select name="discountType" value={formData.discountType} onChange={handleInputChange}>
                                <option value="FLAT">Flat Amount (₹)</option>
                                <option value="PERCENTAGE">Percentage (%)</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Value</label>
                            <input type="number" name="discountValue" value={formData.discountValue} onChange={handleInputChange} placeholder={formData.discountType === 'FLAT' ? '₹100' : '20%'} required />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Expiry Date</label>
                        <input type="date" name="expiryDate" value={formData.expiryDate} onChange={handleInputChange} required />
                    </div>

                    <h3 className="section-divider">2. Setup The Game</h3>
                    <div className="form-group">
                        <label>Challenge Question</label>
                        <input type="text" name="question" value={formData.question} onChange={handleInputChange} placeholder="e.g. What year was our brand founded?" required />
                    </div>
                    <div className="form-group">
                        <label>Correct Answer</label>
                        <input type="text" name="answer" value={formData.answer} onChange={handleInputChange} placeholder="e.g. 2018" required />
                        <small>Answers are not case-sensitive.</small>
                    </div>
                </div>

                <div className="form-section">
                    <h3>3. Select Applicable Products</h3>
                    <p className="helper-text">Select which items this coupon will work on.</p>
                    
                    <div className="product-list-container">
                        {products.length === 0 ? (
                            <p>Loading products or no products found...</p>
                        ) : (
                            products.map(product => (
                                <label key={product._id} className={`product-select-card ${selectedProducts.includes(product._id) ? 'selected' : ''}`}>
                                    <input type="checkbox" checked={selectedProducts.includes(product._id)} onChange={() => handleProductToggle(product._id)} />
                                    <img src={product.imageUrls[0]} alt={product.name} />
                                    <div className="product-info">
                                        <h4>{product.name}</h4>
                                        <p>₹{product.discountPrice || product.price}</p>
                                    </div>
                                </label>
                            ))
                        )}
                    </div>
                </div>

                <div className="full-width-actions">
                    {message && <div className={`message-banner ${message.includes('success') ? 'success' : 'error'}`}>{message}</div>}
                    <button type="submit" className="submit-coupon-btn" disabled={loading}>
                        {loading ? 'Generating...' : 'Create Scratch & Win Coupon'}
                    </button>
                </div>
            </form>
        </div>
    );
}

function BuyerCouponView({ activeUserId }) {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCoupon, setSelectedCoupon] = useState(null);
    const [userAnswer, setUserAnswer] = useState('');
    const [isCorrect, setIsCorrect] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Animation & Scratch States
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasScratched, setHasScratched] = useState(false);
    const [showCelebration, setShowCelebration] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchCoupons = async () => {
            try {
                const url = activeUserId 
                    ? `https://zypcart-product-backend.onrender.com/api/coupons/active?userId=${activeUserId}`
                    : `https://zypcart-product-backend.onrender.com/api/coupons/active`;
                    
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    setCoupons(data);
                }
            } catch (err) {
                console.error("Failed to fetch coupons:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchCoupons();
    }, [activeUserId]);

    const handleAnswerSubmit = async (e) => {
        e.preventDefault();
        
        if (userAnswer.trim().toLowerCase() === selectedCoupon.answer.toLowerCase()) {
            try {
                const res = await fetch('https://zypcart-product-backend.onrender.com/api/coupons/claim', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ couponId: selectedCoupon._id, userId: activeUserId })
                });
                
                const data = await res.json();
                
                if (res.ok && data.success) {
                    setIsCorrect(true);
                    setErrorMsg('');
                    
                    // Update local state so it appears in the claimed list when we go back
                    setCoupons(prev => prev.map(c => 
                        c._id === selectedCoupon._id ? { ...c, isClaimed: true, claimedBy: activeUserId } : c
                    ));
                    
                    setTimeout(initCanvas, 100);
                } else {
                    setErrorMsg(data.message || 'Someone else already claimed this!');
                }
            } catch (err) {
                setErrorMsg('Network error while claiming coupon.');
            }
        } else {
            setErrorMsg('Incorrect answer! Try again.');
        }
    };

    const initCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = 300;
        canvas.height = 150;
        ctx.fillStyle = '#c0c0c0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = '20px Arial';
        ctx.fillStyle = '#4b5563';
        ctx.textAlign = 'center';
        ctx.fillText('Scratch Here', canvas.width / 2, canvas.height / 2 + 7);
    };

    const scratch = (x, y) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.fill();
    };

    const getCoordinates = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const startDrawing = (e) => { 
        setIsDrawing(true); 
        setHasScratched(true); // Detect that they started scratching!
        const { x, y } = getCoordinates(e); 
        scratch(x, y); 
    };
    
    const draw = (e) => { 
        if (!isDrawing) return; 
        e.preventDefault(); 
        const { x, y } = getCoordinates(e); 
        scratch(x, y); 
    };
    
    const stopDrawing = () => setIsDrawing(false);

    // Trigger Celebration Animation & Return to List
    const handleCollectReward = () => {
        setShowCelebration(true);
        setTimeout(() => {
            setShowCelebration(false);
            setSelectedCoupon(null); // Go back to list
            setIsCorrect(false);
            setUserAnswer('');
            setHasScratched(false);
        }, 1500); // Wait 1.5s for animation to finish
    };

    if (loading) return <div className="scratch-wrapper">Loading challenges...</div>;

    if (!selectedCoupon) {
        return (
            <div className="scratch-wrapper">
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
                <h2>Unlock Secret Discounts</h2>
                <p>Answer the seller's trivia question to reveal a discount code.</p>
                <div className="coupon-grid">
                    {coupons.length === 0 ? (
                        <p>No active challenges available right now.</p>
                    ) : (
                        coupons.map(coupon => {
                            const isAlreadyWon = coupon.isClaimed && coupon.claimedBy === activeUserId;
                            const sellerName = coupon.sellerName
                            const validFor = coupon.applicableProducts?.length > 0 
                                ? coupon.applicableProducts.map(p => p.name).join(', ') 
                                : 'All Seller Products';

                            if (isAlreadyWon) {
                                return (
                                    <div key={coupon._id} className="challenge-card claimed-card">
                                        <div className="prize-tag claimed-tag">
                                            {coupon.discountType === 'FLAT' ? `₹${coupon.discountValue}` : `${coupon.discountValue}%`} OFF
                                        </div>
                                        <p className="provider-text">🎁 Gift from: <strong>{sellerName}</strong></p>
                                        <h4>Your Won Code:</h4>
                                        <p className="revealed-code-text">{coupon.code}</p>
                                        <p className="applicable-products-text">✔ Valid on: {validFor}</p>
                                        <button className="copy-btn outline-btn" onClick={() => navigator.clipboard.writeText(coupon.code)}>
                                            Copy Code
                                        </button>
                                        <p className="expiry-text">Expires: {new Date(coupon.expiryDate).toLocaleDateString()}</p>
                                    </div>
                                );
                            }

                            return (
                                <div key={coupon._id} className="challenge-card" onClick={() => setSelectedCoupon(coupon)}>
                                    <div className="prize-tag">
                                        {coupon.discountType === 'FLAT' ? `₹${coupon.discountValue}` : `${coupon.discountValue}%`} OFF
                                    </div>
                                    <p className="provider-text">🎁 Gift from: <strong>{sellerName}</strong></p>
                                    <h4>Challenge Question:</h4>
                                    <p className="question-text">"{coupon.question}"</p>
                                    <p className="applicable-products-text">✔ Valid on: {validFor}</p>
                                    <button className="play-btn">Play to Unlock</button>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className={`scratch-wrapper ${showCelebration ? 'celebrating' : ''}`}>
            <button className="back-btn" onClick={() => { setSelectedCoupon(null); setIsCorrect(false); setUserAnswer(''); setHasScratched(false); }}>
                ← Back to challenges
            </button>
            
            <div className="active-challenge">
                <h3>{selectedCoupon.question}</h3>
                {!isCorrect ? (
                    <form onSubmit={handleAnswerSubmit} className="answer-form">
                        <input type="text" placeholder="Type your answer here..." value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} required />
                        <button type="submit">Submit Answer</button>
                        {errorMsg && <p className="error-text">{errorMsg}</p>}
                    </form>
                ) : (
                    <div className="scratch-card-container">
                        <p className="success-text">Correct! Scratch below to reveal your code.</p>
                        
                        <div className="scratch-area">
                            <div className="revealed-content">
                                <span className="prize-amount">
                                    {selectedCoupon.discountType === 'FLAT' ? `₹${selectedCoupon.discountValue}` : `${selectedCoupon.discountValue}%`} OFF
                                </span>
                                <span className="code">{selectedCoupon.code}</span>
                            </div>
                            <canvas 
                                ref={canvasRef} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
                                onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
                            />
                        </div>

                        {/* Appears once the user starts scratching */}
                        <div className={`collect-section ${hasScratched ? 'show-collect' : ''}`}>
                            <button className="collect-reward-btn" onClick={handleCollectReward}>
                                🎉 Collect Reward & Save 🎉
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ==========================================
// 3. MAIN COMPONENT: Role Router
// ==========================================
export default function Coupon() {
    const { user } = useContext(AuthContext);
    const activeUserId = user?.id || user?._id; 
    const sellerId = user?.id || user?._id;

    // Check user role here. Update 'seller' to match exactly how roles are stored in your DB (e.g., 'admin', 'merchant', etc.)
    const isSeller = user?.role === 'seller'; 

    if (isSeller) {
        return <SellerCouponView user={user} sellerId={sellerId} />;
    }

    return <BuyerCouponView activeUserId={activeUserId} />;
}