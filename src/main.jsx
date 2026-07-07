import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider } from './components/context/AuthContext.jsx'

// Initialize Facebook SDK Programmatically
const initFacebookSDK = () => {
  window.fbAsyncInit = function() {
    window.FB.init({
      appId      : import.meta.env.VITE_FACEBOOK_APP_ID,
      cookie     : true,
      xfbml      : true,
      version    : 'v18.0' // Use current stable Graph API version
    });
  };

  // Load the SDK asynchronously
  (function(d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) return;
    js = d.createElement(s); js.id = id;
    js.src = "https://connect.facebook.net/en_US/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
  }(document, 'script', 'facebook-jssdk'));
};

initFacebookSDK();




ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      {/* AuthProvider must enclose App to make values available down the tree */}
      <AuthProvider>
        <App />
      </AuthProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>,
)