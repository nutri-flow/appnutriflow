import { useEffect, useRef, useState } from 'react';

export default function GoogleSignIn({ onSuccess, onError, isLoading, className = 'w-full h-12 text-sm font-medium mb-6' }) {
  const containerRef = useRef(null);
  const initializedRef = useRef(false);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const isLoadingRef = useRef(isLoading);
  const [loadingGoogle, setLoadingGoogle] = useState(true);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
    isLoadingRef.current = isLoading;
  }, [onSuccess, onError, isLoading]);

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
      if (containerRef.current.querySelector('iframe')) return true;

      try {
        if (!initializedRef.current) {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: async (response) => {
              try {
                if (isLoadingRef.current) return;
                await onSuccessRef.current(response.credential);
              } catch (err) {
                console.error('Google Sign-In error:', err);
                onErrorRef.current?.(err.message || 'Google Sign-In failed');
              }
            },
          });
          initializedRef.current = true;
        }

        const width = Math.max(containerRef.current.getBoundingClientRect().width || 320, 280);
        while (containerRef.current.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild);
        }
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

    checkGoogleLib = setInterval(() => {
      if (renderButton()) {
        clearInterval(checkGoogleLib);
      }
    }, 200);

    timeout = setTimeout(() => {
      clearInterval(checkGoogleLib);
      if (!cancelled) setLoadingGoogle(false);
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(checkGoogleLib);
      clearTimeout(timeout);
    };
  }, [googleClientId]);

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
