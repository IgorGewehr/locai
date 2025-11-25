import { useState, useEffect } from 'react';

declare global {
    interface Window {
        FB: any;
        fbAsyncInit: () => void;
    }
}

interface FacebookSDKHook {
    isSdkLoaded: boolean;
    error: string | null;
    login: (scopes?: string) => Promise<any>;
    logout: () => Promise<void>;
    getLoginStatus: () => Promise<any>;
}

// Get the App ID at module level (injected at build time)
const FACEBOOK_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;

export const useFacebookSDK = (): FacebookSDKHook => {
    const [isSdkLoaded, setIsSdkLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        console.log('[Facebook SDK] App ID available:', FACEBOOK_APP_ID);

        if (!FACEBOOK_APP_ID) {
            const msg = 'NEXT_PUBLIC_FACEBOOK_APP_ID is not set!';
            console.error('[Facebook SDK]', msg);
            setError(msg);
            return;
        }

        // Check if SDK is already loaded
        if (window.FB) {
            console.log('[Facebook SDK] Already loaded');
            setIsSdkLoaded(true);
            return;
        }

        console.log('[Facebook SDK] Starting to load...');

        // Timeout to detect loading failure
        const timeoutId = setTimeout(() => {
            if (!window.FB) {
                console.error('[Facebook SDK] Loading timed out');
                setError('Facebook SDK loading timed out. Check your connection or ad blocker.');
            }
        }, 10000); // 10 seconds timeout

        // Initialize SDK when loaded
        window.fbAsyncInit = function () {
            console.log('[Facebook SDK] Initializing with App ID:', FACEBOOK_APP_ID);

            window.FB.init({
                appId: FACEBOOK_APP_ID,
                cookie: true,
                xfbml: true,
                version: 'v18.0'
            });
            console.log('[Facebook SDK] Initialized successfully');
            setIsSdkLoaded(true);
            clearTimeout(timeoutId);
        };

        // Load SDK asynchronously
        const loadScript = () => {
            // Check if script already exists to avoid duplicates
            if (document.getElementById('facebook-jssdk')) {
                console.log('[Facebook SDK] Script tag already exists');
                // If script exists but window.FB is not ready, we might need to wait or it failed
                if (window.FB) {
                    setIsSdkLoaded(true);
                    clearTimeout(timeoutId);
                }
                return;
            }

            console.log('[Facebook SDK] Injecting script tag');
            const js = document.createElement('script');
            js.id = 'facebook-jssdk';
            js.src = "https://connect.facebook.net/en_US/sdk.js";
            js.onerror = () => {
                console.error('[Facebook SDK] Failed to load script');
                setError('Failed to load Facebook SDK script.');
                clearTimeout(timeoutId);
            };
            js.onload = () => {
                console.log('[Facebook SDK] Script loaded successfully');
            };

            const fjs = document.getElementsByTagName('script')[0];
            if (fjs && fjs.parentNode) {
                fjs.parentNode.insertBefore(js, fjs);
            } else {
                document.head.appendChild(js);
            }
        };

        loadScript();

        // Cleanup
        return () => {
            clearTimeout(timeoutId);
        };
    }, []);

    const login = (scopes: string = 'public_profile,email') => {
        return new Promise((resolve, reject) => {
            if (!window.FB) {
                reject(new Error('Facebook SDK not loaded'));
                return;
            }
            window.FB.login((response: any) => {
                if (response.authResponse) {
                    resolve(response.authResponse);
                } else {
                    reject(new Error('User cancelled login or did not fully authorize.'));
                }
            }, { scope: scopes });
        });
    };

    const logout = () => {
        return new Promise<void>((resolve) => {
            if (!window.FB) {
                resolve();
                return;
            }
            window.FB.logout(() => {
                resolve();
            });
        });
    };

    const getLoginStatus = () => {
        return new Promise((resolve) => {
            if (!window.FB) {
                resolve(null);
                return;
            }
            window.FB.getLoginStatus((response: any) => {
                resolve(response);
            });
        });
    };

    return {
        isSdkLoaded,
        error, // Export error state
        login,
        logout,
        getLoginStatus
    };
};
