import { useEffect, useRef, useState } from 'react';

export default function GoogleSignIn({ onSuccess, onError, isLoading, className = 'w-full h-12 text-sm font-medium mb-6' }) {
  const containerRef = useRef(null);
  const [loadingGoogle, setLoadingGoogle] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!googleClientId || googleClientId === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
      console.warn('Google Client ID not configured. Set VITE_GOOGLE_CLIENT_ID in .env.local');
      setLoadingGoogle(false);
      return;
    }

    // Check if Google library is loaded
    const checkGoogleLib = setInterval(() => {
      if (window.google && window.google.accounts && window.google.accounts.id) {
        clearInterval(checkGoogleLib);
        
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleCredentialResponse,
          });

          // Render the button if container exists
          if (containerRef.current && !initialized) {
            window.google.accounts.id.renderButton(containerRef.current, {
              theme: 'outline',
              size: 'large',
              width: '100%',
              locale: 'pt-BR',
            });
            setInitialized(true);
          }
          setLoadingGoogle(false);
        } catch (err) {
          console.error('Failed to initialize Google Sign-In:', err);
          setLoadingGoogle(false);
        }
      }
    }, 100);

    // Timeout after 5 seconds
    const timeout = setTimeout(() => {
      clearInterval(checkGoogleLib);
      setLoadingGoogle(false);
    }, 5000);

    return () => {
      clearInterval(checkGoogleLib);
      clearTimeout(timeout);
    };
  }, [googleClientId, initialized]);

  const handleCredentialResponse = async (response) => {
    try {
      if (isLoading) return;
      
      const idToken = response.credential;
      await onSuccess(idToken);
    } catch (err) {
      console.error('Google Sign-In error:', err);
      if (onError) {
        onError(err.message || 'Google Sign-In failed');
      }
    }
  };

  return (
    <>
      {!googleClientId || googleClientId === 'YOUR_GOOGLE_CLIENT_ID_HERE' ? (
        <div className="p-3 mb-6 rounded-lg bg-yellow-50 text-yellow-800 text-sm border border-yellow-200">
          ⚠️ Google Sign-In não configurado. Configure VITE_GOOGLE_CLIENT_ID em frontend/.env.local
        </div>
      ) : (
        <div 
          ref={containerRef} 
          style={{ 
            display: 'flex', 
            justifyContent: 'center',
            minHeight: loadingGoogle ? '48px' : 'auto',
            alignItems: 'center'
          }} 
          className={className}
        >
          {loadingGoogle && (
            <span className="text-sm text-muted-foreground">Carregando Google Sign-In...</span>
          )}
        </div>
      )}
    </>
  );
}
