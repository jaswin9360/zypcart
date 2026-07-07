import { useContext, useState, useEffect, useRef } from 'react';
import { useNavigate, useRouteLoaderData } from 'react-router-dom';
import './Profile.css';
import { AuthContext } from '../context/AuthContext';

function Profile() {
  const { user, logout, setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  // --- UI & Lock Control States ---
  const [hasPhone, setHasPhone] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isAccountUnlocked, setIsAccountUnlocked] = useState(false);
  const [hasSetPin, setHasSetPin] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [sensitiveData, setSensitiveData] = useState({ email: '', phone: '' });
  const [showPassword, setShowPassword] = useState(false);

  // --- Action Form Panel Toggles ---
  const [phoneInput, setPhoneInput] = useState('');
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // --- Input Element Value Holders ---
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPinPassword, setConfirmPinPassword] = useState('');
  const [newPinInput, setNewPinInput] = useState('');

  // --- New Phone-Only Upgrade States ---
  const [isVerifyingSeller, setIsVerifyingSeller] = useState(false);
  const [upgradeOtpInput, setUpgradeOtpInput] = useState('');
  const [isUpgradeOtpSent, setIsUpgradeOtpSent] = useState(false);

  // --- Deactivation States ---
  const [isDeactivatingSeller, setIsDeactivatingSeller] = useState(false);
  const [deactivateOtpInput, setDeactivateOtpInput] = useState('');
  const [loading, setLoading] = useState(false);

  const [needsCountryCode, setNeedsCountryCode] = useState(false);
  const [countryCode, setCountryCode] = useState('+91');

  // --- 📦 Dynamic Address Array State Management ---
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [addresses, setAddresses] = useState([]); // Base array that holds all shipping addresses

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);

  // Unified Address Form structure
  const [addressForm, setAddressForm] = useState({
    name: '', street: '', cityStateZip: '', country: 'India', phone: ''
  });

  const countryCodes = [
    { code: '+91', label: 'India (+91)' },
    { code: '+1', label: 'USA/Canada (+1)' },
    { code: '+44', label: 'UK (+44)' },
    { code: '+971', label: 'UAE (+971)' },
    { code: '+61', label: 'Australia (+61)' },
  ];

  const API_BASE_URL = 'https://zypcart-user-backend.onrender.com/api/auth';
  const userId = user?._id || user?.id;
  const intervalRef = useRef(null);

  // Load standard address array once unlocked
  useEffect(() => {
    if (isAccountUnlocked && userId) {
      fetchUserAddresses();
    }
  }, [isAccountUnlocked, userId]);

  const fetchUserAddresses = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/${userId}/addresses`);
      const data = await res.json();
      if (res.ok) {
        setAddresses(data.addresses || []); // Push backend address array block directly into state array
        setSelectedAddressId(data.selectedAddressId || '');
      }
    } catch (err) {
      console.error("Error retrieving array payload:", err);
    }
  };

  // Live 2-Second Background Status Check Poller Loop
  useEffect(() => {
    if (!userId) return;

    if (!user?.phone) {
      setHasPhone(false);
      setShowForm(false);

      const formTimer = setTimeout(() => {
        setShowForm(true);
      }, 5000);

      intervalRef.current = setInterval(async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/${userId}/phone_status`);
          const data = await res.json();

          if (data.hasPhone) {
            setHasPhone(true);
            setHasSetPin(!!useRouteLoaderData.hasPin);
            setSensitiveData(prev => ({ ...prev, phone: data.phone }));

            if (setUser) {
              setUser(prevUser => ({
                ...prevUser,
                phone: data.phone,
                hasPin: user.hasPin
              }));
            }
            clearInterval(intervalRef.current);
            clearTimeout(formTimer);
          }
        } catch (err) {
          console.error("Live sync polling runtime exception:", err);
        }
      }, 2000);

      return () => {
        clearInterval(intervalRef.current);
        clearTimeout(formTimer);
      };
    } else {
      setHasPhone(true);
      setHasSetPin(!!user.hasPin);
    }
  }, [user, userId, setUser]);

  const getHeaders = () => ({ 'Content-Type': 'application/json' });

  const handlePhoneChange = (e) => {
    const val = e.target.value;
    setPhoneInput(val);
    if (val.length > 0 && !val.startsWith('+')) {
      setNeedsCountryCode(true);
    } else {
      setNeedsCountryCode(false);
    }
  };

  const handleUpdatePhoneSubmit = async (e) => {
    e.preventDefault();
    let formattedPhone = phoneInput.trim();
    if (!formattedPhone) return alert('Please enter a valid phone number');
    if (!formattedPhone.startsWith('+')) formattedPhone = `${countryCode}${formattedPhone}`;
    if (formattedPhone.length < 10) return alert('Please enter a valid phone number length');

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/${userId}/add_phone`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ phone: formattedPhone })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      alert(data.message);
      clearInterval(intervalRef.current);
      setHasPhone(true);
      setHasSetPin(!!data.hasPin);
      setSensitiveData(prev => ({ ...prev, phone: data.phone }));
      if (setUser) setUser(prevUser => ({ ...prevUser, phone: data.phone, hasPin: data.hasPin }));
    } catch (err) {
      alert(err.message || 'Failed to update phone context mapping');
    } finally {
      setLoading(false);
    }
  };

  const handleSetupPin = async (e) => {
    e.preventDefault();
    if (pinInput.length !== 4) return alert('PIN must be 4 digits');
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/${userId}/setup_pin`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ pin: pinInput })
      });
      if (!res.ok) throw new Error((await res.json()).message);
      alert("PIN configured successfully!");
      setHasSetPin(true);
      setIsAccountUnlocked(true);
      setPinInput('');
      setSensitiveData({ email: user?.email || '', phone: user?.phone || phoneInput });
      if (setUser) setUser(prev => ({ ...prev, hasPin: true }));
    } catch (err) { alert(err.message); } finally { setLoading(false); }
  };

  const handleVerifyPin = async (e) => {
    e.preventDefault();
    if (pinInput.length !== 4) return alert('PIN must be 4 digits');
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/${userId}/verify_pin`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ pin: pinInput })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setIsAccountUnlocked(true);
      setSensitiveData(data.sensitiveData);
      setPinInput('');
    } catch (err) { alert(err.message); } finally { setLoading(false); }
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/${userId}/change_password`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ currentPassword: currentPasswordInput, newPassword: newPasswordInput })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      alert(data.message);
      if (setUser) setUser(prev => ({ ...prev, password: data.updatedPassword, org_password: newPasswordInput }));
      setIsChangingPassword(false);
      setCurrentPasswordInput('');
      setNewPasswordInput('');
    } catch (err) { alert(err.message); } finally { setLoading(false); }
  };

  const handleChangePinSubmit = async (e) => {
    e.preventDefault();
    if (newPinInput.length !== 4) return alert("New PIN must be exactly 4 digits");
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/${userId}/change_pin`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ password: confirmPinPassword, newPin: newPinInput })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      alert(data.message);
      setIsChangingPin(false);
      setConfirmPinPassword('');
      setNewPinInput('');
    } catch (err) { alert(err.message); } finally { setLoading(false); }
  };

  const handleRequestUpgradeOtp = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/${userId}/request_upgrade_otp`, { method: 'POST', headers: getHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      alert(data.message);
      setIsUpgradeOtpSent(true);
    } catch (err) { alert(err.message); } finally { setLoading(false); }
  };

  const handleConfirmUpgradeSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/${userId}/confirm_upgrade`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ otp: upgradeOtpInput })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      alert(data.message);
      setUser({ ...user, role: data.role });
      setIsVerifyingSeller(false);
      setIsUpgradeOtpSent(false);
      setUpgradeOtpInput('');
    } catch (err) { alert(err.message); } finally { setLoading(false); }
  };

  const handleRequestDeactivation = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/${userId}/request_deactivation_otp`, { method: 'POST', headers: getHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      alert(data.message);
      setIsDeactivatingSeller(true);
    } catch (err) { alert(err.message); } finally { setLoading(false); }
  };

  const handleConfirmDeactivationSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/${userId}/confirm_deactivation`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ otp: deactivateOtpInput })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      alert(data.message);
      setUser({ ...user, role: data.role });
      setIsDeactivatingSeller(false);
      setDeactivateOtpInput('');
    } catch (err) { alert(err.message); } finally { setLoading(false); }
  };

  // --- 📦 Array Selection & Submission Handlers ---
  const handleSelectActiveAddressId = async (id) => {
    // Safeguard: Prevent hitting the backend if the ID is missing or undefined
    if (!id) {
      console.warn("Warning: Received empty or undefined address ID selector.");
      return;
    }

    setSelectedAddressId(id);

    try {
      const res = await fetch(`${API_BASE_URL}/${userId}/addresses/select`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ addressId: id }) // Will now send a valid 24-character hex string
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Server rejected selection update');
      }
    } catch (err) {
      console.error("Failed to select address item location state:", err);
    }
  };

  const handleSaveAddressSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let url = `${API_BASE_URL}/${userId}/addresses`;
      let method = 'POST'; // Automatically appends/pushes new address to the backend array

      if (editingAddressId) {
        url = `${API_BASE_URL}/${userId}/addresses/${editingAddressId}`;
        method = 'PUT';
      }

      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(addressForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      alert(data.message);
      setAddresses(data.addresses || []); // Reset state cleanly with updated array structure
      if (data.selectedAddressId) setSelectedAddressId(data.selectedAddressId);

      setIsAddingNew(false);
      setEditingAddressId(null);
      setAddressForm({ name: '', street: '', cityStateZip: '', country: 'India', phone: '' });
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const triggerEditMode = (addr) => {
    setEditingAddressId(addr._id || addr.id);
    setIsAddingNew(false);
    setAddressForm({
      name: addr.name, street: addr.street, cityStateZip: addr.cityStateZip, country: addr.country, phone: addr.phone
    });
  };

  const triggerAddNewMode = () => {
    setIsAddingNew(true);
    setEditingAddressId(null);
    setAddressForm({ name: '', street: '', cityStateZip: '', country: 'India', phone: '' });
  };


  const handleDeleteAddress = async (addressId) => {
    // Safeguard confirmation window modal prompt
    const confirmDelete = window.confirm("Are you sure you want to permanently delete this address?");
    if (!confirmDelete) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/${userId}/addresses/${addressId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      alert(data.message);
      setAddresses(data.addresses || []); // Directly update the frontend state array
      if (data.selectedAddressId) setSelectedAddressId(data.selectedAddressId);

    } catch (err) {
      alert(err.message || "Failed to remove address element");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-page-container">
      <div className="profile-card" style={{ maxWidth: isAccountUnlocked ? '950px' : '500px', transition: 'max-width 0.3s ease' }}>

        <button className="profile-back-arrow" onClick={() => navigate('/products')}>
          ← <span className="back-text">Products</span>
        </button>

        <div className="profile-avatar-large">
          {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
        </div>

        {/* STEP A: Phone Notice Box */}
        {!hasPhone ? (
          <div className="profile-locked-container mandatory-phone-box">
            <h2>Phone Number Required</h2>
            <p className="lock-notice">Link a phone number to view details. Checking live records...</p>

            {showForm && (
              <form onSubmit={handleUpdatePhoneSubmit} className="pin-form" style={{ marginTop: '15px' }}>
                {needsCountryCode && (
                  <div className="country-select-box" style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', fontSize: '14px', marginBottom: '5px', color: '#ff6b6b' }}>
                      ⚠️ Missing country code. Please select your country:
                    </label>
                    <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px' }}>
                      {countryCodes.map((c) => (<option key={c.code} value={c.code}>{c.label}</option>))}
                    </select>
                  </div>
                )}
                <label>Enter Phone Number (e.g. +91XXXXXXXXXX):</label>
                <input type="text" placeholder="e.g. +919876543210" value={phoneInput} onChange={handlePhoneChange} required disabled={loading} />
                <button type="submit" className="view-account-btn" disabled={loading}>
                  {loading ? 'Saving details...' : 'Link Phone Number'}
                </button>
              </form>
            )}
          </div>
        ) :

          /* STEP B: PIN Authorization Firewall */
          !isAccountUnlocked ? (
            <div className="profile-locked-container">
              <h2>Account Details Protected</h2>
              {hasSetPin ? (
                <form onSubmit={handleVerifyPin} className="pin-form">
                  <label>Enter your 4-digit Account PIN:</label>
                  <input type="password" maxLength="4" placeholder="Enter PIN" value={pinInput} onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))} required />
                  <button type="submit" className="view-account-btn" disabled={loading}>Verify & Open Profile</button>
                </form>
              ) : (
                <form onSubmit={handleSetupPin} className="pin-form">
                  <label>Create a secure 4-digit access PIN:</label>
                  <input type="password" maxLength="4" placeholder="Create PIN" value={pinInput} onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))} required />
                  <button type="submit" className="view-account-btn" disabled={loading}>Set PIN & Unlock View</button>
                </form>
              )}
            </div>
          ) : (

            /* STEP C + D: Split Two-Column Side-by-Side Dashboard Layout */
            <div className="profile-unlocked-layout-grid" style={{ display: 'flex', gap: '40px', marginTop: '20px', flexWrap: 'wrap' }}>

              {/* LEFT SIDE COLUMN: User Info & Account Security Context Forms */}
              <div className="profile-left-column" style={{ flex: '1 1 400px', minWidth: '320px', textAlign: 'left' }}>
                <div className="profile-info">
                  <h1 className="profile-welcome-text" style={{ margin: '0 0 10px 0' }}>Welcome, {user?.name || 'User'}</h1>
                  <div className="profile-role-wrapper" style={{ marginBottom: '20px' }}>
                    <span className={`role-badge ${user?.role === 'seller' ? 'badge-seller' : 'badge-buyer'}`}>
                      {user?.role || 'Guest'} Account
                    </span>
                  </div>
                </div>

                <div className="account-secure-details" style={{ backgroundColor: '#fcfcfc', padding: '20px', borderRadius: '8px', border: '1px solid #eaeaea' }}>
                  <h3 style={{ marginTop: '0' }}>Secure Account Management</h3>
                  <p><strong>Email:</strong> {sensitiveData.email || 'N/A'}</p>
                  <p><strong>Phone:</strong> {sensitiveData.phone || 'Processing Sync...'}</p>

                  <button className="toggle-pwd-btn" style={{ width: '100%', marginBottom: '10px' }} onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? "⚠️ Hide Password Data" : "👁️ Show Password Data"}
                  </button>

                  {showPassword && (
                    <div style={{ padding: '8px', background: '#e9ecef', borderRadius: '4px', fontSize: '0.82rem', wordBreak: 'break-all', marginBottom: '15px' }}>
                      <strong>Value:</strong> {user?.org_password}
                    </div>
                  )}

                  <div className="profile-button-management-row" style={{ display: 'flex', gap: '10px' }}>
                    <button className="change-pwd-link-btn" onClick={() => { setIsChangingPassword(!isChangingPassword); setIsChangingPin(false); }}>⚙️ Password</button>
                    <button className="change-pin-link-btn" onClick={() => { setIsChangingPin(!isChangingPin); setIsChangingPassword(false); }}>🔑 Access PIN</button>
                  </div>

                  {isChangingPassword && (
                    <form onSubmit={handleChangePasswordSubmit} className="verification-sub-card" style={{ marginTop: '15px' }}>
                      <h4>Modify Password</h4>
                      <input type="password" placeholder="Current Password" value={currentPasswordInput} onChange={(e) => setCurrentPasswordInput(e.target.value)} required />
                      <input type="password" placeholder="New Password" value={newPasswordInput} onChange={(e) => setNewPasswordInput(e.target.value)} required />
                      <button type="submit" className="confirm-verify-btn" disabled={loading}>Update Password</button>
                    </form>
                  )}

                  {isChangingPin && (
                    <form onSubmit={handleChangePinSubmit} className="verification-sub-card" style={{ marginTop: '15px' }}>
                      <h4>Modify Account Access PIN</h4>
                      <input type="password" placeholder="Enter Account Password" value={confirmPinPassword} onChange={(e) => setConfirmPinPassword(e.target.value)} required />
                      <input type="password" maxLength="4" placeholder="Enter New 4-Digit PIN" value={newPinInput} onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))} required />
                      <button type="submit" className="confirm-verify-btn" disabled={loading}>Update PIN</button>
                    </form>
                  )}
                </div>

                {/* TWILIO PROMO PANELS SECTION */}
                <div style={{ marginTop: '20px' }}>
                  {user?.role === 'buyer' && !isVerifyingSeller && (
                    <div className="role-action-promo buyer-promo">
                      <p>Want to start selling your own merchandise on Zypcart ?</p>
                      <button className="promo-btn action-buyer" onClick={() => { setIsVerifyingSeller(true); handleRequestUpgradeOtp(); }}>
                        🚀 Create Seller Account (Verify via SMS)
                      </button>
                    </div>
                  )}

                  {isVerifyingSeller && (
                    <div className="verification-sub-card">
                      <h4>Activate Merchant Operational Privileges</h4>
                      {isUpgradeOtpSent ? (
                        <form onSubmit={handleConfirmUpgradeSubmit}>
                          <p>Enter the 4-digit activation token code sent to your device:</p>
                          <input type="text" maxLength="4" placeholder="Enter Activation OTP" value={upgradeOtpInput} onChange={(e) => setUpgradeOtpInput(e.target.value.replace(/\D/g, ''))} required />
                          <div className="action-btn-group">
                            <button type="submit" className="confirm-verify-btn" disabled={loading}>Confirm Upgrade</button>
                            <button type="button" className="cancel-btn" onClick={() => setIsVerifyingSeller(false)}>Cancel</button>
                          </div>
                        </form>
                      ) : <p>Generating secure upgrade SMS pipelines...</p>}
                    </div>
                  )}

                  {user?.role === 'seller' && !isDeactivatingSeller && (
                    <div className="role-action-promo seller-promo">
                      <p>Your shop setup is currently active.</p>
                      <button className="promo-btn deactivate-seller-btn" onClick={handleRequestDeactivation} disabled={loading}>
                        ⚠️ Deactivate Seller Account via OTP
                      </button>
                    </div>
                  )}

                  {isDeactivatingSeller && (
                    <form onSubmit={handleConfirmDeactivationSubmit} className="verification-sub-card">
                      <h4>Confirm Deactivation</h4>
                      <p>Enter the 4-digit verification code texted to your phone line:</p>
                      <input type="text" maxLength="4" placeholder="Enter Deactivation OTP" value={deactivateOtpInput} onChange={(e) => setDeactivateOtpInput(e.target.value.replace(/\D/g, ''))} required />
                      <div className="action-btn-group">
                        <button type="submit" className="confirm-deactivate-btn" disabled={loading}>Confirm Deactivate</button>
                        <button type="button" className="cancel-btn" onClick={() => setIsDeactivatingSeller(false)}>Cancel</button>
                      </div>
                    </form>
                  )}
                </div>
              </div>

              {/* RIGHT SIDE COLUMN: Amazon Delivery Address Selector System */}
              <div className="profile-right-column address-management-section" style={{ flex: '1 1 400px', minWidth: '320px', textAlign: 'left', borderLeft: '1px solid #e7e7e7', paddingLeft: '40px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '15px', color: '#111' }}>
                  All addresses ({addresses.length})
                </h3>

                {/* Dynamic Address Modification Forms */}
                {(isAddingNew || editingAddressId) && (
                  <form onSubmit={handleSaveAddressSubmit} style={{ marginBottom: '20px', background: '#f7f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #d5d9d9' }}>
                    <h4 style={{ margin: '0 0 10px 0' }}>{editingAddressId ? 'Update Address Details' : 'Enter New Shipping Destination'}</h4>
                    <input type="text" placeholder="Full Name" value={addressForm.name} onChange={e => setAddressForm({ ...addressForm, name: e.target.value })} style={{ width: '100%', padding: '6px', marginBottom: '8px' }} required />
                    <input type="text" placeholder="Street Address" value={addressForm.street} onChange={e => setAddressForm({ ...addressForm, street: e.target.value })} style={{ width: '100%', padding: '6px', marginBottom: '8px' }} required />
                    <input type="text" placeholder="City, State, Zipcode" value={addressForm.cityStateZip} onChange={e => setAddressForm({ ...addressForm, cityStateZip: e.target.value })} style={{ width: '100%', padding: '6px', marginBottom: '8px' }} required />
                    <input type="text" placeholder="Country" value={addressForm.country} onChange={e => setAddressForm({ ...addressForm, country: e.target.value })} style={{ width: '100%', padding: '6px', marginBottom: '8px' }} required />
                    <input type="text" placeholder="Phone Number" value={addressForm.phone} onChange={e => setAddressForm({ ...addressForm, phone: e.target.value })} style={{ width: '100%', padding: '6px', marginBottom: '10px' }} required />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="submit" style={{ padding: '6px 12px', background: '#ffd814', border: '1px solid #fcd200', borderRadius: '4px', cursor: 'pointer' }} disabled={loading}>Save</button>
                      <button type="button" onClick={() => { setIsAddingNew(false); setEditingAddressId(null); }} style={{ padding: '6px 12px', background: '#fff', border: '1px solid #a8acac', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                    </div>
                  </form>
                )}

                {/* Address Array Mapping Selector Rendering Block */}
                <div className="address-list-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {addresses.map((addr) => {
                    const targetId = addr._id;
                    const isSelected = selectedAddressId === targetId;

                    return (
                      <div
                        key={targetId}
                        onClick={() => handleSelectActiveAddressId(targetId)}
                        style={{
                          padding: '16px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          border: '1px solid #d5d9d9',
                          backgroundColor: isSelected ? '#f7f9fa' : '#ffffff',
                          transition: 'background-color 0.2s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                          <div style={{ paddingTop: '2px' }}>
                            <input
                              type="radio"
                              name="delivery_address_selection"
                              checked={isSelected}
                              onChange={() => handleSelectActiveAddressId(targetId)}
                              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                          </div>

                          <div style={{ fontSize: '14px', lineHeight: '1.4', color: '#111', flex: 1 }}>
                            <p style={{ fontWeight: '700', margin: '0 0 4px 0' }}>{addr.name}</p>
                            <p style={{ margin: '0 0 2px 0' }}>{addr.street}</p>
                            <p style={{ margin: '0 0 4px 0' }}>{addr.cityStateZip}, {addr.country}</p>
                            <p style={{ margin: '0', color: '#565959' }}>Phone number: {addr.phone}</p>
                          </div>
                        </div>

                        {/* 🔴 Inline Edit button displays ONLY inside the active selected address element */}
                        {isSelected && (
                          <div style={{ marginTop: '14px', paddingLeft: '30px' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                triggerEditMode(addr);
                              }}
                              style={{
                                width: '100%',
                                padding: '8px 16px',
                                backgroundColor: '#ffffff',
                                border: '1px solid #a8acac',
                                borderRadius: '20px',
                                fontSize: '13px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                boxShadow: '0 2px 5px rgba(213,217,217,.5)',
                                marginBottom: '10px'
                              }}
                            >
                              Edit address
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation(); // Stops interaction from re-triggering radio selectors
                                handleDeleteAddress(targetId);
                              }}
                              className="amazon-pill-btn"
                              style={{
                                flex: 1,
                                backgroundColor: '#fff',
                                borderColor: '#cc0000',
                                color: '#cc0000'
                              }}
                            >
                              Delete
                            </button>

                            {/* <span
                              onClick={(e) => e.stopPropagation()}
                              style={{ color: '#007185', fontSize: '13px', cursor: 'pointer', display: 'block' }}
                            >
                              Add delivery instructions
                            </span> */}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Add New Base Action button template segment */}
                <div style={{ marginTop: '20px', borderTop: '1px solid #e7e7e7', paddingTop: '20px' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '10px' }}>Add delivery address</h4>
                  <button
                    onClick={triggerAddNewMode}
                    style={{
                      width: '100%',
                      padding: '8px 16px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #a8acac',
                      borderRadius: '20px',
                      fontSize: '13px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      boxShadow: '0 2px 5px rgba(213,217,217,.5)'
                    }}
                  >
                    Add a new delivery address
                  </button>
                </div>
              </div>

            </div>
          )}

        <button
          className="profile-logout-btn"
          style={{ marginTop: '30px' }}
          onClick={() => {
            logout();
            navigate('/');
          }}
        >
          Logout of Account
        </button>
      </div>
    </div>
  );
}

export default Profile;