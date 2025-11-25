import { useState, useEffect } from 'react';

declare global {
    interface Window {
        FB: any;
        fbAsyncInit: () => void;
    }
}

interface FacebookSDKHook {
    isSdkLoaded: boolean;
    login: (scopes?: string) => Promise<any>;
    logout: () => Promise<void>;
    getLoginStatus: () => Promise<any>;
}

export const useFacebookSDK = (): FacebookSDKHook => {
    const [isSdkLoaded, setIsSdkLoaded] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Check if SDK is already loaded
        if (window.FB) {
            setIsSdkLoaded(true);
            return;
        }

        // Initialize SDK when loaded
        window.fbAsyncInit = function () {
            window.FB.init({
                appId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID,
                cookie: true,
                xfbml: true,
                version: 'v18.0'
            });
            setIsSdkLoaded(true);
        };

        // Load SDK asynchronously
        (function (d, s, id) {
            var js, fjs = d.getElementsByTagName(s)[0];
            if (d.getElementById(id)) { return; }
            js = d.createElement(s) as HTMLScriptElement; js.id = id;
            js.src = "https://connect.facebook.net/en_US/sdk.js";
            fjs.parentNode?.insertBefore(js, fjs);
        }(document, 'script', 'facebook-jssdk'));
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
        login,
        logout,
        getLoginStatus
    };
};
