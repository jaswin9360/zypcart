import React, { useState, useContext, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { jsPDF } from "jspdf";
import './products.css';

export default function Products() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  // Clean user role configurations
  const userRoleCleaned = user?.role ? String(user.role).toLowerCase().trim() : '';
  const isSeller = userRoleCleaned === 'seller';

  const currentYear = new Date().getFullYear();

  // Core View & Data Matrix Trackers
  const [view, setView] = useState('buyer');
  const [showDropdown, setShowDropdown] = useState(false);
  const [products, setProducts] = useState([]);
  const [dbCartBadgeItems, setDbCartBadgeItems] = useState([]);
  const [liveOrders, setLiveOrders] = useState([]);
  const [sellerSubView, setSellerSubView] = useState('dashboard');

  // Search Engine Query Managers
  const [searchQuery, setSearchQuery] = useState('');

  // Interactive UI Control Hooks
  const [hoveredProductId, setHoveredProductId] = useState(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Modal Popup Form State Configuration Panels
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [festivalDiscountPct, setFestivalDiscountPct] = useState('');
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);

  // Structural Matrix Blueprint for New Forms
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: 'Electronics',
    mrpPrice: '',
    discountPrice: '',
    transactionType: 'sell',
    imageUrls: '',
    stock: '',
    discountReason: '',
    specifications: [{ key: '', value: '' }]
  });

  const dropdownRef = useRef(null);
  const activeUserId = user?.id || user?._id || "user_guest_99";

  // -- Zypcart SMART ASSIST V3.0 DEPLOYMENT START ---
  const [showSri, setShowSri] = useState(false);
  const [sriMessages, setSriMessages] = useState([
    { sender: 'ai', text: 'Zypcart  Smart Assist V3.0 online. Try saying: "Add iPhone 13 to my cart" or "Show the colours of Samsung TV".' }
  ]);
  const [sriInput, setSriInput] = useState('');

  const executeSriAutomation = (commandText) => {
    const cmd = commandText.toLowerCase().trim();
    let response = "I couldn't process that command. Try asking for specific product details or navigation pages.";

    // Intent 1: Direct Cart Action Automation (e.g., "add iphone 13 to my cart")
    if (cmd.includes('add') && (cmd.includes('cart') || cmd.includes('buy') || cmd.includes('put'))) {
      const targetProd = products.find(p => p.name && cmd.includes(p.name.toLowerCase()));
      if (targetProd) {
        handleAddToCart(targetProd._id, targetProd.stock);
        response = `🛒 Automation Complete: "${targetProd.name}" has been added to your shopping cart state.`;
      } else {
        response = "I couldn't locate that specific product name in our current live inventory stream.";
      }
    }

    // Intent 2: Granular Attribute / Specification Extraction (e.g., "show the colours of iphone 17")
    else if (cmd.includes('show') || cmd.includes('what is') || cmd.includes('get') || cmd.includes('tell me')) {
      const targetProd = products.find(p => p.name && cmd.includes(p.name.toLowerCase()));

      if (targetProd) {
        let matchedSpec = null;

        // Scan the nested specifications matrix for matches
        if (targetProd.specifications && Array.isArray(targetProd.specifications)) {
          matchedSpec = targetProd.specifications.find(s => {
            const keyWord = s.key.toLowerCase();
            return cmd.includes(keyWord) ||
              (cmd.includes('colour') && keyWord.includes('color')) ||
              (cmd.includes('color') && keyWord.includes('color'));
          });
        }

        if (matchedSpec) {
          response = `📋 **${targetProd.name} → Available ${matchedSpec.key}**: ${matchedSpec.value}`;
        } else {
          // Fallback to macro attributes if a specific spec row isn't explicitly isolated
          if (cmd.includes('price') || cmd.includes('cost') || cmd.includes('mrp')) {
            response = `💰 **${targetProd.name} Pricing**: Deal Price is ₹${targetProd.discountPrice.toLocaleString('en-IN')} (MRP: ₹${targetProd.mrpPrice.toLocaleString('en-IN')})`;
          } else if (cmd.includes('stock') || cmd.includes('quantity') || cmd.includes('left')) {
            response = `📦 **${targetProd.name} Inventory**: ${targetProd.stock} structural units remaining in store.`;
          } else if (cmd.includes('category') || cmd.includes('tag')) {
            response = `🏷️ **${targetProd.name} Class**: Cataloged under "${targetProd.category}".`;
          } else {
            // General modal extraction fallback
            setSelectedProductDetails(targetProd);
            response = `🔍 I have pulled up the full specification modal layout for "${targetProd.name}". What specific details would you like me to isolate?`;
          }
        }
      } else {
        response = "Could not identify that product item. Please verify the exact name on the display grid.";
      }
    }

    // Intent 3: General UI Navigation & Control Deck Actions
    else if (cmd.includes('cart')) {
      navigate('/cart');
      response = "Opening cart checkout interface...";
    } else if (cmd.includes('order')) {
      navigate('/orders');
      response = "Routing to your continuous order tracking logs...";
    } else if (cmd.includes('seller')) {
      if (isSeller) {
        setView('seller');
        setSellerSubView('dashboard');
        response = "Seller panel activated successfully.";
      } else {
        response = "Access restriction protocol triggered: Account does not possess merchant role privileges.";
      }
    } else if (cmd.includes('buyer')) {
      setView('buyer');
      response = "Returned to standard consumer marketplace view mode.";
    } else if (cmd.includes('search')) {
      const query = cmd.replace('search', '').trim();
      if (query) {
        setSearchQuery(query);
        response = `Applying filter mask for query: "${query}"`;
      } else {
        response = "Please input a valid sequence to filter the product index.";
      }
    } else if (cmd.includes('clear') || cmd.includes('reset')) {
      setSearchQuery('');
      response = "Marketplace search query masks completely reset.";
    } else if (cmd.includes('logout')) {
      handleLogoutClick();
      response = "Session terminated.";
    }

    setSriMessages(prev => [...prev, { sender: 'ai', text: response }]);
  };

  const handleSriCommand = (e) => {
    e.preventDefault();
    if (!sriInput.trim()) return;

    const currentInput = sriInput;
    setSriMessages(prev => [...prev, { sender: 'user', text: currentInput }]);
    setSriInput('');

    setTimeout(() => {
      executeSriAutomation(currentInput);
    }, 350);
  };
  // --- Zypcart  SMART ASSIST V3.0 DEPLOYMENT END ---

  // Auto-close navigation dropdowns on outside mouse click
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);


  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  useEffect(() => {
    fetch(`https://zypcart-product-backend.onrender.com/api/products/orders/seller/${activeUserId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch orders');
        return res.json();
      })
      .then((data) => {
        setOrders(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [activeUserId]);

  // Automatic slideshow cycle loop when hovering
  useEffect(() => {
    if (!hoveredProductId) return;

    const targetProduct = products.find(p => p._id === hoveredProductId);
    const totalImages = targetProduct?.imageUrls?.length || 0;

    if (totalImages <= 1) return;

    const slideshowTimer = setInterval(() => {
      setCurrentSlideIndex((prevIndex) => (prevIndex + 1) % totalImages);
    }, 2000); // Increased slightly so manual clicks have more breathing room

    return () => clearInterval(slideshowTimer);
  }, [hoveredProductId, products]);

  // Sync component catalog dataset directly with remote REST APIs
  const syncInventoryCatalog = async () => {
    let endpoint = 'https://zypcart-product-backend.onrender.com/api/products/marketplace';

    if (isSeller && view === 'seller') {
      endpoint = `https://zypcart-product-backend.onrender.com/api/products/user-dashboard/${activeUserId}`;
    }

    try {
      const response = await fetch(endpoint);
      if (response.ok) {
        const payloadData = await response.json();
        setProducts(payloadData);
      }
    } catch (err) {
      console.error("Failed to sync records from dataset inventory matrix:", err);
    }
  };

  // Sync current client cart elements from persistent cloud stores
  const fetchDBCartQuantitiesOnly = async () => {
    try {
      const response = await fetch(`https://zypcart-product-backend.onrender.com/api/cart/${activeUserId}`);
      if (response.ok) {
        const data = await response.json();
        setDbCartBadgeItems(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Cart retrieval processing error sequence:", err);
    }
  };

  // Sync incoming operations logs with merchant context
  const syncLiveSellerOrders = async () => {
    if (!isSeller) return;
    try {
      const response = await fetch(`https://zypcart-product-backend.onrender.com/api/products/orders/seller/${activeUserId}`);
      if (response.ok) {
        const data = await response.json();
        setLiveOrders(data);
      }
    } catch (err) {
      console.error("Failed executing real-time order data compilation:", err);
    }
  };

  // Unified batch sync update hook
  useEffect(() => {
    syncInventoryCatalog();
    fetchDBCartQuantitiesOnly();
    if (isSeller && view === 'seller') {
      syncLiveSellerOrders();
    }
  }, [view, user, sellerSubView]);

  // Analytical Calculations
  const totalProductsCount = products.length;
  const totalOrdersAccumulator = orders.reduce((sum, item) => sum + (item.items[0].quantity), 0);
  const totalRevenueCalculated = orders.reduce((sum, item) => sum + (((item.totalAmountPaid) * (item.items[0].quantity))), 0);
  const totalCartItemsCount = dbCartBadgeItems.reduce((sum, item) => sum + (item.quantity), 0);

  // String Filtration Array Algorithm
  const filteredProducts = products.filter(product => {
    const query = searchQuery.toLowerCase().trim();
    return (
      product.name?.toLowerCase().includes(query) ||
      product.category?.toLowerCase().includes(query) ||
      (product.sellerName || product.userId)?.toLowerCase().includes(query)
    );
  });

  // Dynamic input form fields handlers
  const handleFormInputChange = (e) => {
    setNewProduct({ ...newProduct, [e.target.name]: e.target.value });
  };

  const handleAddSpecificationField = () => {
    setNewProduct({
      ...newProduct,
      specifications: [
        ...(Array.isArray(newProduct.specifications) ? newProduct.specifications : []),
        { key: '', value: '' }
      ]
    });
  };

  const handleUpdateSpecificationField = (index, field, value) => {
    const freshSpecs = [...newProduct.specifications];
    freshSpecs[index][field] = value;
    setNewProduct({ ...newProduct, specifications: freshSpecs });
  };

  const handleRemoveSpecificationField = (index) => {
    const freshSpecs = newProduct.specifications.filter((_, i) => i !== index);
    setNewProduct({ ...newProduct, specifications: freshSpecs });
  };

  const handleFestivalDiscountApply = () => {
    const pct = parseFloat(festivalDiscountPct);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      alert("Please enter a valid percentage drop between 0 and 100.");
      return;
    }
    const currentPrice = Number(newProduct.mrpPrice);
    if (!currentPrice) {
      alert("Please configure an Original MRP value prior to applying seasonal deductions.");
      return;
    }

    const systemCalculatedPrice = Math.max(0, Math.round(currentPrice * (1 - pct / 100)));

    setNewProduct(prev => ({
      ...prev,
      discountPrice: systemCalculatedPrice,
      discountReason: `Festival Special Sale (${pct}% OFF)`
    }));
    setFestivalDiscountPct('');
  };

  const handleLogoutClick = async () => {
    try {
      if (typeof logout === 'function') await logout();
    } catch (err) {
      console.error(err);
    } finally {
      navigate('/');
    }
  };

  // Cloud shopping cart sync logic
  const handleAddToCart = async (productId, itemStock) => {
    const existingMatch = dbCartBadgeItems.find(item => String(item.productId?._id || item.productId) === String(productId));
    const currentQty = existingMatch ? existingMatch.quantity : 0;
    const targetQty = currentQty + 1;
    const maxAllowedStock = Math.min(itemStock || 99, 5);

    if (targetQty > maxAllowedStock) {
      alert(`Maximum item cap limit reached! Limit is up to ${maxAllowedStock} units.`);
      return;
    }

    try {
      const response = await fetch('https://zypcart-product-backend.onrender.com/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: activeUserId, productId, quantity: targetQty })
      });
      if (response.ok) {
        fetchDBCartQuantitiesOnly();
      }
    } catch (err) {
      console.error("Critical failure adding items directly to target data carts:", err);
    }
  };

  const handleOpenEditModal = (product) => {
    setIsEditing(true);
    setEditingProductId(product._id);
    setFormError('');
    setFestivalDiscountPct('');

    setNewProduct({
      name: product.name || '',
      category: product.category || 'Electronics',
      mrpPrice: product.mrpPrice || '',
      discountPrice: product.discountPrice || '',
      transactionType: product.transactionType || 'sell',

      // CRITICAL FIX: Ensure this is always an Array, NEVER a string!
      imageUrls: Array.isArray(product.imageUrls)
        ? product.imageUrls
        : (typeof product.imageUrls === 'string' && product.imageUrls.trim() !== ''
          ? [product.imageUrls]
          : []),

      stock: product.stock || '',
      discountReason: product.discountReason || '',
      specifications: product.specifications && product.specifications.length > 0
        ? product.specifications
        : [{ key: '', value: '' }]
    });

    setShowModal(true);
  };

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setEditingProductId(null);
    setFormError('');
    setFestivalDiscountPct('');
    setNewProduct({
      name: '',
      category: 'Electronics',
      mrpPrice: '',
      discountPrice: '',
      transactionType: 'sell',
      imageUrls: '',
      stock: '',
      discountReason: '',
      specifications: [{ key: '', value: '' }]
    });
    setShowModal(true);
  };


  const handleCreateProductSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const parsingImageUrls = Array.isArray(newProduct.imageUrls)
      ? newProduct.imageUrls.map(url => typeof url === 'string' ? url.trim() : '').filter(Boolean)
      : [];

    const cleanedSpecifications = newProduct.specifications.filter(s => s.key.trim() && s.value.trim());



    const bodyPayload = {
      userId: activeUserId,
      sellerName: user?.name,
      name: newProduct.name,
      category: newProduct.category,
      mrpPrice: Number(newProduct.mrpPrice),
      discountPrice: Number(newProduct.discountPrice),
      transactionType: newProduct.transactionType,
      imageUrls: parsingImageUrls,
      stock: Number(newProduct.stock),
      discountReason: newProduct.discountReason,
      specifications: cleanedSpecifications
    };

    const urlEndpoint = isEditing
      ? `https://zypcart-product-backend.onrender.com/api/products/${editingProductId}`
      : 'https://zypcart-product-backend.onrender.com/api/products';

    try {
      const response = await fetch(urlEndpoint, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Server baseline tracking rejection error.');

      setShowModal(false);
      syncInventoryCatalog();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleDeleteProduct = async (productId, productName) => {
    const confirmSystemClearance = window.confirm(`Are you sure you want to permanently delete "${productName}"?`);
    if (!confirmSystemClearance) return;

    try {
      const response = await fetch(`https://zypcart-product-backend.onrender.com/api/products/${productId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorPayload = await response.json();
        throw new Error(errorPayload.message || 'Failed to remove node.');
      }

      syncInventoryCatalog();
    } catch (err) {
      console.error(err);
      alert(`Error deleting product: ${err.message}`);
    }
  };

  // PDF Document Generation Layout Engine
  const generatePDFSpecsDocument = (product) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    doc.setFillColor(186, 65, 93);
    doc.rect(0, 0, 210, 26, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(product.name || "Product Specifications", 15, 17);

    doc.setFontSize(11);
    let yPos = 40;

    const addSpecRow = (sectionTitle, technicalContent) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 25;
      }
      doc.setFont("helvetica", "bold");
      doc.setTextColor(186, 65, 93);
      doc.text(String(sectionTitle).toUpperCase(), 15, yPos);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      doc.text(technicalContent || 'N/A', 65, yPos);

      doc.setDrawColor(226, 232, 240);
      doc.line(15, yPos + 4, 195, yPos + 4);
      yPos += 15;
    };

    addSpecRow("CATALOG TYPE", product.category);

    if (product.specifications && product.specifications.length > 0) {
      product.specifications.forEach((spec) => {
        addSpecRow(spec.key, spec.value);
      });
    } else {
      addSpecRow("SPEC DETAILS", "No special structural attributes listed.");
    }

    if (yPos > 270) { doc.addPage(); yPos = 25; }
    doc.setFont("helvetica", "bold");
    doc.setTextColor(186, 65, 93);
    doc.text("STORE DEAL PRICE", 15, yPos);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(22, 163, 74);
    doc.text(`INR ₹ ${product.discountPrice?.toLocaleString('en-IN')}/-`, 65, yPos);

    if (product.discountReason) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Applied Event: ${product.discountReason}`, 65, yPos + 6);
    }

    doc.save(`${product.name?.replace(/\s+/g, '_')}_Specs_Registry.pdf`);
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [userBgImage, setUserBgImage] = useState('');

  const productsPerPage = 10;
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;

  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);

  const handleBackgroundUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setUserBgImage(imageUrl);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);


  /* ==================================================================
      SUB-VIEW RENDERING DECK (SELLER COMPONENT MATRICES)
     ================================================================== */

  const renderDashboardHome = () => (
    <>
      <div className="metrics-grid">
        <div className="metric-card blue-tint">
          <div className="card-icon-box">👜</div>
          <div className="metric-data">
            <span className="metric-label">Total Products</span>
            <h3>{totalProductsCount}</h3>
          </div>
        </div>
        <div className="metric-card green-tint">
          <div className="card-icon-box">🛒</div>
          <div className="metric-data">
            <span className="metric-label">Total Orders</span>
            <h3>{totalOrdersAccumulator}</h3>
          </div>
        </div>
        <div className="metric-card purple-tint">
          <div className="card-icon-box">💵</div>
          <div className="metric-data">
            <span className="metric-label">Total Revenue</span>
            <h3>₹ {totalRevenueCalculated.toLocaleString('en-IN')}</h3>
          </div>
        </div>
      </div>

      <div className="dashboard-panel panel-margin">
        <div className="panel-header">
          <h3>Recent Products Overview</h3>
          <button className="text-link-btn" onClick={() => setSellerSubView('products')}>View All →</button>
        </div>
        {renderProductsTable(products.slice(0, 5))}
      </div>
    </>
  );

  const renderProductsTab = () => (
    <div className="dashboard-panel">
      <div className="panel-header">
        <h3>Inventory Control Board ({totalProductsCount})</h3>
        <button className="btn-primary" onClick={handleOpenCreateModal}>+ Add New Product</button>
      </div>
      {renderProductsTable(products)}
    </div>
  );

  const renderProductsTable = (targetDataset) => (
    <div className="table-responsive">
      <table className="data-table">
        <thead>
          <tr>
            <th>Image</th>
            <th>Product</th>
            <th>Category</th>
            <th>MRP Price</th>
            <th>Deal Price</th>
            <th>Type</th>
            <th>Stock</th>
            <th>Status</th>
            <th className="text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {targetDataset.map((item) => (
            <tr key={item._id}>
              <td>
                <img src={item.imageUrls?.[0] || 'https://placehold.co/40x40?text=No+Img'} alt="" className="table-img" />
              </td>
              <td className="fw-600">{item.name}</td>
              <td><span className="text-muted text-sm">{item.category || 'General'}</span></td>
              <td className="text-strike text-muted">₹ {item.mrpPrice?.toLocaleString('en-IN')}</td>
              <td className="fw-600 text-dark">₹ {item.discountPrice?.toLocaleString('en-IN')}</td>
              <td>
                <span className={`type-badge ${item.transactionType === 'sell' ? 'type-sell' : 'type-other'}`}>
                  {item.transactionType || 'sell'}
                </span>
              </td>
              <td className={item.stock > 5 ? "text-success fw-600" : "text-danger fw-600"}>{item.stock}</td>
              <td><span className="status-badge active">Active</span></td>
              <td>
                <div className="action-buttons">
                  <button className="btn-action edit" onClick={() => handleOpenEditModal(item)}>✏️ Edit</button>
                  <button className="btn-action delete" onClick={() => handleDeleteProduct(item._id, item.name)}>🗑️ Delete</button>
                </div>
              </td>
            </tr>
          ))}
          {targetDataset.length === 0 && (
            <tr>
              <td colSpan="9" className="text-center text-muted empty-state">No products available in this scope.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const renderOrdersTab = () => (
    <div className="dashboard-panel">
      <div className="panel-header">
        <h3>Order Fulfillment Matrix</h3>
      </div>
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Product Node</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Qty</th>
              <th>Total Value</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {liveOrders.map((order, idx) => (
              <tr key={order._id || idx}>
                <td className="fw-600 text-primary">{order._id ? `ORD-${order._id.slice(-6).toUpperCase()}` : `ORD-2026-${1045 + idx}`}</td>
                <td>{order.items.map((item) => item.productId).join(', ')}</td>
                <td>{order.buyerName}</td>
                <td>{order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}</td>
                <td>{order.items.map((item) => item.quantity).join(', ')}</td>
                <td className="fw-600">₹ {(((order.totalAmountPaid))).toLocaleString('en-IN')}</td>
                <td>
                  <span className={`status-badge status-${order.status?.toLowerCase() || 'pending'}`}>
                    {order.status || 'Pending'}
                  </span>
                </td>
              </tr>
            ))}
            {liveOrders.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center text-muted empty-state">No transactional orders found in the server registry history.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderCustomersTab = () => {
    return (
      <div className="dashboard-panel">
        <div className="panel-header">
          <h3>Client Lifecycle Ledger</h3>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer ID</th>
                <th>Full Name</th>
                <th>Email Address</th>
                <th>Geographic Hub</th>
                <th>Product</th>
                <th>Orders Count</th>
                <th>Delivery_date</th>
                <th>Revenue Contribution</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((c) => (
                <tr key={c.id}>
                  <td className="text-muted fw-500">{c.buyerId}</td>
                  <td className="fw-600">{c.buyerName}</td>
                  <td>{c.buyerEmail}</td>
                  <td>{c.address}</td>
                  <td>
                    {c.items.map((item) => item.name).join(', ')}
                  </td>
                  <td>
                    {c.items.map((item) => item.quantity).join(', ')}
                  </td>
                  <td>
                    <span>
                      {c.DTD ? new Date(c.DTD).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      }) : 'No Date'}
                    </span>
                    <span className={`status-badge status-${c.status?.toLowerCase() || 'pending'}`}>
                      {c.status || 'Pending'}
                    </span>
                  </td>
                  <td className="fw-600 text-success">₹ {c.totalAmountPaid.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderAnalyticsTab = () => (
    <div className="dashboard-panel">
      <div className="panel-header mb-4">
        <h3>Strategic Performance Metrics</h3>
      </div>

      <div className="metrics-grid mb-4">
        <div className="metric-card pink-tint">
          <div className="card-icon-box">🎯</div>
          <div className="metric-data">
            <span className="metric-label">Average Order Value</span>
            <h3>₹ {(totalOrdersAccumulator > 0 ? totalRevenueCalculated / totalOrdersAccumulator : 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</h3>
          </div>
        </div>
        <div className="metric-card orange-tint">
          <div className="card-icon-box">⚡</div>
          <div className="metric-data">
            <span className="metric-label">Conversion Efficiency</span>
            <h3>4.82%</h3>
          </div>
        </div>
      </div>

      <div className="visual-allocation-box">
        <h4 className="box-title">Visual Allocation Status Data Matrix</h4>
        <div className="progress-list">
          {products.map(item => {
            const performanceRatio = totalRevenueCalculated > 0 ? ((((item.ordersCount || 0) * item.discountPrice) / totalRevenueCalculated) * 100) : 0;
            return (
              <div key={item._id} className="progress-item">
                <div className="progress-labels">
                  <span className="fw-500">{item.name}</span>
                  <span className="text-muted">{performanceRatio.toFixed(1)}% Share</span>
                </div>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{ width: `${performanceRatio}%` }}></div>
                </div>
              </div>
            );
          })}
          {products.length === 0 && <p className="text-sm text-muted">No product metrics data structuralized.</p>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="app-wrapper">
      {isSeller && (
        <header className="sandbox-header">
          <div className="sandbox-title">ENVIRONMENT CONTROL PANEL</div>
          <div className="sandbox-controls">
            <button className={`toggle-btn ${view === 'buyer' ? 'active' : ''}`} onClick={() => setView('buyer')}>Buyer View</button>
            <button className={`toggle-btn ${view === 'seller' ? 'active' : ''}`} onClick={() => setView('seller')}>Seller View</button>
          </div>
        </header>
      )}

      {isSeller && view === 'seller' ? (
        <div className="seller-dashboard-layout">
          <aside className="seller-sidebar">
            <div className="sidebar-brand">Zypcart</div>
            <nav className="sidebar-menu">
              <div className={`menu-item ${sellerSubView === 'dashboard' ? 'active' : ''}`} onClick={() => setSellerSubView('dashboard')}>🏠 Dashboard</div>
              <div className={`menu-item ${sellerSubView === 'products' ? 'active' : ''}`} onClick={() => setSellerSubView('products')}>👜 Products</div>
              <div className={`menu-item ${sellerSubView === 'orders' ? 'active' : ''}`} onClick={() => setSellerSubView('orders')}>📋 Orders</div>
              <div className={`menu-item ${sellerSubView === 'customers' ? 'active' : ''}`} onClick={() => setSellerSubView('customers')}>👥 Customers</div>
              <div className={`menu-item ${sellerSubView === 'analytics' ? 'active' : ''}`} onClick={() => setSellerSubView('analytics')}>📈 Analytics</div>
              <div className="menu-item logout-accent" onClick={handleLogoutClick}>📤 Logout</div>
            </nav>
          </aside>

          <main className="seller-content">
            <div className="seller-header">
              <h2 className="seller-title">Seller Management: {sellerSubView}</h2>
              {sellerSubView !== 'products' && (
                <button className="btn-primary" onClick={handleOpenCreateModal}>+ Add New Product</button>
              )}
            </div>

            {sellerSubView === 'dashboard' && renderDashboardHome()}
            {sellerSubView === 'products' && renderProductsTab()}
            {sellerSubView === 'orders' && renderOrdersTab()}
            {sellerSubView === 'customers' && renderCustomersTab()}
            {sellerSubView === 'analytics' && renderAnalyticsTab()}
          </main>
        </div>
      ) : (
        <>
          {isSeller && <div className="config-banner">BUYER VIEW CONFIGURATION INTERFACE</div>}

          <nav className="main-nav-bar">
            <div className="nav-brand">
              <img src="/Zypcart.png" alt="Zypcart Logo" />
            </div>
            <div className="nav-search">
              <input type="text" placeholder="Search product listings..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="search-input" />
            </div>
            <div className="bg-uploader-wrapper">
              <label className="btn-secondary bg-upload-btn">
                🖼️ Change Background
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBackgroundUpload}
                  style={{ display: 'none' }}
                />
              </label>
              {userBgImage && (
                <button onClick={() => setUserBgImage('')} className="btn-remove-bg">
                  Reset Background
                </button>
              )}
            </div>
            <div className="nav-item cart-item" onClick={() => navigate('/coupon')}>
              🎟️ coupons
            </div>
            <div className="nav-actions">
              <div className="nav-item" onClick={() => navigate('/orders')}>
                <span>🕒 Orders</span>
              </div>
              <div className="nav-item cart-item" onClick={() => navigate('/cart')}>
                🛒 Cart {totalCartItemsCount > 0 && <span className="cart-badge">{totalCartItemsCount}</span>}
              </div>

              <div ref={dropdownRef} className="user-profile-menu" onClick={() => setShowDropdown(!showDropdown)}>
                <div className="avatar-placeholder"></div>
                <span className="user-name">{user?.name || 'Guest User'}</span>
                <span className="dropdown-arrow">▼</span>

                {showDropdown && (
                  <div className="account-dropdown" onClick={(e) => e.stopPropagation()}>
                    <div className="dropdown-header">ACCOUNT MANAGEMENT</div>
                    <div className="dropdown-item" onClick={() => { setShowDropdown(false); navigate('/profile'); }}>👤 My Profile</div>
                    <div className="dropdown-divider"></div>
                    <div className="dropdown-item logout-btn" onClick={handleLogoutClick}>📤 Logout</div>
                  </div>
                )}
              </div>
            </div>
          </nav>
        </>
      )}

      {view === 'buyer' && (
        <div
          className="marketplace-container"
          style={{
            backgroundImage: userBgImage ? `url(${userBgImage})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
            minHeight: '100vh'
          }}
        >
          <div className="marketplace-grid page-animation" key={currentPage}>
            {currentProducts.map(item => {
              const isHovered = hoveredProductId === item._id;
              const activeImgIdx = isHovered ? currentSlideIndex : 0;
              const imageUrl = item.imageUrls?.[activeImgIdx] || 'https://placehold.co/260x180?text=Zypcart';

              return (
                <div
                  key={item._id}
                  className="product-card glass-card"
                  onMouseEnter={() => setHoveredProductId(item._id)}
                  onMouseLeave={() => setHoveredProductId(null)}
                >
                  <div className="product-image-container">
                    <img src={imageUrl} alt={item.name} className="product-image" />

                    {/* Add Image Dots here */}
                    {item.imageUrls && item.imageUrls.length > 1 && (
                      <div className="image-dots">
                        {item.imageUrls.map((_, idx) => (
                          <span
                            key={idx}
                            className={`dot ${activeImgIdx === idx ? 'active' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setHoveredProductId(item._id);
                              setCurrentSlideIndex(idx);
                            }}
                            onMouseEnter={() => {
                              setHoveredProductId(item._id);
                              setCurrentSlideIndex(idx);
                            }}
                          ></span>
                        ))}
                      </div>
                    )}
                  </div>

                  <h4 className="product-title">{item.name}</h4>

                  {/* Add Sold by here */}
                  <div className="product-seller-info">
                    Sold by: <span className="seller-name">{item.sellerName}</span>
                  </div>

                  {item.discountReason && (
                    <span className="discount-badge">
                      🎉 {item.discountReason}
                    </span>
                  )}

                  <div className="product-pricing">
                    <span className="mrp-price">₹{item.mrpPrice}</span>
                    <span className="deal-price">₹{item.discountPrice}</span>
                  </div>

                  <div className="product-actions">
                    <button type="button" className="btn-secondary flex-1" onClick={() => setSelectedProductDetails(item)}>👁️ Details</button>
                    <button type="button" className="btn-primary flex-2" onClick={() => handleAddToCart(item._id, item.stock)}>🛒 Add to Cart</button>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="pagination-container">
              <button
                className="page-btn"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                ← Prev
              </button>

              <span className="page-indicator">
                Page {currentPage} of {totalPages}
              </span>

              <button
                className="page-btn"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}


      {selectedProductDetails && (
        <div className="modal-overlay">
          <div className="modal-content specs-modal">
            <div className="modal-header specs-header">
              <h3 className="modal-title">{selectedProductDetails.name}</h3>
              <button type="button" className="modal-close specs-close" onClick={() => setSelectedProductDetails(null)}>×</button>
            </div>

            <div className="modal-body">
              <table className="specs-table">
                <tbody>
                  <tr>
                    <td className="spec-label">CATEGORY</td>
                    <td className="spec-value">{selectedProductDetails.category || 'N/A'}</td>
                  </tr>
                  {selectedProductDetails.specifications?.map((s, i) => (
                    <tr key={i}>
                      <td className="spec-label">{s.key}</td>
                      <td className="spec-value">{s.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <button type="button" className="btn-primary full-width mt-4" onClick={() => generatePDFSpecsDocument(selectedProductDetails)}>
                📄 Download Specification PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content form-modal">
            <div className="modal-header light-header">
              <h3 className="modal-title text-dark">{isEditing ? 'Modify Catalog Product' : 'Deploy New Product'}</h3>
              <button type="button" className="modal-close text-muted" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form className="modal-form" onSubmit={handleCreateProductSubmit}>
              {formError && <div className="form-error">⚠️ {formError}</div>}

              {isEditing && (
                <div className="promo-override-box">
                  <label className="promo-label">⚡ FESTIVAL PROMOTIONAL OVERRIDE</label>
                  <div className="promo-input-group">
                    <input type="number" placeholder="Reduction %" value={festivalDiscountPct} onChange={(e) => setFestivalDiscountPct(e.target.value)} className="form-input" />
                    <button type="button" className="btn-success" onClick={handleFestivalDiscountApply}>Apply</button>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Product Title Name</label>
                <input type="text" name="name" value={newProduct.name} onChange={handleFormInputChange} className="form-input" required />
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label className="form-label">MRP Price (INR)</label>
                  <input type="number" name="mrpPrice" value={newProduct.mrpPrice} onChange={handleFormInputChange} className="form-input" required />
                </div>
                <div className="form-group flex-1">
                  <label className="form-label">Deal Price (INR)</label>
                  <input type="number" name="discountPrice" value={newProduct.discountPrice} onChange={handleFormInputChange} className="form-input" required />
                </div>
              </div>

              <div className="specifications-box">
                <div className="specs-header-row">
                  <label className="specs-label">⚙️ INFINITE SPECIFICATIONS MATRIX</label>
                  <button type="button" className="text-link-btn" onClick={handleAddSpecificationField}>+ Add Field</button>
                </div>
                {newProduct.specifications?.map((spec, idx) => (
                  <div key={idx} className="spec-input-row">
                    <input type="text" placeholder="Label" value={spec.key} onChange={(e) => handleUpdateSpecificationField(idx, 'key', e.target.value)} className="form-input flex-1" />
                    <input type="text" placeholder="Value" value={spec.value} onChange={(e) => handleUpdateSpecificationField(idx, 'value', e.target.value)} className="form-input flex-1" />
                    <button type="button" className="btn-remove" onClick={() => handleRemoveSpecificationField(idx)}>×</button>
                  </div>
                ))}
              </div>

              <div className="form-group">
                <label className="form-label">Stock Units</label>
                <input type="number" name="stock" value={newProduct.stock} onChange={handleFormInputChange} className="form-input" required />
              </div>

              <div className="form-group">
                <label className="form-label">Campaign Note</label>
                <input type="text" name="discountReason" value={newProduct.discountReason} onChange={handleFormInputChange} className="form-input" />
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label className="form-label">Product Images (URLs)</label>
                  <button
                    type="button"
                    onClick={() => {
                      const currentUrls = Array.isArray(newProduct.imageUrls)
                        ? newProduct.imageUrls
                        : (typeof newProduct.imageUrls === 'string' && newProduct.imageUrls !== '' ? [newProduct.imageUrls] : []);

                      setNewProduct({
                        ...newProduct,
                        imageUrls: [...currentUrls, '']
                      });
                    }}
                    style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}
                  >
                    + Add Image URL
                  </button>
                </div>

                {(Array.isArray(newProduct.imageUrls) ? newProduct.imageUrls :
                  (typeof newProduct.imageUrls === 'string' && newProduct.imageUrls !== '' ? [newProduct.imageUrls] : [])).map((url, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                      <input
                        type="text"
                        value={url}
                        onChange={(e) => {
                          const currentUrls = Array.isArray(newProduct.imageUrls)
                            ? [...newProduct.imageUrls]
                            : [newProduct.imageUrls];

                          currentUrls[idx] = e.target.value;
                          setNewProduct({ ...newProduct, imageUrls: currentUrls });
                        }}
                        className="form-input"
                        placeholder="https://..."
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updatedUrls = (Array.isArray(newProduct.imageUrls) ? newProduct.imageUrls : [newProduct.imageUrls]).filter((_, i) => i !== idx);
                          setNewProduct({ ...newProduct, imageUrls: updatedUrls });
                        }}
                        style={{ background: '#fef2f2', color: '#ef4444', border: 'none', padding: '0 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                {(!newProduct.imageUrls || newProduct.imageUrls.length === 0) && (
                  <div style={{ fontSize: '0.85rem', color: '#64748b', padding: '8px', background: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
                    No images added yet. Click "+ Add Image URL" above.
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary flex-2">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer className="Zypcart-footer">
        <div className="footer-container">
          <div className="footer-section brand-section">
            <h2 className="footer-brand">Zypcart</h2>
            <p className="footer-description">
              Your premium marketplace for high-quality electronics, gadgets, and everyday essentials. Seamless shopping, delivered to your door.
            </p>
          </div>

          <div className="footer-section">
            <h3 className="footer-heading">Quick Links</h3>
            <ul className="footer-links">
              <li><Link to="/products">Shop Catalog</Link></li>
              <li><Link to="/orders">Order History</Link></li>
              <li><Link to="/cart">My Cart</Link></li>
              <li><Link to="/profile">My Account</Link></li>
              <li><Link to="/coupon">My Coupons</Link></li>
            </ul>
          </div>

          <div className="footer-section">
            <h3 className="footer-heading">Customer Support</h3>
            <ul className="footer-links">
              <li><a href="mailto:support@Zypcart.com">Contact Us</a></li>
              <li><Link to="/returns">Returns & Refunds</Link></li>
              <li><Link to="/shipping">Shipping Information</Link></li>
              <li><Link to="/faq">FAQs</Link></li>
            </ul>
          </div>

          <div className="footer-section">
            <h3 className="footer-heading">Connect With Us</h3>
            <div className="social-links">
              <a href="https://twitter.com" target="_blank" rel="noreferrer">𝕏 Twitter</a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer">📸 Instagram</a>
              <a href="https://facebook.com" target="_blank" rel="noreferrer">📘 Facebook</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {currentYear} Zypcart  Marketplace. All rights reserved.</p>
        </div>
      </footer>

      {/* --- Zypcart  SMART ASSIST V3.0 UI RENDERING MATRIX --- */}
      <div className={`sri-ai-container ${showSri ? 'panel-open' : ''}`}>
        {showSri && (
          <div className="sri-panel">
            <div className="sri-header">
              <div className="sri-brand">
                <div className="sri-dot-pulse"></div>
                <span>ZYPCART SMART ASSIST</span>
              </div>
              <button className="sri-close" onClick={() => setShowSri(false)}>✕</button>
            </div>

            <div className="sri-chat-log">
              {sriMessages.map((msg, i) => (
                <div key={i} className={`sri-msg ${msg.sender}`}>
                  {msg.text}
                </div>
              ))}
            </div>

            <div className="sri-quick-actions">
              <button onClick={() => executeSriAutomation('switch to buyer')}>Buyer Home</button>
              {isSeller && <button onClick={() => executeSriAutomation('switch to seller')}>Merchant Grid</button>}
              <button onClick={() => executeSriAutomation('clear filters')}>Clear Filters</button>
              <button onClick={() => executeSriAutomation('open cart')}>Cart View</button>
            </div>

            <form className="sri-input-box" onSubmit={handleSriCommand}>
              <input
                type="text"
                placeholder="Ask attribute specs or command automation..."
                value={sriInput}
                onChange={(e) => setSriInput(e.target.value)}
              />
              <button type="submit">⚡</button>
            </form>
          </div>
        )}

        <button className="sri-fab" onClick={() => setShowSri(!showSri)}>
          <div className="sri-glow-ring"></div>
          <div className="sri-core">
            <span className="sri-icon">
              <img className='sri-logo' src="/ai.png" alt="Ai" />
            </span>
          </div>
        </button>
      </div>
      {/* --- Zypcart SMART ASSIST V3.0 UI RENDERING MATRIX --- */}

    </div>
  );
}