import { useEffect, useRef, useState } from 'react';

export default function GoogleSignIn({ onSuccess, onError, isLoading, className = 'w-full h-12 text-sm font-medium mb-6' }) {
  const containerRef = useRef(null);
  const initializedRef = useRef(false);
  const [loadingGoogle, setLoadingGoogle] = useState(true);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!googleClientId || googleClientId === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
      console.warn('Google Client ID not configured. Set VITE_GOOGLE_CLIENT_ID in .env.local');
      setLoadingGoogle(false);
      return;
    }

    let checkGoogleLib;
    let timeout;
    let cancelled = false;

    const renderButton = () => {
      if (!containerRef.current || !window.google?.accounts?.id) return false;

      const width = Math.max(Math.floor(containerRef.current.getBoundingClientRect().width || 320), 280);

      try {
        if (!initializedRef.current) {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: async (response) => {
              try {
                if (isLoading) return;
                await onSuccess(response.credential);
              } catch (err) {
                console.error('Google Sign-In error:', err);
                onError?.(err.message || 'Google Sign-In failed');
              }
            },
          });
          initializedRef.current = true;
        }

        containerRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: 'outline',
          size: 'large',
          width: String(Math.min(width, 400)),
          locale: 'pt-BR',
        });

        if (!cancelled) setLoadingGoogle(false);
        return true;
      } catch (err) {
        console.error('Failed to initialize Google Sign-In:', err);
        if (!cancelled) setLoadingGoogle(false);
        return false;
      }
    };

    if (renderButton()) {
      return () => {
        cancelled = true;
        clearInterval(checkGoogleLib);
        clearTimeout(timeout);
      };
    }

    checkGoogleLib = setInterval(() => {
      if (renderButton()) {
        clearInterval(checkGoogleLib);
      }
    }, 150);

    timeout = setTimeout(() => {
      clearInterval(checkGoogleLib);
      if (!cancelled) setLoadingGoogle(false);
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(checkGoogleLib);
      clearTimeout(timeout);
    };
  }, [googleClientId, isLoading, onError, onSuccess]);

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
