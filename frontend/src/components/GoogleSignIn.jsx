import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import GoogleIcon from '@/components/GoogleIcon';

export default function GoogleSignIn({ onSuccess, onError, isLoading, className = 'w-full h-12 text-sm font-medium mb-6' }) {
  const containerRef = useRef(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!googleClientId) {
      console.warn('Google Client ID not configured. Set VITE_GOOGLE_CLIENT_ID in .env.local');
      return;
    }

    // Initialize Google Sign-In
    if (window.google && window.google.accounts && window.google.accounts.id) {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleCredentialResponse,
      });

      // Render the button if container exists
      if (containerRef.current) {
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: 'outline',
          size: 'large',
          width: '100%',
          locale: 'pt-BR',
        });
      }
    }
  }, [googleClientId]);

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

  // Fallback button if Google doesn't load
  return (
    <>
      <div ref={containerRef} style={{ display: 'flex', justifyContent: 'center' }} />
      
      {/* Show manual button as fallback or alternative */}
      <style>{`
        [data-testid="oauth_button"] {
          width: 100% !important;
        }
      `}</style>
    </>
  );
}
