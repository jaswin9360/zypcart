import { useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Profile.css";
import { AuthContext } from "../context/AuthContext";

function Profile() {
  const { user, logout, setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const API_BASE_URL = "https://zypcart-user-backend.onrender.com/api/auth";
  const userId = user?._id || user?.id;

  const [pageLoading, setPageLoading] = useState(true);
  const [profileReady, setProfileReady] = useState(false);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [hasPhone, setHasPhone] = useState(false);
  const [showPhoneForm, setShowPhoneForm] = useState(false);
  const [isAccountUnlocked, setIsAccountUnlocked] = useState(false);
  const [hasSetPin, setHasSetPin] = useState(!!user?.hasPin);
  const [pinInput, setPinInput] = useState("");
  const [sensitiveData, setSensitiveData] = useState({ email: "", phone: "" });

  const [phoneInput, setPhoneInput] = useState("");
  const [needsCountryCode, setNeedsCountryCode] = useState(false);
  const [countryCode, setCountryCode] = useState("+91");

  const [isChangingPin, setIsChangingPin] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [confirmPinPassword, setConfirmPinPassword] = useState("");
  const [newPinInput, setNewPinInput] = useState("");

  const [isVerifyingSeller, setIsVerifyingSeller] = useState(false);
  const [upgradeOtpInput, setUpgradeOtpInput] = useState("");
  const [isUpgradeOtpSent, setIsUpgradeOtpSent] = useState(false);

  const [isDeactivatingSeller, setIsDeactivatingSeller] = useState(false);
  const [deactivateOtpInput, setDeactivateOtpInput] = useState("");

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressForm, setAddressForm] = useState({
    name: "",
    street: "",
    cityStateZip: "",
    country: "India",
    phone: ""
  });

  const intervalRef = useRef(null);

  const countryCodes = [
    { code: "+91", label: "India (+91)" },
    { code: "+1", label: "USA / Canada (+1)" },
    { code: "+44", label: "UK (+44)" },
    { code: "+971", label: "UAE (+971)" },
    { code: "+61", label: "Australia (+61)" }
  ];

  const getHeaders = () => ({ "Content-Type": "application/json" });

  // Initial profile gate: do not expose profile UI until account status is known.
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    const initializeProfile = async () => {
      setPageLoading(true);
      setProfileReady(false);

      try {
        const response = await fetch(`${API_BASE_URL}/${userId}/phone_status`);
        const data = await response.json();

        if (cancelled) return;

        if (response.ok && data.hasPhone) {
          setHasPhone(true);
          setShowPhoneForm(false);
          setHasSetPin(!!user?.hasPin);
          setSensitiveData((prev) => ({
            ...prev,
            phone: data.phone || user?.phone || ""
          }));
        } else {
          setHasPhone(false);
          setShowPhoneForm(true);
          setHasSetPin(!!user?.hasPin);
        }

        setProfileReady(true);
      } catch (error) {
        console.error("Profile initialization failed:", error);
        if (!cancelled) {
          // Fall back to locally available user information.
          const localPhone = user?.phone || "";
          setHasPhone(!!localPhone);
          setHasSetPin(!!user?.hasPin);
          setSensitiveData((prev) => ({
            ...prev,
            email: user?.email || prev.email,
            phone: localPhone || prev.phone
          }));
          setShowPhoneForm(!localPhone);
          setProfileReady(true);
        }
      } finally {
        if (!cancelled) setPageLoading(false);
      }
    };

    initializeProfile();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  const fetchUserAddresses = async () => {
    if (!userId) return;

    setAddressesLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/${userId}/addresses`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Unable to load addresses.");

      setAddresses(Array.isArray(data.addresses) ? data.addresses : []);
      setSelectedAddressId(data.selectedAddressId || "");
    } catch (error) {
      console.error("Address loading failed:", error);
    } finally {
      setAddressesLoading(false);
    }
  };

  const unlockWithData = async (data) => {
    setIsAccountUnlocked(true);
    setSensitiveData(data?.sensitiveData || {
      email: user?.email || "",
      phone: user?.phone || ""
    });
    setPinInput("");
    await fetchUserAddresses();
  };

  const handlePhoneChange = (event) => {
    const value = event.target.value;
    setPhoneInput(value);
    setNeedsCountryCode(value.length > 0 && !value.startsWith("+"));
  };

  const handleUpdatePhoneSubmit = async (event) => {
    event.preventDefault();

    let formattedPhone = phoneInput.trim();
    if (!formattedPhone) return alert("Please enter a valid phone number.");
    if (!formattedPhone.startsWith("+")) formattedPhone = `${countryCode}${formattedPhone}`;
    if (formattedPhone.length < 10) return alert("Please enter a valid phone number.");

    try {
      setActionLoading(true);
      const response = await fetch(`${API_BASE_URL}/${userId}/add_phone`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ phone: formattedPhone })
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Failed to add phone number.");

      setHasPhone(true);
      setShowPhoneForm(false);
      setHasSetPin(!!data.hasPin);
      setSensitiveData((prev) => ({ ...prev, phone: data.phone || formattedPhone }));

      if (setUser) {
        setUser((prev) => ({
          ...prev,
          phone: data.phone || formattedPhone,
          hasPin: !!data.hasPin
        }));
      }

      alert(data.message || "Phone number added successfully.");
    } catch (error) {
      alert(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetupPin = async (event) => {
    event.preventDefault();
    if (pinInput.length !== 4) return alert("PIN must contain exactly 4 digits.");

    try {
      setActionLoading(true);
      const response = await fetch(`${API_BASE_URL}/${userId}/setup_pin`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ pin: pinInput })
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Unable to create PIN.");

      setHasSetPin(true);
      if (setUser) setUser((prev) => ({ ...prev, hasPin: true }));
      await unlockWithData({
        sensitiveData: {
          email: user?.email || "",
          phone: user?.phone || phoneInput || ""
        }
      });
      alert(data.message || "PIN created successfully.");
    } catch (error) {
      alert(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyPin = async (event) => {
    event.preventDefault();
    if (pinInput.length !== 4) return alert("PIN must contain exactly 4 digits.");

    try {
      setActionLoading(true);
      const response = await fetch(`${API_BASE_URL}/${userId}/verify_pin`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ pin: pinInput })
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Incorrect PIN.");
      await unlockWithData(data);
    } catch (error) {
      alert(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePasswordSubmit = async (event) => {
    event.preventDefault();

    try {
      setActionLoading(true);
      const response = await fetch(`${API_BASE_URL}/${userId}/change_password`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          currentPassword: currentPasswordInput,
          newPassword: newPasswordInput
        })
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Unable to update password.");

      setIsChangingPassword(false);
      setCurrentPasswordInput("");
      setNewPasswordInput("");
      alert(data.message || "Password updated successfully.");
    } catch (error) {
      alert(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePinSubmit = async (event) => {
    event.preventDefault();
    if (newPinInput.length !== 4) return alert("New PIN must contain exactly 4 digits.");

    try {
      setActionLoading(true);
      const response = await fetch(`${API_BASE_URL}/${userId}/change_pin`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          password: confirmPinPassword,
          newPin: newPinInput
        })
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Unable to update PIN.");

      setIsChangingPin(false);
      setConfirmPinPassword("");
      setNewPinInput("");
      alert(data.message || "PIN updated successfully.");
    } catch (error) {
      alert(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestUpgradeOtp = async () => {
    try {
      setActionLoading(true);
      const response = await fetch(`${API_BASE_URL}/${userId}/request_upgrade_otp`, {
        method: "POST",
        headers: getHeaders()
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Unable to send verification code.");
      setIsUpgradeOtpSent(true);
      alert(data.message || "Verification code sent.");
    } catch (error) {
      alert(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmUpgradeSubmit = async (event) => {
    event.preventDefault();

    try {
      setActionLoading(true);
      const response = await fetch(`${API_BASE_URL}/${userId}/confirm_upgrade`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ otp: upgradeOtpInput })
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Invalid verification code.");

      if (setUser) setUser((prev) => ({ ...prev, role: data.role }));
      setIsVerifyingSeller(false);
      setIsUpgradeOtpSent(false);
      setUpgradeOtpInput("");
      alert(data.message || "Seller account activated.");
    } catch (error) {
      alert(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestDeactivation = async () => {
    try {
      setActionLoading(true);
      const response = await fetch(`${API_BASE_URL}/${userId}/request_deactivation_otp`, {
        method: "POST",
        headers: getHeaders()
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Unable to send verification code.");
      setIsDeactivatingSeller(true);
      alert(data.message || "Verification code sent.");
    } catch (error) {
      alert(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDeactivationSubmit = async (event) => {
    event.preventDefault();

    try {
      setActionLoading(true);
      const response = await fetch(`${API_BASE_URL}/${userId}/confirm_deactivation`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ otp: deactivateOtpInput })
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Invalid verification code.");

      if (setUser) setUser((prev) => ({ ...prev, role: data.role }));
      setIsDeactivatingSeller(false);
      setDeactivateOtpInput("");
      alert(data.message || "Seller account deactivated.");
    } catch (error) {
      alert(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectActiveAddressId = async (id) => {
    if (!id) return;
    setSelectedAddressId(id);

    try {
      const response = await fetch(`${API_BASE_URL}/${userId}/addresses/select`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ addressId: id })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to select address.");
    } catch (error) {
      console.error(error);
      await fetchUserAddresses();
    }
  };

  const resetAddressForm = () => {
    setIsAddingNew(false);
    setEditingAddressId(null);
    setAddressForm({
      name: "",
      street: "",
      cityStateZip: "",
      country: "India",
      phone: ""
    });
  };

  const handleSaveAddressSubmit = async (event) => {
    event.preventDefault();

    try {
      setActionLoading(true);

      const editing = !!editingAddressId;
      const url = editing
        ? `${API_BASE_URL}/${userId}/addresses/${editingAddressId}`
        : `${API_BASE_URL}/${userId}/addresses`;

      const response = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: getHeaders(),
        body: JSON.stringify(addressForm)
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Unable to save address.");

      setAddresses(data.addresses || []);
      setSelectedAddressId(data.selectedAddressId || selectedAddressId);
      resetAddressForm();
      alert(data.message || "Address saved.");
    } catch (error) {
      alert(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const triggerAddNewMode = () => {
    setEditingAddressId(null);
    setIsAddingNew(true);
    setAddressForm({
      name: "",
      street: "",
      cityStateZip: "",
      country: "India",
      phone: ""
    });
  };

  const triggerEditMode = (address) => {
    setEditingAddressId(address._id || address.id);
    setIsAddingNew(false);
    setAddressForm({
      name: address.name || "",
      street: address.street || "",
      cityStateZip: address.cityStateZip || "",
      country: address.country || "India",
      phone: address.phone || ""
    });
  };

  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm("Delete this delivery address?")) return;

    try {
      setActionLoading(true);
      const response = await fetch(`${API_BASE_URL}/${userId}/addresses/${addressId}`, {
        method: "DELETE",
        headers: getHeaders()
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Unable to delete address.");

      setAddresses(data.addresses || []);
      setSelectedAddressId(data.selectedAddressId || "");
      alert(data.message || "Address deleted.");
    } catch (error) {
      alert(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (typeof logout === "function") await logout();
    } finally {
      navigate("/");
    }
  };

  if (pageLoading || !profileReady) {
    return (
      <div className="profile-page-loading">
        <div className="profile-loading-box">
          <div className="profile-loading-logo">
            <img src="/Zypcart.png" alt="Zypcart" />
          </div>
          <div className="profile-loading-spinner" />
          <h2>Preparing your account</h2>
          <p>Loading your account details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        <header className="profile-header">
          <button className="back-button" onClick={() => navigate("/products")}>
            <span>←</span>
            Back to products
          </button>
          <div className="header-title">
            <h1>Account</h1>
          </div>
        </header>

        {!hasPhone && (
          <section className="account-card phone-required-card">
            <div className="status-icon">!</div>
            <div className="status-content">
              <h2>Add your phone number</h2>
              <p>A phone number is required to protect your account.</p>
              {showPhoneForm && (
                <form className="profile-form compact-form" onSubmit={handleUpdatePhoneSubmit}>
                  {needsCountryCode && (
                    <div className="country-warning">Select your country code before continuing.</div>
                  )}
                  <div className="form-group">
                    <label>Phone number</label>
                    <input
                      type="text"
                      placeholder="+91 9876543210"
                      value={phoneInput}
                      onChange={handlePhoneChange}
                      disabled={actionLoading}
                      required
                    />
                  </div>
                  {needsCountryCode && (
                    <div className="form-group">
                      <label>Country</label>
                      <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)}>
                        {countryCodes.map((item) => (
                          <option key={item.code} value={item.code}>{item.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <button className="primary-button" type="submit" disabled={actionLoading}>
                    {actionLoading ? "Saving..." : "Add phone number"}
                  </button>
                </form>
              )}
            </div>
          </section>
        )}

        {hasPhone && !isAccountUnlocked && (
          <div className="unlock-wrapper">
            <div className="unlock-card">
              <div className="lock-icon">•••</div>
              <h2>{hasSetPin ? "Enter your PIN" : "Create your account PIN"}</h2>
              <p>{hasSetPin ? "Enter your 4-digit PIN to access your account." : "Set a 4-digit PIN to protect your account details."}</p>

              <form className="profile-form" onSubmit={hasSetPin ? handleVerifyPin : handleSetupPin}>
                <div className="pin-input-wrapper">
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength="4"
                    placeholder="••••"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                    autoFocus
                    required
                  />
                </div>
                <button className="primary-button full-button" type="submit" disabled={actionLoading}>
                  {actionLoading ? "Please wait..." : hasSetPin ? "Unlock account" : "Create PIN"}
                </button>
              </form>

              <div className="secure-note">Your account information is protected.</div>
            </div>
          </div>
        )}

        {hasPhone && isAccountUnlocked && (
          <>
            <section className="profile-overview account-card">
              <div className="profile-avatar">{(user?.name || "U").charAt(0).toUpperCase()}</div>
              <div className="profile-overview-info">
                <div className="profile-name-row">
                  <h2>{user?.name || "User"}</h2>
                  <span className={`role-badge ${user?.role === "seller" ? "seller" : "buyer"}`}>
                    {user?.role === "seller" ? "Seller" : "Buyer"}
                  </span>
                </div>
                <p>{sensitiveData.email || user?.email || "Email unavailable"}</p>
                <span className="account-status">Account active</span>
              </div>
            </section>

            <div className="profile-grid">
              <div className="profile-main-column">
                <section className="account-card">
                  <div className="section-header">
                    <div>
                      <h3>Personal information</h3>
                    </div>
                  </div>
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="info-label">Email</span>
                      <strong>{sensitiveData.email || user?.email || "Not available"}</strong>
                      <span className="verified-label">Verified</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Phone</span>
                      <strong>{sensitiveData.phone || user?.phone || "Not available"}</strong>
                      <span className="verified-label">Verified</span>
                    </div>
                  </div>
                </section>

                <section className="account-card">
                  <div className="section-header">
                    <div>
                      <h3>Security</h3>
                    </div>
                    <span className="security-badge">Protected</span>
                  </div>

                  <div className="security-list">
                    <div className="security-row">
                      <div className="security-row-icon">Aa</div>
                      <div className="security-row-content">
                        <strong>Password</strong>
                        <span>Your password is securely protected.</span>
                      </div>
                      <button
                        className="secondary-button"
                        onClick={() => {
                          setIsChangingPassword((v) => !v);
                          setIsChangingPin(false);
                        }}
                      >
                        {isChangingPassword ? "Cancel" : "Change"}
                      </button>
                    </div>

                    {isChangingPassword && (
                      <form className="security-form" onSubmit={handleChangePasswordSubmit}>
                        <div className="form-group">
                          <label>Current password</label>
                          <input type="password" value={currentPasswordInput} onChange={(e) => setCurrentPasswordInput(e.target.value)} required />
                        </div>
                        <div className="form-group">
                          <label>New password</label>
                          <input type="password" value={newPasswordInput} onChange={(e) => setNewPasswordInput(e.target.value)} required />
                        </div>
                        <button className="primary-button" disabled={actionLoading} type="submit">
                          {actionLoading ? "Updating..." : "Update password"}
                        </button>
                      </form>
                    )}

                    <div className="security-row">
                      <div className="security-row-icon">•••</div>
                      <div className="security-row-content">
                        <strong>Account PIN</strong>
                        <span>4-digit PIN protects your profile.</span>
                      </div>
                      <button
                        className="secondary-button"
                        onClick={() => {
                          setIsChangingPin((v) => !v);
                          setIsChangingPassword(false);
                        }}
                      >
                        {isChangingPin ? "Cancel" : "Change"}
                      </button>
                    </div>

                    {isChangingPin && (
                      <form className="security-form" onSubmit={handleChangePinSubmit}>
                        <div className="form-group">
                          <label>Account password</label>
                          <input type="password" value={confirmPinPassword} onChange={(e) => setConfirmPinPassword(e.target.value)} required />
                        </div>
                        <div className="form-group">
                          <label>New 4-digit PIN</label>
                          <input
                            type="password"
                            inputMode="numeric"
                            maxLength="4"
                            value={newPinInput}
                            onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ""))}
                            required
                          />
                        </div>
                        <button className="primary-button" disabled={actionLoading} type="submit">
                          {actionLoading ? "Updating..." : "Update PIN"}
                        </button>
                      </form>
                    )}
                  </div>
                </section>

                {user?.role === "buyer" && !isVerifyingSeller && (
                  <section className="seller-card">
                    <div>
                      <span className="seller-card-label">SELL ON ZYPCART</span>
                      <h3>Start selling your products</h3>
                      <p>Upgrade your account and create your own seller store.</p>
                    </div>
                    <button
                      className="primary-button"
                      disabled={actionLoading}
                      onClick={() => {
                        setIsVerifyingSeller(true);
                        handleRequestUpgradeOtp();
                      }}
                    >
                      Become a seller
                    </button>
                  </section>
                )}

                {isVerifyingSeller && (
                  <section className="account-card verification-card">
                    <div className="section-header">
                      <div>
                        <h3>Verify seller account</h3>
                        <p>Enter the verification code sent to your phone.</p>
                      </div>
                    </div>
                    {isUpgradeOtpSent ? (
                      <form className="profile-form" onSubmit={handleConfirmUpgradeSubmit}>
                        <div className="form-group">
                          <label>Verification code</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength="4"
                            placeholder="0000"
                            value={upgradeOtpInput}
                            onChange={(e) => setUpgradeOtpInput(e.target.value.replace(/\D/g, ""))}
                            required
                          />
                        </div>
                        <div className="button-row">
                          <button className="primary-button" type="submit" disabled={actionLoading}>Confirm</button>
                          <button className="secondary-button" type="button" onClick={() => { setIsVerifyingSeller(false); setIsUpgradeOtpSent(false); }}>Cancel</button>
                        </div>
                      </form>
                    ) : (
                      <div className="loading-message">Sending verification code...</div>
                    )}
                  </section>
                )}

                {user?.role === "seller" && !isDeactivatingSeller && (
                  <section className="account-card seller-active-card">
                    <div>
                      <span className="seller-active-status">ACTIVE SELLER</span>
                      <h3>Your seller account is active</h3>
                      <p>Your seller tools and store are currently enabled.</p>
                    </div>
                    <button className="danger-outline-button" disabled={actionLoading} onClick={handleRequestDeactivation}>
                      Deactivate seller account
                    </button>
                  </section>
                )}

                {isDeactivatingSeller && (
                  <section className="account-card danger-card">
                    <h3>Deactivate seller account</h3>
                    <p>Enter the verification code sent to your phone.</p>
                    <form className="profile-form" onSubmit={handleConfirmDeactivationSubmit}>
                      <div className="form-group">
                        <label>Verification code</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength="4"
                          placeholder="0000"
                          value={deactivateOtpInput}
                          onChange={(e) => setDeactivateOtpInput(e.target.value.replace(/\D/g, ""))}
                          required
                        />
                      </div>
                      <div className="button-row">
                        <button className="danger-button" disabled={actionLoading} type="submit">Confirm deactivation</button>
                        <button className="secondary-button" type="button" onClick={() => { setIsDeactivatingSeller(false); setDeactivateOtpInput(""); }}>Cancel</button>
                      </div>
                    </form>
                  </section>
                )}
              </div>

              <aside className="profile-side-column">
                <section className="account-card addresses-card">
                  <div className="section-header">
                    <div>
                      <h3>Delivery addresses</h3>
                    </div>
                    <span className="address-count">{addresses.length}</span>
                  </div>

                  {(isAddingNew || editingAddressId) && (
                    <form className="address-form" onSubmit={handleSaveAddressSubmit}>
                      <div className="address-form-header">
                        <h4>{editingAddressId ? "Edit address" : "New address"}</h4>
                        <button type="button" className="close-form-button" onClick={resetAddressForm}>×</button>
                      </div>

                      <div className="form-group">
                        <label>Full name</label>
                        <input type="text" value={addressForm.name} onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })} required />
                      </div>
                      <div className="form-group">
                        <label>Street address</label>
                        <input type="text" value={addressForm.street} onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })} required />
                      </div>
                      <div className="form-group">
                        <label>City, state & ZIP</label>
                        <input type="text" value={addressForm.cityStateZip} onChange={(e) => setAddressForm({ ...addressForm, cityStateZip: e.target.value })} required />
                      </div>
                      <div className="address-two-column">
                        <div className="form-group">
                          <label>Country</label>
                          <input type="text" value={addressForm.country} onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })} required />
                        </div>
                        <div className="form-group">
                          <label>Phone</label>
                          <input type="text" value={addressForm.phone} onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })} required />
                        </div>
                      </div>
                      <button className="primary-button full-button" disabled={actionLoading} type="submit">
                        {actionLoading ? "Saving..." : editingAddressId ? "Save changes" : "Add address"}
                      </button>
                    </form>
                  )}

                  {addressesLoading ? (
                    <div className="address-loading">
                      <div className="small-spinner" />
                      <span>Loading addresses...</span>
                    </div>
                  ) : (
                    <div className="address-list">
                      {addresses.length === 0 && (
                        <div className="empty-address">
                          <div className="empty-address-icon">+</div>
                          <strong>No delivery addresses</strong>
                          <span>Add an address to make checkout faster.</span>
                        </div>
                      )}

                      {addresses.map((address) => {
                        const addressId = address._id || address.id;
                        const isSelected = selectedAddressId === addressId;

                        return (
                          <div
                            key={addressId}
                            className={`address-item ${isSelected ? "selected" : ""}`}
                            onClick={() => handleSelectActiveAddressId(addressId)}
                          >
                            <div className="address-top">
                              <input
                                type="radio"
                                name="delivery-address"
                                checked={isSelected}
                                onChange={() => handleSelectActiveAddressId(addressId)}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="address-content">
                                <strong>{address.name}</strong>
                                <span>{address.street}</span>
                                <span>{address.cityStateZip}</span>
                                <span>{address.country}</span>
                                <span className="address-phone">{address.phone}</span>
                              </div>
                            </div>

                            {isSelected && (
                              <div className="address-actions">
                                <button className="text-button" onClick={(e) => { e.stopPropagation(); triggerEditMode(address); }}>Edit</button>
                                <button className="text-button danger-text" onClick={(e) => { e.stopPropagation(); handleDeleteAddress(addressId); }}>Delete</button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {!addressesLoading && !isAddingNew && !editingAddressId && (
                    <button className="add-address-button" onClick={triggerAddNewMode}>
                      <span>+</span>
                      Add delivery address
                    </button>
                  )}
                </section>
              </aside>
            </div>

            <div className="account-footer">
              <button className="logout-button" onClick={handleLogout}>Log out</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Profile;
