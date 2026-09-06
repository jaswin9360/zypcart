import React, {
  useState,
  useContext,
  useEffect,
  useRef
} from "react";

import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { jsPDF } from "jspdf";
import "./products.css";

 function Products() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  // =========================================================
  // USER
  // =========================================================

  const userRole = user?.role
    ? String(user.role).toLowerCase().trim()
    : "";

  const isSeller = userRole === "seller";

  const activeUserId =
    user?.id ||
    user?._id ||
    "user_guest_99";

  const currentYear = new Date().getFullYear();

  // =========================================================
  // VIEW
  // =========================================================

  const [view, setView] = useState("buyer");
  const [sellerSubView, setSellerSubView] = useState("dashboard");

  // =========================================================
  // DATA
  // =========================================================

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [liveOrders, setLiveOrders] = useState([]);
  const [dbCartBadgeItems, setDbCartBadgeItems] = useState([]);

  // =========================================================
  // UI
  // =========================================================

  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [priceFilter, setPriceFilter] = useState("All");

  const [hoveredProductId, setHoveredProductId] =
    useState(null);

  const [currentSlideIndex, setCurrentSlideIndex] =
    useState(0);

  const [selectedProductDetails, setSelectedProductDetails] =
    useState(null);

  const [showModal, setShowModal] = useState(false);

  const [isEditing, setIsEditing] = useState(false);

  const [editingProductId, setEditingProductId] =
    useState(null);

  const [formError, setFormError] = useState("");

  const [festivalDiscountPct, setFestivalDiscountPct] =
    useState("");

  const [userBgImage, setUserBgImage] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const [pageLoading, setPageLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  const dropdownRef = useRef(null);

  // =========================================================
  // NEW PRODUCT
  // =========================================================

  const emptyProduct = {
    name: "",
    category: "Electronics",
    mrpPrice: "",
    discountPrice: "",
    transactionType: "sell",
    imageUrls: [],
    stock: "",
    discountReason: "",
    specifications: [
      {
        key: "",
        value: ""
      }
    ]
  };

  const [newProduct, setNewProduct] =
    useState(emptyProduct);

  // =========================================================
  // CLOSE DROPDOWN
  // =========================================================

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  // =========================================================
  // INITIAL PAGE LOAD
  // =========================================================

  useEffect(() => {
    let cancelled = false;

    const loadInitialData = async () => {
      setPageLoading(true);
      setError(null);

      try {
        let productsEndpoint =
          "https://zypcart-product-backend.onrender.com/api/products/marketplace";

        if (isSeller && view === "seller") {
          productsEndpoint =
            `https://zypcart-product-backend.onrender.com/api/products/user-dashboard/${activeUserId}`;
        }

        const requests = [
          fetch(productsEndpoint),
          fetch(`https://zypcart-product-backend.onrender.com/api/cart/${activeUserId}`)
        ];

        if (isSeller) {
          requests.push(
            fetch(`https://zypcart-product-backend.onrender.com/api/products/orders/seller/${activeUserId}`)
          );
        }

        const responses = await Promise.all(requests);

        if (!responses[0].ok) {
          throw new Error("Unable to load products.");
        }

        const productData = await responses[0].json();
        const cartData = responses[1].ok
          ? await responses[1].json()
          : [];

        let orderData = [];
        if (isSeller && responses[2]) {
          orderData = responses[2].ok
            ? await responses[2].json()
            : [];
        }

        if (cancelled) return;

        setProducts(Array.isArray(productData) ? productData : []);
        setDbCartBadgeItems(Array.isArray(cartData) ? cartData : []);
        setOrders(Array.isArray(orderData) ? orderData : []);
        setLiveOrders(Array.isArray(orderData) ? orderData : []);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to load Zypcart.");
        }
      } finally {
        if (!cancelled) setPageLoading(false);
      }
    };

    loadInitialData();

    return () => {
      cancelled = true;
    };
  }, [activeUserId, isSeller, view]);

  // =========================================================
  // FETCH ORDERS
  // =========================================================

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setActionLoading(true);

        const response = await fetch(
          `https://zypcart-product-backend.onrender.com/api/products/orders/seller/${activeUserId}`
        );

        if (!response.ok) {
          throw new Error("Failed to load orders");
        }

        const data = await response.json();

        setOrders(Array.isArray(data) ? data : []);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setActionLoading(false);
      }
    };

    fetchOrders();
  }, [activeUserId]);

  // =========================================================
  // PRODUCT IMAGE SLIDESHOW
  // =========================================================

  useEffect(() => {
    if (!hoveredProductId) return;

    const product = products.find(
      (item) => item._id === hoveredProductId
    );

    const totalImages =
      product?.imageUrls?.length || 0;

    if (totalImages <= 1) return;

    const timer = setInterval(() => {
      setCurrentSlideIndex(
        (prev) => (prev + 1) % totalImages
      );
    }, 2000);

    return () => clearInterval(timer);
  }, [hoveredProductId, products]);

  // =========================================================
  // FETCH PRODUCTS
  // =========================================================

  const syncInventoryCatalog = async () => {
    let endpoint =
      "https://zypcart-product-backend.onrender.com/api/products/marketplace";

    if (isSeller && view === "seller") {
      endpoint =
        `https://zypcart-product-backend.onrender.com/api/products/user-dashboard/${activeUserId}`;
    }

    try {
      const response = await fetch(endpoint);

      if (!response.ok) return;

      const data = await response.json();

      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load products:", err);
    }
  };

  // =========================================================
  // FETCH CART
  // =========================================================

  const fetchDBCartQuantitiesOnly = async () => {
    try {
      const response = await fetch(
        `https://zypcart-product-backend.onrender.com/api/cart/${activeUserId}`
      );

      if (!response.ok) return;

      const data = await response.json();

      setDbCartBadgeItems(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      console.error("Failed to load cart:", err);
    }
  };

  // =========================================================
  // FETCH SELLER ORDERS
  // =========================================================

  const syncLiveSellerOrders = async () => {
    if (!isSeller) return;

    try {
      const response = await fetch(
        `https://zypcart-product-backend.onrender.com/api/products/orders/seller/${activeUserId}`
      );

      if (!response.ok) return;

      const data = await response.json();

      setLiveOrders(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      console.error(
        "Failed to load seller orders:",
        err
      );
    }
  };

  // =========================================================
  // SYNC DATA
  // =========================================================

  useEffect(() => {
    syncInventoryCatalog();
    fetchDBCartQuantitiesOnly();

    if (isSeller && view === "seller") {
      syncLiveSellerOrders();
    }
  }, [
    view,
    user,
    sellerSubView
  ]);

  // =========================================================
  // CALCULATIONS
  // =========================================================

  const totalProductsCount =
    products.length;

  const totalOrdersAccumulator =
    orders.reduce(
      (sum, item) =>
        sum +
        (item.items?.reduce(
          (itemSum, product) =>
            itemSum + (product.quantity || 0),
          0
        ) || 0),
      0
    );

  const totalRevenueCalculated =
    orders.reduce(
      (sum, item) =>
        sum + Number(item.totalAmountPaid || 0),
      0
    );

  const totalCartItemsCount =
    dbCartBadgeItems.reduce(
      (sum, item) =>
        sum + Number(item.quantity || 0),
      0
    );

  // =========================================================
  // SEARCH + FILTER
  // =========================================================

  const categories = [
    "All",
    ...new Set(
      products
        .map((product) => product.category)
        .filter(Boolean)
    )
  ];

  const filteredProducts = products.filter((product) => {
    const query = searchQuery.toLowerCase().trim();

    const matchesSearch =
      !query ||
      product.name?.toLowerCase().includes(query) ||
      product.category?.toLowerCase().includes(query) ||
      String(product.sellerName || product.userId || "")
        .toLowerCase()
        .includes(query);

    const matchesCategory =
      selectedCategory === "All" ||
      product.category === selectedCategory;

    const price = Number(
      product.discountPrice || product.mrpPrice || 0
    );

    let matchesPrice = true;

    if (priceFilter === "under500") matchesPrice = price < 500;
    if (priceFilter === "500to1000") matchesPrice = price >= 500 && price <= 1000;
    if (priceFilter === "1000to5000") matchesPrice = price > 1000 && price <= 5000;
    if (priceFilter === "above5000") matchesPrice = price > 5000;

    return matchesSearch && matchesCategory && matchesPrice;
  });

  // =========================================================
  // PAGINATION
  // =========================================================

  const productsPerPage = 10;

  const totalPages = Math.ceil(
    filteredProducts.length /
      productsPerPage
  );

  const indexOfLastProduct =
    currentPage * productsPerPage;

  const indexOfFirstProduct =
    indexOfLastProduct -
    productsPerPage;

  const currentProducts =
    filteredProducts.slice(
      indexOfFirstProduct,
      indexOfLastProduct
    );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, priceFilter]);

  // =========================================================
  // LOGOUT
  // =========================================================

  const handleLogoutClick = async () => {
    try {
      if (typeof logout === "function") {
        await logout();
      }
    } catch (err) {
      console.error(err);
    } finally {
      navigate("/");
    }
  };

  // =========================================================
  // ADD TO CART
  // =========================================================

  const handleAddToCart = async (
    productId,
    itemStock
  ) => {
    const existingMatch =
      dbCartBadgeItems.find(
        (item) =>
          String(
            item.productId?._id ||
            item.productId
          ) === String(productId)
      );

    const currentQty =
      existingMatch?.quantity || 0;

    const targetQty =
      currentQty + 1;

    const maxAllowedStock =
      Math.min(itemStock || 99, 5);

    if (targetQty > maxAllowedStock) {
      alert(
        `Maximum ${maxAllowedStock} items allowed.`
      );
      return;
    }

    try {
      const response = await fetch(
        "https://zypcart-product-backend.onrender.com/api/cart",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            userId: activeUserId,
            productId,
            quantity: targetQty
          })
        }
      );

      if (response.ok) {
        fetchDBCartQuantitiesOnly();
      }
    } catch (err) {
      console.error(
        "Failed to add product to cart:",
        err
      );
    }
  };

  // =========================================================
  // FORM
  // =========================================================

  const handleFormInputChange = (e) => {
    setNewProduct({
      ...newProduct,
      [e.target.name]: e.target.value
    });
  };

  // =========================================================
  // SPECIFICATIONS
  // =========================================================

  const handleAddSpecificationField = () => {
    setNewProduct({
      ...newProduct,
      specifications: [
        ...newProduct.specifications,
        {
          key: "",
          value: ""
        }
      ]
    });
  };

  const handleUpdateSpecificationField = (
    index,
    field,
    value
  ) => {
    const updated =
      [...newProduct.specifications];

    updated[index] = {
      ...updated[index],
      [field]: value
    };

    setNewProduct({
      ...newProduct,
      specifications: updated
    });
  };

  const handleRemoveSpecificationField = (
    index
  ) => {
    const updated =
      newProduct.specifications.filter(
        (_, i) => i !== index
      );

    setNewProduct({
      ...newProduct,
      specifications:
        updated.length > 0
          ? updated
          : [{ key: "", value: "" }]
    });
  };

  // =========================================================
  // DISCOUNT
  // =========================================================

  const handleFestivalDiscountApply = () => {
    const pct =
      parseFloat(festivalDiscountPct);

    if (
      isNaN(pct) ||
      pct < 0 ||
      pct > 100
    ) {
      alert(
        "Enter a percentage between 0 and 100."
      );
      return;
    }

    const currentPrice =
      Number(newProduct.mrpPrice);

    if (!currentPrice) {
      alert("Enter the MRP first.");
      return;
    }

    const calculatedPrice =
      Math.max(
        0,
        Math.round(
          currentPrice *
            (1 - pct / 100)
        )
      );

    setNewProduct((prev) => ({
      ...prev,
      discountPrice:
        calculatedPrice,
      discountReason:
        `${pct}% OFF`
    }));

    setFestivalDiscountPct("");
  };

  // =========================================================
  // OPEN CREATE MODAL
  // =========================================================

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setEditingProductId(null);
    setFormError("");
    setFestivalDiscountPct("");

    setNewProduct({
      ...emptyProduct,
      imageUrls: []
    });

    setShowModal(true);
  };

  // =========================================================
  // OPEN EDIT MODAL
  // =========================================================

  const handleOpenEditModal = (
    product
  ) => {
    setIsEditing(true);
    setEditingProductId(product._id);
    setFormError("");
    setFestivalDiscountPct("");

    setNewProduct({
      name: product.name || "",
      category:
        product.category ||
        "Electronics",

      mrpPrice:
        product.mrpPrice || "",

      discountPrice:
        product.discountPrice || "",

      transactionType:
        product.transactionType ||
        "sell",

      imageUrls:
        Array.isArray(product.imageUrls)
          ? product.imageUrls
          : product.imageUrls
            ? [product.imageUrls]
            : [],

      stock:
        product.stock || "",

      discountReason:
        product.discountReason || "",

      specifications:
        product.specifications?.length
          ? product.specifications
          : [
              {
                key: "",
                value: ""
              }
            ]
    });

    setShowModal(true);
  };

  // =========================================================
  // ADD IMAGE
  // =========================================================

  const handleAddImage = () => {
    const currentUrls =
      Array.isArray(newProduct.imageUrls)
        ? newProduct.imageUrls
        : [];

    setNewProduct({
      ...newProduct,
      imageUrls: [
        ...currentUrls,
        ""
      ]
    });
  };

  const handleUpdateImage = (
    index,
    value
  ) => {
    const updated =
      [...newProduct.imageUrls];

    updated[index] = value;

    setNewProduct({
      ...newProduct,
      imageUrls: updated
    });
  };

  const handleRemoveImage = (
    index
  ) => {
    const updated =
      newProduct.imageUrls.filter(
        (_, i) => i !== index
      );

    setNewProduct({
      ...newProduct,
      imageUrls: updated
    });
  };

  // =========================================================
  // CREATE / UPDATE PRODUCT
  // =========================================================

  const handleCreateProductSubmit =
    async (e) => {
      e.preventDefault();

      setFormError("");

      const imageUrls =
        Array.isArray(
          newProduct.imageUrls
        )
          ? newProduct.imageUrls
              .map((url) =>
                typeof url === "string"
                  ? url.trim()
                  : ""
              )
              .filter(Boolean)
          : [];

      const specifications =
        newProduct.specifications
          .filter(
            (spec) =>
              spec.key?.trim() &&
              spec.value?.trim()
          );

      const bodyPayload = {
        userId: activeUserId,
        sellerName: user?.name,
        name: newProduct.name,
        category:
          newProduct.category,

        mrpPrice:
          Number(newProduct.mrpPrice),

        discountPrice:
          Number(
            newProduct.discountPrice
          ),

        transactionType:
          newProduct.transactionType,

        imageUrls,

        stock:
          Number(newProduct.stock),

        discountReason:
          newProduct.discountReason,

        specifications
      };

      const endpoint = isEditing
        ? `https://zypcart-product-backend.onrender.com/api/products/${editingProductId}`
        : "https://zypcart-product-backend.onrender.com/api/products";

      try {
        const response =
          await fetch(endpoint, {
            method: isEditing
              ? "PUT"
              : "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify(
              bodyPayload
            )
          });

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Something went wrong."
          );
        }

        setShowModal(false);

        await syncInventoryCatalog();
      } catch (err) {
        setFormError(err.message);
      }
    };

  // =========================================================
  // DELETE
  // =========================================================

  const handleDeleteProduct = async (
    productId,
    productName
  ) => {
    const confirmed =
      window.confirm(
        `Delete "${productName}"?`
      );

    if (!confirmed) return;

    try {
      const response =
        await fetch(
          `https://zypcart-product-backend.onrender.com/api/products/${productId}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type":
                "application/json"
            }
          }
        );

      if (!response.ok) {
        const data =
          await response.json();

        throw new Error(
          data.message ||
            "Failed to delete product."
        );
      }

      syncInventoryCatalog();
    } catch (err) {
      alert(
        `Error: ${err.message}`
      );
    }
  };

  // =========================================================
  // PDF
  // =========================================================

  const generatePDFSpecsDocument =
    (product) => {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      doc.setFillColor(
        37,
        99,
        235
      );

      doc.rect(
        0,
        0,
        210,
        28,
        "F"
      );

      doc.setTextColor(
        255,
        255,
        255
      );

      doc.setFont(
        "helvetica",
        "bold"
      );

      doc.setFontSize(20);

      doc.text(
        product.name ||
          "Product Details",
        15,
        18
      );

      let y = 42;

      const addRow = (
        label,
        value
      ) => {
        if (y > 270) {
          doc.addPage();
          y = 25;
        }

        doc.setFont(
          "helvetica",
          "bold"
        );

        doc.setTextColor(
          37,
          99,
          235
        );

        doc.text(
          String(label).toUpperCase(),
          15,
          y
        );

        doc.setFont(
          "helvetica",
          "normal"
        );

        doc.setTextColor(
          50,
          50,
          50
        );

        const text =
          String(value || "N/A");

        doc.text(
          text,
          65,
          y
        );

        doc.setDrawColor(
          220,
          220,
          220
        );

        doc.line(
          15,
          y + 4,
          195,
          y + 4
        );

        y += 14;
      };

      addRow(
        "Category",
        product.category
      );

      product.specifications?.forEach(
        (spec) => {
          addRow(
            spec.key,
            spec.value
          );
        }
      );

      addRow(
        "Price",
        `₹ ${Number(
          product.discountPrice || 0
        ).toLocaleString("en-IN")}`
      );

      if (
        product.discountReason
      ) {
        addRow(
          "Offer",
          product.discountReason
        );
      }

      doc.save(
        `${product.name?.replace(
          /\s+/g,
          "_"
        ) || "product"}_details.pdf`
      );
    };

  // =========================================================
  // BACKGROUND
  // =========================================================

  const handleBackgroundUpload =
    (e) => {
      const file =
        e.target.files?.[0];

      if (!file) return;

      const imageUrl =
        URL.createObjectURL(
          file
        );

      setUserBgImage(imageUrl);
    };

  // =========================================================
  // SELLER DASHBOARD
  // =========================================================

  const renderDashboardHome =
    () => (
      <>
        <div className="metrics-grid">
          <div className="metric-card">
            <span className="metric-label">
              Products
            </span>

            <strong>
              {totalProductsCount}
            </strong>
          </div>

          <div className="metric-card">
            <span className="metric-label">
              Orders
            </span>

            <strong>
              {totalOrdersAccumulator}
            </strong>
          </div>

          <div className="metric-card">
            <span className="metric-label">
              Revenue
            </span>

            <strong>
              ₹{" "}
              {totalRevenueCalculated.toLocaleString(
                "en-IN"
              )}
            </strong>
          </div>
        </div>

        <div className="dashboard-panel">
          <div className="panel-header">
            <h3>
              Recent Products
            </h3>

            <button
              className="text-button"
              onClick={() =>
                setSellerSubView(
                  "products"
                )
              }
            >
              View all
            </button>
          </div>

          {renderProductsTable(
            products.slice(0, 5)
          )}
        </div>
      </>
    );

  // =========================================================
  // PRODUCTS TAB
  // =========================================================

  const renderProductsTab =
    () => (
      <div className="dashboard-panel">
        <div className="panel-header">
          <div>
            <h3>
              Products
            </h3>

            <span className="panel-count">
              {totalProductsCount} items
            </span>
          </div>

          <button
            className="btn-primary"
            onClick={
              handleOpenCreateModal
            }
          >
            Add Product
          </button>
        </div>

        {renderProductsTable(
          products
        )}
      </div>
    );

  // =========================================================
  // PRODUCTS TABLE
  // =========================================================

  const renderProductsTable =
    (targetDataset) => (
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {targetDataset.map(
              (item) => (
                <tr
                  key={
                    item._id
                  }
                >
                  <td>
                    <div className="table-product">
                      <img
                        src={
                          item.imageUrls?.[0] ||
                          "https://placehold.co/60x60?text=No+Image"
                        }
                        alt={
                          item.name
                        }
                      />

                      <div>
                        <strong>
                          {item.name}
                        </strong>

                        <span>
                          {item.sellerName ||
                            "Seller"}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td>
                    {item.category ||
                      "General"}
                  </td>

                  <td>
                    <div className="table-price">
                      <strong>
                        ₹{" "}
                        {Number(
                          item.discountPrice ||
                            0
                        ).toLocaleString(
                          "en-IN"
                        )}
                      </strong>

                      <del>
                        ₹{" "}
                        {Number(
                          item.mrpPrice ||
                            0
                        ).toLocaleString(
                          "en-IN"
                        )}
                      </del>
                    </div>
                  </td>

                  <td>
                    <span
                      className={
                        item.stock >
                        5
                          ? "stock-good"
                          : "stock-low"
                      }
                    >
                      {item.stock}
                    </span>
                  </td>

                  <td>
                    <span className="status-badge">
                      Active
                    </span>
                  </td>

                  <td>
                    <div className="action-buttons">
                      <button
                        className="action-edit"
                        onClick={() =>
                          handleOpenEditModal(
                            item
                          )
                        }
                      >
                        Edit
                      </button>

                      <button
                        className="action-delete"
                        onClick={() =>
                          handleDeleteProduct(
                            item._id,
                            item.name
                          )
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )
            )}

            {targetDataset.length ===
              0 && (
              <tr>
                <td
                  colSpan="6"
                  className="empty-state"
                >
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );

  // =========================================================
  // ORDERS
  // =========================================================

  const renderOrdersTab =
    () => (
      <div className="dashboard-panel">
        <div className="panel-header">
          <h3>Orders</h3>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Products</th>
                <th>Date</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {liveOrders.map(
                (order, index) => (
                  <tr
                    key={
                      order._id ||
                      index
                    }
                  >
                    <td>
                      <strong>
                        {order._id
                          ? `#${order._id
                              .slice(
                                -6
                              )
                              .toUpperCase()}`
                          : `#${1045 + index}`}
                      </strong>
                    </td>

                    <td>
                      {order.buyerName ||
                        "Customer"}
                    </td>

                    <td>
                      {order.items
                        ?.map(
                          (item) =>
                            item.name ||
                            item.productId
                        )
                        .join(", ")}
                    </td>

                    <td>
                      {order.createdAt
                        ? new Date(
                            order.createdAt
                          ).toLocaleDateString(
                            "en-IN"
                          )
                        : "-"}
                    </td>

                    <td>
                      <strong>
                        ₹{" "}
                        {Number(
                          order.totalAmountPaid ||
                            0
                        ).toLocaleString(
                          "en-IN"
                        )}
                      </strong>
                    </td>

                    <td>
                      <span
                        className={`status-badge ${
                          order.status
                            ? order.status
                                .toLowerCase()
                            : ""
                        }`}
                      >
                        {order.status ||
                          "Pending"}
                      </span>
                    </td>
                  </tr>
                )
              )}

              {liveOrders.length ===
                0 && (
                <tr>
                  <td
                    colSpan="6"
                    className="empty-state"
                  >
                    No orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );

  // =========================================================
  // CUSTOMERS
  // =========================================================

  const renderCustomersTab =
    () => (
      <div className="dashboard-panel">
        <div className="panel-header">
          <h3>Customers</h3>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Email</th>
                <th>Address</th>
                <th>Products</th>
                <th>Orders</th>
                <th>Revenue</th>
              </tr>
            </thead>

            <tbody>
              {orders.map(
                (customer, index) => (
                  <tr
                    key={
                      customer._id ||
                      customer.id ||
                      index
                    }
                  >
                    <td>
                      <strong>
                        {customer.buyerName ||
                          "Customer"}
                      </strong>
                    </td>

                    <td>
                      {customer.buyerEmail ||
                        "-"}
                    </td>

                    <td>
                      {customer.address ||
                        "-"}
                    </td>

                    <td>
                      {customer.items
                        ?.map(
                          (item) =>
                            item.name
                        )
                        .join(", ")}
                    </td>

                    <td>
                      {customer.items?.reduce(
                        (sum, item) =>
                          sum +
                          Number(
                            item.quantity ||
                              0
                          ),
                        0
                      )}
                    </td>

                    <td>
                      <strong>
                        ₹{" "}
                        {Number(
                          customer.totalAmountPaid ||
                            0
                        ).toLocaleString(
                          "en-IN"
                        )}
                      </strong>
                    </td>
                  </tr>
                )
              )}

              {orders.length ===
                0 && (
                <tr>
                  <td
                    colSpan="6"
                    className="empty-state"
                  >
                    No customers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );

  // =========================================================
  // ANALYTICS
  // =========================================================

  const renderAnalyticsTab =
    () => {
      const averageOrderValue =
        totalOrdersAccumulator >
        0
          ? totalRevenueCalculated /
            totalOrdersAccumulator
          : 0;

      return (
        <div className="dashboard-panel">
          <div className="panel-header">
            <h3>Analytics</h3>
          </div>

          <div className="metrics-grid">
            <div className="metric-card">
              <span className="metric-label">
                Average Order
              </span>

              <strong>
                ₹{" "}
                {averageOrderValue.toLocaleString(
                  "en-IN",
                  {
                    maximumFractionDigits: 2
                  }
                )}
              </strong>
            </div>

            <div className="metric-card">
              <span className="metric-label">
                Products
              </span>

              <strong>
                {totalProductsCount}
              </strong>
            </div>

            <div className="metric-card">
              <span className="metric-label">
                Revenue
              </span>

              <strong>
                ₹{" "}
                {totalRevenueCalculated.toLocaleString(
                  "en-IN"
                )}
              </strong>
            </div>
          </div>

          <div className="analytics-section">
            <h4>
              Product Performance
            </h4>

            {products.map(
              (item) => {
                const ratio =
                  totalRevenueCalculated >
                  0
                    ? (
                        ((item.ordersCount ||
                          0) *
                          Number(
                            item.discountPrice ||
                              0
                          )) /
                        totalRevenueCalculated
                      ) * 100
                    : 0;

                return (
                  <div
                    className="progress-item"
                    key={
                      item._id
                    }
                  >
                    <div className="progress-top">
                      <span>
                        {item.name}
                      </span>

                      <span>
                        {ratio.toFixed(
                          1
                        )}
                        %
                      </span>
                    </div>

                    <div className="progress-background">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.min(
                            ratio,
                            100
                          )}%`
                        }}
                      />
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      );
    };

  // =========================================================
  // BUYER NAV
  // =========================================================

  const renderBuyerNavbar =
    () => (
      <nav className="main-navbar">
        <Link
          to="/products"
          className="brand"
        >
          <img
            src="/Zypcart.png"
            alt="Zypcart"
          />
        </Link>

        <div className="search-filter-wrapper">
          <div className="search-box">
            <span className="search-icon">⌕</span>
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="clear-search"
                type="button"
                onClick={() => setSearchQuery("")}
              >
                ×
              </button>
            )}
          </div>

          <div className="filter-container">
            <button
              type="button"
              className={`filter-button ${filterOpen ? "active" : ""}`}
              onClick={() => setFilterOpen((open) => !open)}
            >
              Filter
              {(selectedCategory !== "All" || priceFilter !== "All") && (
                <span className="filter-count">1</span>
              )}
              <span className="filter-arrow">▾</span>
            </button>

            {filterOpen && (
              <div className="filter-panel">
                <div className="filter-header">
                  <strong>Filter products</strong>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory("All");
                      setPriceFilter("All");
                    }}
                  >
                    Clear
                  </button>
                </div>

                <div className="filter-section">
                  <label>Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-section">
                  <label>Price</label>
                  <select
                    value={priceFilter}
                    onChange={(e) => setPriceFilter(e.target.value)}
                  >
                    <option value="All">All prices</option>
                    <option value="under500">Under ₹500</option>
                    <option value="500to1000">₹500 – ₹1,000</option>
                    <option value="1000to5000">₹1,000 – ₹5,000</option>
                    <option value="above5000">Above ₹5,000</option>
                  </select>
                </div>

                <button
                  type="button"
                  className="apply-filter-button"
                  onClick={() => setFilterOpen(false)}
                >
                  Apply filters
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="nav-actions">
          <button
            className="nav-link"
            onClick={() =>
              navigate("/orders")
            }
          >
            Orders
          </button>

          <button
            className="nav-link"
            onClick={() =>
              navigate("/coupon")
            }
          >
            Coupons
          </button>

          <button
            className="cart-button"
            onClick={() =>
              navigate("/cart")
            }
          >
            Cart

            {totalCartItemsCount >
              0 && (
              <span className="cart-count">
                {totalCartItemsCount}
              </span>
            )}
          </button>

          <div
            ref={dropdownRef}
            className="profile-wrapper"
          >
            <button
              className="profile-button"
              onClick={() =>
                setShowDropdown(
                  !showDropdown
                )
              }
            >
              <span className="avatar">
                {(user?.name ||
                  "G")
                  .charAt(0)
                  .toUpperCase()}
              </span>

              <span className="profile-name">
                {user?.name ||
                  "Guest"}
              </span>

              <span className="arrow">
                ▾
              </span>
            </button>

            {showDropdown && (
              <div className="profile-dropdown">
                <button
                  onClick={() => {
                    setShowDropdown(
                      false
                    );
                    navigate(
                      "/profile"
                    );
                  }}
                >
                  Profile
                </button>

                <button
                  onClick={() => {
                    setShowDropdown(
                      false
                    );
                    handleLogoutClick();
                  }}
                  className="logout-item"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
    );

  // =========================================================
  // BUYER MARKETPLACE
  // =========================================================

  const renderMarketplace =
    () => (
      <div
        className="marketplace"
        style={{
          backgroundImage:
            userBgImage
              ? `url(${userBgImage})`
              : "none"
        }}
      >
        <div className="marketplace-toolbar">
          <div>
            <h2>
              Products
            </h2>

            <span>
              {filteredProducts.length}{" "}
              products
            </span>
          </div>

          <label className="background-button">
            Change background
            <input
              type="file"
              accept="image/*"
              onChange={
                handleBackgroundUpload
              }
            />
          </label>

          {userBgImage && (
            <button
              className="reset-background"
              onClick={() =>
                setUserBgImage("")
              }
            >
              Reset
            </button>
          )}
        </div>

        {currentProducts.length ===
        0 ? (
          <div className="no-products">
            <h3>
              No products found
            </h3>

            <p>
              Try a different search.
            </p>
          </div>
        ) : (
          <div className="product-grid">
            {currentProducts.map(
              (item) => {
                const isHovered =
                  hoveredProductId ===
                  item._id;

                const activeImage =
                  isHovered
                    ? currentSlideIndex
                    : 0;

                const imageUrl =
                  item.imageUrls?.[
                    activeImage
                  ] ||
                  "https://placehold.co/600x450?text=Zypcart";

                return (
                  <div
                    className="product-card"
                    key={
                      item._id
                    }
                    onMouseEnter={() => {
                      setHoveredProductId(
                        item._id
                      );
                      setCurrentSlideIndex(
                        0
                      );
                    }}
                    onMouseLeave={() =>
                      setHoveredProductId(
                        null
                      )
                    }
                  >
                    <div className="product-image-wrapper">
                      <img
                        src={
                          imageUrl
                        }
                        alt={
                          item.name
                        }
                        className="product-image"
                      />

                      {item.imageUrls
                        ?.length >
                        1 && (
                        <div className="image-dots">
                          {item.imageUrls.map(
                            (
                              _,
                              index
                            ) => (
                              <button
                                key={
                                  index
                                }
                                className={
                                  activeImage ===
                                  index
                                    ? "dot active"
                                    : "dot"
                                }
                                onClick={(
                                  e
                                ) => {
                                  e.stopPropagation();

                                  setHoveredProductId(
                                    item._id
                                  );

                                  setCurrentSlideIndex(
                                    index
                                  );
                                }}
                              />
                            )
                          )}
                        </div>
                      )}

                      {item.discountReason && (
                        <span className="offer-badge">
                          {
                            item.discountReason
                          }
                        </span>
                      )}
                    </div>

                    <div className="product-info">
                      <span className="product-category">
                        {item.category ||
                          "General"}
                      </span>

                      <h3 className="product-title">
                        {item.name}
                      </h3>

                      <div className="product-prices">
                        <strong>
                          ₹
                          {Number(
                            item.discountPrice ||
                              0
                          ).toLocaleString(
                            "en-IN"
                          )}
                        </strong>

                        <del>
                          ₹
                          {Number(
                            item.mrpPrice ||
                              0
                          ).toLocaleString(
                            "en-IN"
                          )}
                        </del>
                      </div>

                      <span className="seller-text">
                        Sold by{" "}
                        {item.sellerName ||
                          "Seller"}
                      </span>

                      <div className="product-buttons">
                        <button
                          className="details-button"
                          onClick={() =>
                            setSelectedProductDetails(
                              item
                            )
                          }
                        >
                          Details
                        </button>

                        <button
                          className="add-cart-button"
                          onClick={() => handleAddToCart(item._id, item.stock)}
                          disabled={actionLoading}
                        >
                          {actionLoading ? "Adding..." : "Add to Cart"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}

        {totalPages > 1 && (
          <div className="pagination">
            <button
              disabled={
                currentPage ===
                1
              }
              onClick={() =>
                setCurrentPage(
                  (page) =>
                    Math.max(
                      page - 1,
                      1
                    )
                )
              }
            >
              Previous
            </button>

            <span>
              {currentPage} /{" "}
              {totalPages}
            </span>

            <button
              disabled={
                currentPage ===
                totalPages
              }
              onClick={() =>
                setCurrentPage(
                  (page) =>
                    Math.min(
                      page + 1,
                      totalPages
                    )
                )
              }
            >
              Next
            </button>
          </div>
        )}
      </div>
    );

  // =========================================================
  // PRODUCT DETAILS MODAL
  // =========================================================

  const renderProductDetails =
    () => {
      if (
        !selectedProductDetails
      ) {
        return null;
      }

      const product =
        selectedProductDetails;

      return (
        <div
          className="modal-overlay"
          onClick={() =>
            setSelectedProductDetails(
              null
            )
          }
        >
          <div
            className="details-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <button
              className="modal-close"
              onClick={() =>
                setSelectedProductDetails(
                  null
                )
              }
            >
              ×
            </button>

            <div className="details-image">
              <img
                src={
                  product.imageUrls?.[0] ||
                  "https://placehold.co/500x400?text=Zypcart"
                }
                alt={
                  product.name
                }
              />
            </div>

            <div className="details-content">
              <span className="product-category">
                {product.category ||
                  "General"}
              </span>

              <h2>
                {product.name}
              </h2>

              <div className="details-price">
                <strong>
                  ₹
                  {Number(
                    product.discountPrice ||
                      0
                  ).toLocaleString(
                    "en-IN"
                  )}
                </strong>

                <del>
                  ₹
                  {Number(
                    product.mrpPrice ||
                      0
                  ).toLocaleString(
                    "en-IN"
                  )}
                </del>
              </div>

              <div className="specifications">
                <h4>
                  Specifications
                </h4>

                <div className="spec-list">
                  {product.specifications
                    ?.filter(
                      (spec) =>
                        spec.key &&
                        spec.value
                    )
                    .map(
                      (
                        spec,
                        index
                      ) => (
                        <div
                          className="spec-row"
                          key={
                            index
                          }
                        >
                          <span>
                            {
                              spec.key
                            }
                          </span>

                          <strong>
                            {
                              spec.value
                            }
                          </strong>
                        </div>
                      )
                    )}

                  {(!product.specifications ||
                    product.specifications
                      .filter(
                        (spec) =>
                          spec.key &&
                          spec.value
                      )
                      .length ===
                      0) && (
                    <div className="no-specs">
                      No specifications
                      available.
                    </div>
                  )}
                </div>
              </div>

              <button
                className="download-button"
                onClick={() =>
                  generatePDFSpecsDocument(
                    product
                  )
                }
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      );
    };

  // =========================================================
  // PRODUCT FORM MODAL
  // =========================================================

  const renderProductForm =
    () => {
      if (!showModal) {
        return null;
      }

      return (
        <div
          className="modal-overlay"
          onClick={() =>
            setShowModal(false)
          }
        >
          <div
            className="form-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="form-modal-header">
              <div>
                <h2>
                  {isEditing
                    ? "Edit Product"
                    : "Add Product"}
                </h2>

                <p>
                  Add product information
                </p>
              </div>

              <button
                className="modal-close"
                onClick={() =>
                  setShowModal(false)
                }
              >
                ×
              </button>
            </div>

            <form
              onSubmit={
                handleCreateProductSubmit
              }
              className="product-form"
            >
              {formError && (
                <div className="form-error">
                  {formError}
                </div>
              )}

              {isEditing && (
                <div className="discount-box">
                  <label>
                    Quick discount
                  </label>

                  <div>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="%"
                      value={
                        festivalDiscountPct
                      }
                      onChange={(e) =>
                        setFestivalDiscountPct(
                          e.target.value
                        )
                      }
                    />

                    <button
                      type="button"
                      onClick={
                        handleFestivalDiscountApply
                      }
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>
                  Product name
                </label>

                <input
                  type="text"
                  name="name"
                  value={
                    newProduct.name
                  }
                  onChange={
                    handleFormInputChange
                  }
                  placeholder="Enter product name"
                  required
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>
                    Category
                  </label>

                  <select
                    name="category"
                    value={
                      newProduct.category
                    }
                    onChange={
                      handleFormInputChange
                    }
                  >
                    <option>
                      Electronics
                    </option>
                    <option>
                      Fashion
                    </option>
                    <option>
                      Home
                    </option>
                    <option>
                      Beauty
                    </option>
                    <option>
                      Sports
                    </option>
                    <option>
                      Grocery
                    </option>
                    <option>
                      Other
                    </option>
                  </select>
                </div>

                <div className="form-group">
                  <label>
                    Stock
                  </label>

                  <input
                    type="number"
                    name="stock"
                    min="0"
                    value={
                      newProduct.stock
                    }
                    onChange={
                      handleFormInputChange
                    }
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>
                    MRP
                  </label>

                  <input
                    type="number"
                    name="mrpPrice"
                    min="0"
                    value={
                      newProduct.mrpPrice
                    }
                    onChange={
                      handleFormInputChange
                    }
                    placeholder="₹ 0"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    Sale price
                  </label>

                  <input
                    type="number"
                    name="discountPrice"
                    min="0"
                    value={
                      newProduct.discountPrice
                    }
                    onChange={
                      handleFormInputChange
                    }
                    placeholder="₹ 0"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <div className="section-title-row">
                  <label>
                    Images
                  </label>

                  <button
                    type="button"
                    className="add-small-button"
                    onClick={
                      handleAddImage
                    }
                  >
                    + Add image
                  </button>
                </div>

                {newProduct.imageUrls.map(
                  (
                    url,
                    index
                  ) => (
                    <div
                      className="image-input-row"
                      key={
                        index
                      }
                    >
                      <input
                        type="text"
                        value={url}
                        onChange={(
                          e
                        ) =>
                          handleUpdateImage(
                            index,
                            e.target.value
                          )
                        }
                        placeholder="https://..."
                      />

                      <button
                        type="button"
                        className="remove-button"
                        onClick={() =>
                          handleRemoveImage(
                            index
                          )
                        }
                      >
                        ×
                      </button>
                    </div>
                  )
                )}

                {newProduct
                  .imageUrls
                  .length ===
                  0 && (
                  <div className="empty-input">
                    No images added
                  </div>
                )}
              </div>

              <div className="form-group">
                <div className="section-title-row">
                  <label>
                    Specifications
                  </label>

                  <button
                    type="button"
                    className="add-small-button"
                    onClick={
                      handleAddSpecificationField
                    }
                  >
                    + Add
                  </button>
                </div>

                {newProduct.specifications.map(
                  (
                    spec,
                    index
                  ) => (
                    <div
                      className="spec-input-row"
                      key={
                        index
                      }
                    >
                      <input
                        type="text"
                        placeholder="Name"
                        value={
                          spec.key
                        }
                        onChange={(
                          e
                        ) =>
                          handleUpdateSpecificationField(
                            index,
                            "key",
                            e.target
                              .value
                          )
                        }
                      />

                      <input
                        type="text"
                        placeholder="Value"
                        value={
                          spec.value
                        }
                        onChange={(
                          e
                        ) =>
                          handleUpdateSpecificationField(
                            index,
                            "value",
                            e.target
                              .value
                          )
                        }
                      />

                      <button
                        type="button"
                        className="remove-button"
                        onClick={() =>
                          handleRemoveSpecificationField(
                            index
                          )
                        }
                      >
                        ×
                      </button>
                    </div>
                  )
                )}
              </div>

              <div className="form-group">
                <label>
                  Offer
                </label>

                <input
                  type="text"
                  name="discountReason"
                  value={
                    newProduct.discountReason
                  }
                  onChange={
                    handleFormInputChange
                  }
                  placeholder="Example: 20% OFF"
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() =>
                    setShowModal(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-button"
                >
                  {isEditing
                    ? "Save changes"
                    : "Add product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      );
    };

  // =========================================================
  // SELLER LAYOUT
  // =========================================================

  const renderSellerDashboard =
    () => (
      <div className="seller-layout">
        <aside className="seller-sidebar">
          <Link
            to="/products"
            className="seller-logo"
          >
            <img
              src="/Zypcart.png"
              alt="Zypcart"
            />
          </Link>

          <nav className="seller-menu">
            <button
              className={
                sellerSubView ===
                "dashboard"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setSellerSubView(
                  "dashboard"
                )
              }
            >
              Dashboard
            </button>

            <button
              className={
                sellerSubView ===
                "products"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setSellerSubView(
                  "products"
                )
              }
            >
              Products
            </button>

            <button
              className={
                sellerSubView ===
                "orders"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setSellerSubView(
                  "orders"
                )
              }
            >
              Orders
            </button>

            <button
              className={
                sellerSubView ===
                "customers"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setSellerSubView(
                  "customers"
                )
              }
            >
              Customers
            </button>

            <button
              className={
                sellerSubView ===
                "analytics"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setSellerSubView(
                  "analytics"
                )
              }
            >
              Analytics
            </button>
          </nav>

          <button
            className="seller-logout"
            onClick={
              handleLogoutClick
            }
          >
            Logout
          </button>
        </aside>

        <main className="seller-main">
          <header className="seller-topbar">
            <div>
              <h1>
                {sellerSubView ===
                "dashboard"
                  ? "Dashboard"
                  : sellerSubView
                      .charAt(0)
                      .toUpperCase() +
                    sellerSubView.slice(
                      1
                    )}
              </h1>

              <p>
                Welcome back,{" "}
                {user?.name ||
                  "Seller"}
              </p>
            </div>

            <div className="seller-top-actions">
              <button
                className="view-store-button"
                onClick={() =>
                  setView(
                    "buyer"
                  )
                }
              >
                View store
              </button>

              {sellerSubView !==
                "products" && (
                <button
                  className="btn-primary"
                  onClick={
                    handleOpenCreateModal
                  }
                >
                  Add Product
                </button>
              )}
            </div>
          </header>

          {sellerSubView ===
            "dashboard" &&
            renderDashboardHome()}

          {sellerSubView ===
            "products" &&
            renderProductsTab()}

          {sellerSubView ===
            "orders" &&
            renderOrdersTab()}

          {sellerSubView ===
            "customers" &&
            renderCustomersTab()}

          {sellerSubView ===
            "analytics" &&
            renderAnalyticsTab()}
        </main>
      </div>
    );

  // =========================================================
  // FOOTER
  // =========================================================

  const renderFooter =
    () => (
      <footer className="footer">
        <div className="footer-inner">
          <div>
            <h3>Zypcart</h3>

            <p>
              Simple shopping.
              Great products.
            </p>
          </div>

          <div>
            <h4>Shop</h4>

            <Link to="/products">
              Products
            </Link>

            <Link to="/cart">
              Cart
            </Link>

            <Link to="/orders">
              Orders
            </Link>
          </div>

          <div>
            <h4>Account</h4>

            <Link to="/profile">
              Profile
            </Link>

            <Link to="/coupon">
              Coupons
            </Link>
          </div>

          <div>
            <h4>Support</h4>

            <Link to="/faq">
              FAQ
            </Link>

            <Link to="/returns">
              Returns
            </Link>

            <Link to="/shipping">
              Shipping
            </Link>
          </div>
        </div>

        <div className="footer-bottom">
          © {currentYear} Zypcart
        </div>
      </footer>
    );

  // =========================================================
  // INITIAL LOADING SCREEN
  // =========================================================

  if (pageLoading) {
    return (
      <div className="page-loading-screen">
        <div className="loading-content">
          <div className="loading-logo">
            <img src="/Zypcart.png" alt="Zypcart" />
          </div>
          <div className="loading-spinner" />
          <h2>Loading Zypcart</h2>
          <p>Preparing your shopping experience...</p>
        </div>
      </div>
    );
  }

  // =========================================================
  // MAIN RETURN
  // =========================================================

  return (
    <div className="app">
      {isSeller && (
        <div className="view-switcher">
          <button
            className={
              view === "buyer"
                ? "active"
                : ""
            }
            onClick={() =>
              setView("buyer")
            }
          >
            Store
          </button>

          <button
            className={
              view === "seller"
                ? "active"
                : ""
            }
            onClick={() =>
              setView("seller")
            }
          >
            Seller
          </button>
        </div>
      )}

      {isSeller &&
      view === "seller" ? (
        renderSellerDashboard()
      ) : (
        <>
          {renderBuyerNavbar()}
          {renderMarketplace()}
          {renderFooter()}
        </>
      )}

      {renderProductDetails()}
      {renderProductForm()}
    </div>
  );
}

export default Products