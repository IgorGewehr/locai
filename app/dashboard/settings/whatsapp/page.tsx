'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Chip,
  Divider,
  Fade,
  Zoom,
  Card,
  CardContent,
  Container,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemAvatar,
  Avatar,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import {
  QrCode2,
  CheckCircle,
  Error,
  Refresh,
  PhoneAndroid,
  PowerSettingsNew,
  CameraAlt,
  PhonelinkRing,
  Business,
  Facebook,
  WhatsApp,
  Instagram,
  OpenInNew,
} from '@mui/icons-material';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/lib/hooks/useAuth';
import { useWhatsAppStatus } from '@/lib/hooks/useWhatsAppStatus';
import { useFacebookSDK } from '@/lib/hooks/useFacebookSDK';

interface WhatsAppStatus {
  connected: boolean;
  status: string;
  phoneNumber?: string | null;
  businessName?: string | null;
  qrCode?: string | null;
  mode?: 'business_api' | 'web';
}

interface FacebookStatus {
  connected: boolean;
  pageName?: string;
  pageId?: string;
}

interface InstagramStatus {
  connected: boolean;
  username?: string;
  businessAccountId?: string;
  facebookConnected?: boolean;
  canConnect?: boolean;
  authMethod?: 'facebook_page' | 'instagram_login';
  name?: string;
  profilePictureUrl?: string;
  accountType?: string;
}

interface InstagramAccount {
  id: string;
  username: string;
  name?: string;
  profilePictureUrl?: string;
  followersCount?: number;
  pageId: string;
  pageName?: string;
}

interface OAuthFacebookPage {
  id: string;
  name: string;
  category?: string;
  hasInstagram?: boolean;
  instagramUsername?: string;
  instagramName?: string;
  access_token?: string;
}

interface WABA {
  id: string;
  name: string;
  phone_numbers: {
    id: string;
    display_phone_number: string;
    verified_name: string;
    quality_rating: string;
  }[];
}

export default function WhatsAppPage() {
  const { tenantId } = useTenant();
  const { getFirebaseToken } = useAuth();
  const { clearCache, refreshStatus: refreshGlobalStatus } = useWhatsAppStatus();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState<WhatsAppStatus>({ connected: false, status: 'disconnected' });
  const [facebookStatus, setFacebookStatus] = useState<FacebookStatus>({ connected: false });
  const [instagramStatus, setInstagramStatus] = useState<InstagramStatus>({ connected: false });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Connection Mode State
  const [connectionMode, setConnectionMode] = useState<'web' | 'business_api'>('web');

  // Official API Selection State
  const [showWabaSelection, setShowWabaSelection] = useState(false);
  const [availableWabas, setAvailableWabas] = useState<WABA[]>([]);
  const [selectedWabaId, setSelectedWabaId] = useState<string>('');
  const [selectedPhoneNumberId, setSelectedPhoneNumberId] = useState<string>('');
  const [userToken, setUserToken] = useState<string>('');

  // Page Selection State (Facebook)
  const [showPageSelection, setShowPageSelection] = useState(false);
  const [availablePages, setAvailablePages] = useState<any[]>([]);
  const [selectedPage, setSelectedPage] = useState<string>('');

  // OAuth Flow State
  const [oauthPagesToken, setOauthPagesToken] = useState<string | null>(null);
  const [oauthPages, setOauthPages] = useState<OAuthFacebookPage[]>([]);
  const [selectedOAuthPage, setSelectedOAuthPage] = useState<string>('');
  const [processingOAuth, setProcessingOAuth] = useState(false);

  // Instagram Selection State
  const [showInstagramSelection, setShowInstagramSelection] = useState(false);
  const [availableInstagramAccounts, setAvailableInstagramAccounts] = useState<InstagramAccount[]>([]);
  const [connectingInstagram, setConnectingInstagram] = useState(false);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);
  const qrCodeRef = useRef<HTMLDivElement>(null);
  const isConnectingRef = useRef(false); // Prevent multiple POST calls

  const { login, isSdkLoaded, error: sdkError } = useFacebookSDK();

  useEffect(() => {
    if (sdkError) {
      console.error('[Settings] Facebook SDK Error:', sdkError);
      setError(sdkError);
    }
  }, [sdkError]);

  // Process OAuth callback from Facebook or Instagram
  useEffect(() => {
    const oauth = searchParams.get('oauth');
    const pagesToken = searchParams.get('pagesToken');
    const oauthError = searchParams.get('error');
    const success = searchParams.get('success');
    const username = searchParams.get('username');

    // Clear URL params to avoid reprocessing on refresh
    const clearUrlParams = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete('oauth');
      url.searchParams.delete('pagesToken');
      url.searchParams.delete('pageCount');
      url.searchParams.delete('error');
      url.searchParams.delete('success');
      url.searchParams.delete('username');
      window.history.replaceState({}, '', url.toString());
    };

    if (oauth === 'facebook') {
      clearUrlParams();

      if (oauthError) {
        setError(`Erro ao conectar Facebook: ${oauthError}`);
        return;
      }

      if (success === 'true' && pagesToken) {
        // Successfully got pages from OAuth - fetch and show selection
        setOauthPagesToken(pagesToken);
        fetchPagesFromOAuthToken(pagesToken);
      }
    }

    if (oauth === 'instagram') {
      clearUrlParams();

      if (oauthError) {
        setError(`Erro ao conectar Instagram: ${oauthError}`);
        return;
      }

      if (success === 'true') {
        // Instagram connected successfully via OAuth
        setSuccessMessage(`Instagram @${username || ''} conectado com sucesso!`);
        loadInstagramStatus();
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    }
  }, [searchParams]);

  // Fetch pages from OAuth token
  const fetchPagesFromOAuthToken = async (pagesToken: string) => {
    setProcessingOAuth(true);
    try {
      const firebaseToken = await getFirebaseToken();
      const response = await fetch('/api/facebook/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${firebaseToken}`,
        },
        body: JSON.stringify({ pagesToken }),
      });

      const result = await response.json();

      if (response.ok && result.success && result.pages) {
        setOauthPages(result.pages);
        setShowPageSelection(true);
      } else {
        setError(result.error || 'Falha ao processar autorização do Facebook');
      }
    } catch (err) {
      console.error('Error fetching pages from OAuth token:', err);
      setError('Erro ao processar autorização do Facebook');
    } finally {
      setProcessingOAuth(false);
    }
  };

  useEffect(() => {
    loadStatus();
    loadFacebookStatus();
    loadInstagramStatus();

    // Start polling based on status
    startPolling();

    return () => {
      stopPolling();
    };
  }, [tenantId, status.status]);

  // Update connection mode based on status
  useEffect(() => {
    if (status.mode) {
      setConnectionMode(status.mode);
    }
  }, [status.mode]);

  const startPolling = () => {
    // Clear existing interval
    stopPolling();

    // Only poll if in web mode or disconnected
    if (status.mode === 'business_api' && status.connected) {
      return;
    }

    // Determine polling interval based on status
    const getPollingInterval = () => {
      if (status.status === 'qr' || status.status === 'qr_ready' || status.status === 'initializing' || status.status === 'connecting') {
        return 2000; // 2 seconds - check frequently when waiting for QR or connection
      }
      if (status.connected) {
        return 30000; // 30 seconds - slow polling when connected
      }
      return 10000; // 10 seconds - moderate polling when disconnected
    };

    const interval = getPollingInterval();
    pollingIntervalRef.current = setInterval(loadStatus, interval);
    isPollingRef.current = true;
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      isPollingRef.current = false;
    }
  };

  const loadStatus = async () => {
    if (!tenantId) return;

    try {
      const token = await getFirebaseToken();
      const response = await fetch(`/api/whatsapp/session`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const newStatus = {
            connected: result.data.connected || false,
            status: result.data.status || 'disconnected',
            phoneNumber: result.data.phoneNumber,
            businessName: result.data.businessName,
            qrCode: result.data.qrCode,
            mode: result.data.mode || 'web',
          };

          setStatus(newStatus);

          // Log QR code status
          if (newStatus.qrCode && newStatus.mode === 'web') {
            // Auto-scroll to QR code when it appears
            setTimeout(() => {
              qrCodeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
          }

          // Clear error and update global status if connected
          if (newStatus.connected) {
            setError(null);
            setConnecting(false);
            // Clear cache and refresh global status
            clearCache();
            refreshGlobalStatus();
          }

          // Update global status when QR is ready
          if (newStatus.qrCode && !status.qrCode) {
            clearCache();
            refreshGlobalStatus();
          }
        }
      }
    } catch (err) {
      console.error('[WhatsApp Settings] Error loading status:', err);
    }
  };

  const loadFacebookStatus = async () => {
    if (!tenantId) return;

    try {
      const token = await getFirebaseToken();
      const response = await fetch(`/api/facebook/status?tenantId=${tenantId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setFacebookStatus(result.data);
        }
      }
    } catch (err) {
      console.error('[Settings] Error loading Facebook status:', err);
    }
  };

  const loadInstagramStatus = async () => {
    if (!tenantId) return;

    try {
      const token = await getFirebaseToken();
      const response = await fetch('/api/instagram/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setInstagramStatus(result.data);
        }
      }
    } catch (err) {
      console.error('[Settings] Error loading Instagram status:', err);
    }
  };

  // --- Official API Handlers ---

  const handleOfficialConnect = async () => {
    if (!isSdkLoaded) {
      alert('Facebook SDK not loaded yet. Please try again in a moment.');
      return;
    }

    try {
      // Request permissions for WhatsApp Business Management
      const authResponse = await login('whatsapp_business_management,whatsapp_business_messaging');

      if (authResponse && authResponse.accessToken) {
        setConnecting(true);
        const firebaseToken = await getFirebaseToken();

        // Exchange token and fetch WABAs
        const response = await fetch('/api/whatsapp/official/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${firebaseToken}`,
          },
          body: JSON.stringify({
            tenantId,
            userAccessToken: authResponse.accessToken,
          }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          if (result.wabas && result.wabas.length > 0) {
            setAvailableWabas(result.wabas);
            setUserToken(result.userToken); // Store long-lived token temporarily
            setShowWabaSelection(true);
          } else {
            alert('Nenhuma conta do WhatsApp Business encontrada. Certifique-se de ter criado uma conta no Gerenciador de Negócios do Facebook.');
          }
        } else {
          alert('Falha ao conectar com Facebook: ' + (result.error || 'Erro desconhecido'));
        }
      }
    } catch (err) {
      console.error('Error connecting Official WhatsApp:', err);
      alert('Erro ao conectar: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setConnecting(false);
    }
  };

  const confirmWabaSelection = async () => {
    if (!selectedWabaId || !selectedPhoneNumberId) return;

    const waba = availableWabas.find(w => w.id === selectedWabaId);
    const phone = waba?.phone_numbers.find(p => p.id === selectedPhoneNumberId);

    if (!waba || !phone) return;

    setConnecting(true);
    try {
      const firebaseToken = await getFirebaseToken();
      const response = await fetch('/api/whatsapp/official/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${firebaseToken}`,
        },
        body: JSON.stringify({
          tenantId,
          wabaId: selectedWabaId,
          phoneNumberId: selectedPhoneNumberId,
          accessToken: userToken, // Use the long-lived token we got earlier
          businessName: phone.verified_name || waba.name,
        }),
      });

      if (response.ok) {
        await loadStatus();
        setShowWabaSelection(false);
        alert('WhatsApp Oficial conectado com sucesso!');
      } else {
        alert('Falha ao salvar configurações do WhatsApp');
      }
    } catch (err) {
      console.error('Error saving WhatsApp settings:', err);
      alert('Erro ao salvar configurações');
    } finally {
      setConnecting(false);
    }
  };

  // --- Facebook Page Handlers ---

  // Handler for connecting Facebook using test token (for app review/demo)
  const handleFacebookConnectWithTestToken = async () => {
    setConnecting(true);
    try {
      const firebaseToken = await getFirebaseToken();

      // Fetch pages using the test token configured in the server
      const response = await fetch('/api/facebook/pages', {
        headers: {
          'Authorization': `Bearer ${firebaseToken}`,
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        if (result.pages && result.pages.length > 0) {
          setAvailablePages(result.pages);
          setShowPageSelection(true);
        } else {
          alert('Nenhuma página do Facebook encontrada. Verifique se o token tem as permissões corretas.');
        }
      } else {
        alert('Falha ao buscar páginas: ' + (result.error || 'Erro desconhecido'));
      }
    } catch (err) {
      console.error('Error fetching Facebook pages:', err);
      alert('Erro ao conectar com Facebook: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setConnecting(false);
    }
  };

  // Handler for connecting Facebook via OAuth flow (production)
  const handleFacebookConnectOAuth = async () => {
    setConnecting(true);
    try {
      const firebaseToken = await getFirebaseToken();

      // Get OAuth URL from server
      const response = await fetch('/api/facebook/oauth/start', {
        headers: {
          'Authorization': `Bearer ${firebaseToken}`,
        },
      });

      const result = await response.json();

      if (response.ok && result.success && result.authUrl) {
        // Redirect to Facebook OAuth
        window.location.href = result.authUrl;
      } else {
        setError(result.error || 'Falha ao iniciar conexão com Facebook');
        setConnecting(false);
      }
    } catch (err) {
      console.error('Error starting Facebook OAuth:', err);
      setError('Erro ao conectar com Facebook');
      setConnecting(false);
    }
  };

  // Confirm page selection from OAuth flow
  const confirmOAuthPageSelection = async () => {
    if (!selectedOAuthPage || !oauthPagesToken) return;

    setProcessingOAuth(true);
    try {
      const firebaseToken = await getFirebaseToken();
      const response = await fetch('/api/facebook/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${firebaseToken}`,
        },
        body: JSON.stringify({
          pagesToken: oauthPagesToken,
          selectedPageId: selectedOAuthPage,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        await loadFacebookStatus();
        await loadInstagramStatus();
        setShowPageSelection(false);
        setOauthPages([]);
        setOauthPagesToken(null);
        setSelectedOAuthPage('');

        const message = result.page?.hasInstagram
          ? `Facebook e Instagram (@${result.page.instagramUsername}) conectados com sucesso!`
          : 'Facebook conectado com sucesso!';
        setSuccessMessage(message);

        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        setError(result.error || 'Falha ao conectar página');
      }
    } catch (err) {
      console.error('Error confirming OAuth page:', err);
      setError('Erro ao conectar página do Facebook');
    } finally {
      setProcessingOAuth(false);
    }
  };

  const handleFacebookConnect = async () => {
    if (!isSdkLoaded) {
      alert('Facebook SDK not loaded yet. Please try again in a moment.');
      return;
    }

    try {
      // Facebook/Instagram permissions (Updated 2025)
      // Required for Messenger + Instagram Direct:
      // - pages_messaging: Send/receive messages on Facebook Pages
      // - pages_show_list: List user's Facebook Pages
      // - pages_manage_metadata: Manage page metadata
      // - instagram_basic: Basic Instagram account info
      // - instagram_manage_messages: Send/receive Instagram Direct messages
      // - instagram_manage_comments: Manage Instagram comments (optional)
      const authResponse = await login('pages_messaging,pages_show_list,pages_manage_metadata,instagram_basic,instagram_manage_messages,instagram_manage_comments');

      if (authResponse && authResponse.accessToken) {
        // Exchange token and fetch pages
        const firebaseToken = await getFirebaseToken();
        const response = await fetch('/api/facebook/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${firebaseToken}`,
          },
          body: JSON.stringify({
            tenantId,
            userAccessToken: authResponse.accessToken,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.pages && result.pages.length > 0) {
            setAvailablePages(result.pages);
            setShowPageSelection(true);
          } else {
            alert('No Facebook Pages found for this account.');
          }
        } else {
          alert('Failed to connect Facebook');
        }
      }
    } catch (err) {
      console.error('Error connecting Facebook:', err);
      alert('Error connecting Facebook: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const confirmPageSelection = async () => {
    if (!selectedPage) return;

    const page = availablePages.find(p => p.id === selectedPage);
    if (!page) return;

    try {
      const firebaseToken = await getFirebaseToken();
      const response = await fetch('/api/facebook/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${firebaseToken}`,
        },
        body: JSON.stringify({
          tenantId,
          pageId: page.id,
          pageAccessToken: page.access_token,
          pageName: page.name,
        }),
      });

      if (response.ok) {
        await loadFacebookStatus();
        await loadInstagramStatus();
        setShowPageSelection(false);
        alert('Facebook conectado com sucesso! Agora você pode conectar o Instagram.');
      } else {
        alert('Falha ao salvar configurações do Facebook');
      }
    } catch (err) {
      console.error('Error saving Facebook page:', err);
      alert('Erro ao salvar página do Facebook');
    }
  };

  const handleFacebookDisconnect = async () => {
    if (!confirm('Tem certeza que deseja desconectar o Facebook? Isso também desconectará o Instagram.')) return;

    try {
      const firebaseToken = await getFirebaseToken();

      // Disconnect Facebook
      const response = await fetch(`/api/facebook/auth?tenantId=${tenantId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${firebaseToken}`,
        },
      });

      // Also disconnect Instagram if connected
      if (instagramStatus.connected) {
        await fetch('/api/instagram/auth', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${firebaseToken}`,
          },
        });
      }

      if (response.ok) {
        await loadFacebookStatus();
        await loadInstagramStatus();
      } else {
        alert('Falha ao desconectar Facebook');
      }
    } catch (err) {
      console.error('Error disconnecting Facebook:', err);
      alert('Erro ao desconectar Facebook');
    }
  };

  // --- Instagram Handlers ---

  // Handler for connecting Instagram via OAuth (Instagram Direct Login - 2024+)
  const handleInstagramConnectOAuth = async () => {
    setConnectingInstagram(true);
    try {
      const firebaseToken = await getFirebaseToken();

      // Get OAuth URL from server
      const response = await fetch('/api/instagram/oauth/start', {
        headers: {
          'Authorization': `Bearer ${firebaseToken}`,
        },
      });

      const result = await response.json();

      if (response.ok && result.success && result.authUrl) {
        // Redirect to Instagram OAuth
        window.location.href = result.authUrl;
      } else {
        setError(result.error || 'Falha ao iniciar conexão com Instagram');
        setConnectingInstagram(false);
      }
    } catch (err) {
      console.error('Error starting Instagram OAuth:', err);
      setError('Erro ao conectar com Instagram');
      setConnectingInstagram(false);
    }
  };

  // Handler for connecting Instagram via Facebook Page (legacy method)
  const handleInstagramConnectViaFacebook = async () => {
    if (!facebookStatus.connected) {
      alert('Conecte o Facebook primeiro para usar este método.');
      return;
    }

    setConnectingInstagram(true);
    try {
      const firebaseToken = await getFirebaseToken();

      // Fetch Instagram accounts connected to the Facebook page
      const response = await fetch('/api/instagram/accounts', {
        headers: {
          'Authorization': `Bearer ${firebaseToken}`,
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        if (result.hasInstagram && result.accounts.length > 0) {
          setAvailableInstagramAccounts(result.accounts);
          setShowInstagramSelection(true);
        } else {
          alert('Nenhuma conta do Instagram Business encontrada conectada à sua página do Facebook.');
        }
      } else {
        alert('Falha ao buscar contas do Instagram: ' + (result.error || 'Erro desconhecido'));
      }
    } catch (err) {
      console.error('Error fetching Instagram accounts:', err);
      alert('Erro ao conectar com Instagram');
    } finally {
      setConnectingInstagram(false);
    }
  };

  // Legacy handler - kept for compatibility
  const handleInstagramConnect = handleInstagramConnectViaFacebook;

  const confirmInstagramSelection = async (account: InstagramAccount) => {
    try {
      const firebaseToken = await getFirebaseToken();

      const response = await fetch('/api/instagram/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${firebaseToken}`,
        },
        body: JSON.stringify({
          businessAccountId: account.id,
          username: account.username,
          pageId: account.pageId,
        }),
      });

      if (response.ok) {
        await loadInstagramStatus();
        setShowInstagramSelection(false);
        alert(`Instagram @${account.username} conectado com sucesso!`);
      } else {
        alert('Falha ao conectar Instagram');
      }
    } catch (err) {
      console.error('Error connecting Instagram:', err);
      alert('Erro ao conectar Instagram');
    }
  };

  const handleInstagramDisconnect = async () => {
    if (!confirm('Tem certeza que deseja desconectar o Instagram?')) return;

    try {
      const firebaseToken = await getFirebaseToken();
      const response = await fetch('/api/instagram/auth', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${firebaseToken}`,
        },
      });

      if (response.ok) {
        await loadInstagramStatus();
      } else {
        alert('Falha ao desconectar Instagram');
      }
    } catch (err) {
      console.error('Error disconnecting Instagram:', err);
      alert('Erro ao desconectar Instagram');
    }
  };

  // --- WhatsApp Web (Baileys) Handlers ---

  const checkExistingSession = async () => {
    try {
      const token = await getFirebaseToken();

      const response = await fetch(`/api/whatsapp/session`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        return result.data;
      }
      return null;
    } catch (err) {
      console.error('[WhatsApp Settings] Error checking session:', err);
      return null;
    }
  };

  const handleConnect = async () => {
    // Prevent multiple simultaneous calls
    if (isConnectingRef.current) {
      return;
    }

    isConnectingRef.current = true;
    setConnecting(true);
    setError(null);

    try {
      // First check if session already exists
      const existingSession = await checkExistingSession();

      if (existingSession) {
        // If already connected
        if (existingSession.connected) {
          setStatus({
            connected: true,
            status: 'connected',
            phoneNumber: existingSession.phoneNumber,
            businessName: existingSession.businessName,
            qrCode: null,
            mode: existingSession.mode || 'web',
          });
          setConnecting(false);
          isConnectingRef.current = false;
          clearCache();
          refreshGlobalStatus();
          return;
        }

        // If QR already exists
        if (existingSession.qrCode) {
          setStatus({
            connected: false,
            status: 'qr',
            phoneNumber: null,
            businessName: null,
            qrCode: existingSession.qrCode,
            mode: 'web',
          });
          setConnecting(false);
          isConnectingRef.current = false;
          startPolling();
          clearCache();
          refreshGlobalStatus();
          return;
        }

        // If already initializing
        if (existingSession.status === 'initializing' || existingSession.status === 'connecting') {
          setStatus({
            connected: false,
            status: 'initializing',
            phoneNumber: null,
            businessName: null,
            qrCode: null,
            mode: 'web',
          });
          setConnecting(false);
          isConnectingRef.current = false;
          startPolling();
          return;
        }
      }

      // No existing session, create new one
      const token = await getFirebaseToken();

      const response = await fetch(`/api/whatsapp/session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // Handle rate limiting gracefully (don't show error)
      if (response.status === 429) {
        const result = await response.json();
        const retryAfter = result.data?.retryAfter || 10;

        // Don't show error to user, just start polling
        setError(null);
        setStatus({
          connected: false,
          status: 'initializing',
          phoneNumber: null,
          businessName: null,
          qrCode: null,
          mode: 'web',
        });
        setConnecting(false);
        isConnectingRef.current = false;
        startPolling();
        return;
      }

      const result = await response.json();

      if (result.success) {
        // Always set initializing status and start aggressive polling
        setStatus({
          connected: false,
          status: 'initializing',
          phoneNumber: null,
          businessName: null,
          qrCode: result.data?.qrCode || null,
          mode: 'web',
        });

        // Force restart polling with aggressive interval
        startPolling();
      } else {
        setError(result.error || result.data?.message || 'Erro ao conectar WhatsApp');
        setConnecting(false);
        isConnectingRef.current = false;
      }
    } catch (err) {
      console.error('[WhatsApp Settings] Error connecting:', err);
      setError('Erro ao conectar WhatsApp');
      setConnecting(false);
      isConnectingRef.current = false;
    } finally {
      // Always reset connecting ref after attempt
      setTimeout(() => {
        isConnectingRef.current = false;
      }, 2000);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await getFirebaseToken();
      const response = await fetch(`/api/whatsapp/session`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        setStatus({ connected: false, status: 'disconnected', mode: 'web' });
        setConnectionMode('web'); // Reset to default
      } else {
        setError('Erro ao desconectar WhatsApp');
      }
    } catch (err) {
      console.error('Error disconnecting WhatsApp:', err);
      setError('Erro ao desconectar WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = () => {
    if (status.connected) return 'success';
    if (status.status === 'initializing' || status.status === 'qr_ready') return 'warning';
    return 'error';
  };

  const getStatusLabel = () => {
    if (status.connected) return status.mode === 'business_api' ? 'Conectado (API Oficial)' : 'Conectado (Web)';
    if (status.status === 'initializing') return 'Inicializando...';
    if (status.status === 'qr_ready') return 'Aguardando QR Code';
    return 'Desconectado';
  };

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Conexão WhatsApp
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure e gerencie a conexão do WhatsApp com o sistema
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {processingOAuth && (
        <Alert severity="info" sx={{ mb: 3 }} icon={<CircularProgress size={20} />}>
          Processando autorização do Facebook...
        </Alert>
      )}

      {/* Connection Status */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <PhoneAndroid sx={{ color: 'primary.main' }} />
            <Typography variant="h6" fontWeight={600}>
              Status da Conexão
            </Typography>
          </Box>

          <Chip
            icon={status.connected ? <CheckCircle /> : <Error />}
            label={getStatusLabel()}
            color={getStatusColor()}
            size="small"
          />
        </Box>

        {status.connected && status.phoneNumber && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Número: <strong>{status.phoneNumber}</strong>
            </Typography>
            {status.businessName && (
              <Typography variant="body2" color="text.secondary">
                Nome: <strong>{status.businessName}</strong>
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              Tipo: <strong>{status.mode === 'business_api' ? 'API Oficial (Meta)' : 'WhatsApp Web (QR Code)'}</strong>
            </Typography>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {!status.connected ? (
          <Box>
            <Tabs
              value={connectionMode}
              onChange={(_, val) => setConnectionMode(val)}
              sx={{ mb: 3 }}
            >
              <Tab label="WhatsApp Web (QR Code)" value="web" />
              <Tab label="API Oficial (Meta)" value="business_api" />
            </Tabs>

            {connectionMode === 'web' ? (
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleConnect}
                  disabled={connecting || status.status === 'initializing'}
                  startIcon={connecting ? <CircularProgress size={20} /> : <QrCode2 />}
                >
                  {connecting || status.status === 'initializing' ? 'Gerar QR Code' : 'Conectar via QR Code'}
                </Button>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  A API Oficial oferece maior estabilidade e não requer um celular conectado o tempo todo.
                  Requer uma conta do Facebook Business.
                </Alert>
                <Button
                  variant="contained"
                  onClick={handleOfficialConnect}
                  disabled={connecting}
                  startIcon={connecting ? <CircularProgress size={20} /> : <Facebook />}
                  sx={{ bgcolor: '#1877F2', '&:hover': { bgcolor: '#166fe5' }, alignSelf: 'flex-start' }}
                >
                  {connecting ? 'Conectando...' : 'Conectar com Facebook'}
                </Button>
              </Box>
            )}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={handleDisconnect}
              disabled={loading}
              color="error"
              startIcon={<PowerSettingsNew />}
            >
              Desconectar
            </Button>
            {status.mode === 'web' && (
              <Button
                variant="outlined"
                onClick={loadStatus}
                startIcon={<Refresh />}
              >
                Atualizar Status
              </Button>
            )}
          </Box>
        )}
      </Paper>

      {/* QR Code Section - Only show if mode is web and disconnected */}
      {
        !status.connected && connectionMode === 'web' && (
          <Zoom in={status.status === 'qr' || status.status === 'qr_ready' || connecting} timeout={500}>
            <Box ref={qrCodeRef}>
              {status.qrCode ? (
                <Card
                  sx={{
                    background: 'linear-gradient(135deg, rgba(37, 211, 102, 0.05), rgba(37, 211, 102, 0.01))',
                    border: '2px solid',
                    borderColor: 'success.main',
                    borderRadius: 3,
                    overflow: 'hidden',
                    boxShadow: `0 0 40px ${alpha('#25D366', 0.2)}`,
                  }}
                >
                  <CardContent sx={{ p: 4 }}>
                    {/* Header */}
                    <Box sx={{ textAlign: 'center', mb: 3 }}>
                      <Zoom in timeout={300}>
                        <CameraAlt
                          sx={{
                            fontSize: 48,
                            color: 'success.main',
                            mb: 2,
                            animation: 'pulse 2s infinite',
                            '@keyframes pulse': {
                              '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                              '50%': { opacity: 0.7, transform: 'scale(1.05)' }
                            }
                          }}
                        />
                      </Zoom>
                      <Typography variant="h5" fontWeight={700} gutterBottom>
                        Escaneie o QR Code
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Use a câmera do seu celular para conectar
                      </Typography>
                    </Box>

                    {/* QR Code Display - Centered and Prominent */}
                    <Fade in timeout={800}>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          my: 4,
                        }}
                      >
                        <Box
                          sx={{
                            p: 3,
                            bgcolor: 'white',
                            borderRadius: 4,
                            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                            border: '8px solid',
                            borderColor: alpha('#25D366', 0.2),
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              transform: 'scale(1.02)',
                              boxShadow: '0 12px 48px rgba(0,0,0,0.16)',
                            }
                          }}
                        >
                          <Box
                            component="img"
                            src={status.qrCode}
                            alt="WhatsApp QR Code"
                            sx={{
                              width: { xs: 280, sm: 320, md: 360 },
                              height: { xs: 280, sm: 320, md: 360 },
                              display: 'block',
                            }}
                          />
                        </Box>
                      </Box>
                    </Fade>

                    {/* Instructions */}
                    <Box
                      sx={{
                        mt: 3,
                        p: 3,
                        bgcolor: alpha('#25D366', 0.05),
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: alpha('#25D366', 0.2),
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <PhonelinkRing sx={{ mr: 1, color: 'success.main' }} />
                        <Typography variant="subtitle2" fontWeight={600}>
                          Como conectar:
                        </Typography>
                      </Box>

                      <Box component="ol" sx={{ m: 0, pl: 3 }}>
                        <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                          Abra o <strong>WhatsApp</strong> no seu celular
                        </Typography>
                        <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                          Toque em <strong>Menu (⋮)</strong> → <strong>Dispositivos conectados</strong>
                        </Typography>
                        <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                          Toque em <strong>Conectar um dispositivo</strong>
                        </Typography>
                        <Typography component="li" variant="body2">
                          Aponte a câmera para este QR Code
                        </Typography>
                      </Box>
                    </Box>

                    {/* Status Badge */}
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                      <Chip
                        icon={<QrCode2 />}
                        label="Aguardando conexão..."
                        color="success"
                        variant="outlined"
                        sx={{
                          animation: 'pulse 2s infinite',
                          borderWidth: 2,
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              ) : (
                <Paper sx={{ p: 4 }}>
                  {(connecting || status.status === 'initializing') && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6 }}>
                      <Box sx={{ position: 'relative', mb: 3 }}>
                        <CircularProgress
                          size={80}
                          thickness={4}
                          sx={{
                            color: 'primary.main',
                            animation: 'pulse 1.5s ease-in-out infinite',
                          }}
                        />
                        <QrCode2
                          sx={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            fontSize: 40,
                            color: 'primary.main',
                            opacity: 0.5,
                          }}
                        />
                      </Box>
                      <Typography variant="h6" fontWeight={600} gutterBottom>
                        Gerando QR Code...
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 400 }}>
                        Estamos preparando sua conexão com o WhatsApp. Isso pode levar alguns segundos.
                      </Typography>
                    </Box>
                  )}
                </Paper>
              )}
            </Box>
          </Zoom>
        )
      }

      {/* Connection Info */}
      {
        status.connected && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Sobre a Conexão
            </Typography>

            <Typography variant="body2" color="text.secondary" paragraph>
              Sua conta do WhatsApp está conectada e pronta para enviar e receber mensagens automaticamente.
            </Typography>

            {status.mode === 'web' && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <strong>Importante:</strong> Mantenha o WhatsApp Web conectado para que o sistema funcione corretamente.
                Se você fizer logout ou desconectar este dispositivo pelo celular, será necessário escanear o QR Code novamente.
              </Alert>
            )}
          </Paper>
        )
      }

      {/* Facebook & Instagram Section */}
      <Box sx={{ mb: 4, mt: 6 }}>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Facebook & Instagram
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Conecte suas páginas do Facebook e Instagram para receber mensagens
        </Typography>
      </Box>

      {/* Facebook Card */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Facebook sx={{ fontSize: 28, color: '#1877F2' }} />
            <Typography variant="h6" fontWeight={600}>
              Facebook Messenger
            </Typography>
          </Box>

          <Chip
            icon={facebookStatus.connected ? <CheckCircle /> : <Error />}
            label={facebookStatus.connected ? 'Conectado' : 'Desconectado'}
            color={facebookStatus.connected ? 'success' : 'default'}
            size="small"
          />
        </Box>

        {facebookStatus.connected && (
          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Página: <strong>{facebookStatus.pageName}</strong>
            </Typography>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          {!facebookStatus.connected ? (
            <>
              <Button
                variant="contained"
                onClick={handleFacebookConnect}
                startIcon={connecting ? <CircularProgress size={20} color="inherit" /> : <Facebook />}
                disabled={connecting || processingOAuth || !isSdkLoaded}
                sx={{ bgcolor: '#1877F2', '&:hover': { bgcolor: '#166fe5' } }}
              >
                {connecting ? 'Conectando...' : 'Conectar com Facebook'}
              </Button>
            </>
          ) : (
            <Button
              variant="outlined"
              onClick={handleFacebookDisconnect}
              color="error"
              startIcon={<PowerSettingsNew />}
            >
              Desconectar
            </Button>
          )}
        </Box>
      </Paper>

      {/* Instagram Card */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Instagram sx={{ fontSize: 28, color: '#E4405F' }} />
            <Typography variant="h6" fontWeight={600}>
              Instagram Direct
            </Typography>
          </Box>

          <Chip
            icon={instagramStatus.connected ? <CheckCircle /> : <Error />}
            label={instagramStatus.connected ? 'Conectado' : 'Desconectado'}
            color={instagramStatus.connected ? 'success' : 'default'}
            size="small"
          />
        </Box>

        {instagramStatus.connected && (
          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Conta: <strong>@{instagramStatus.username}</strong>
            </Typography>
            {instagramStatus.name && instagramStatus.name !== instagramStatus.username && (
              <Typography variant="body2" color="text.secondary">
                Nome: <strong>{instagramStatus.name}</strong>
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              Tipo de Conexão: <strong>{instagramStatus.authMethod === 'instagram_login' ? 'Instagram Direct' : 'Via Facebook Page'}</strong>
            </Typography>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          {!instagramStatus.connected ? (
            <>
              {/* Primary: Instagram Direct Login (OAuth) */}
              <Button
                variant="contained"
                onClick={handleInstagramConnectOAuth}
                startIcon={connectingInstagram ? <CircularProgress size={20} color="inherit" /> : <Instagram />}
                disabled={connectingInstagram}
                sx={{
                  background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #d98530 0%, #cc5c35 25%, #c4223c 50%, #b81f5b 75%, #a6157a 100%)',
                  },
                  '&:disabled': {
                    background: 'rgba(0,0,0,0.12)',
                  }
                }}
              >
                {connectingInstagram ? 'Redirecionando...' : 'Conectar Instagram'}
              </Button>

              {/* Secondary: Via Facebook Page (if Facebook is connected) */}
              {facebookStatus.connected && (
                <Button
                  variant="outlined"
                  onClick={handleInstagramConnectViaFacebook}
                  startIcon={<Facebook />}
                  disabled={connectingInstagram}
                  size="small"
                  sx={{ color: '#E4405F', borderColor: '#E4405F' }}
                >
                  Via Facebook Page
                </Button>
              )}
            </>
          ) : (
            <Button
              variant="outlined"
              onClick={handleInstagramDisconnect}
              color="error"
              startIcon={<PowerSettingsNew />}
            >
              Desconectar
            </Button>
          )}
        </Box>

        {!instagramStatus.connected && !facebookStatus.connected && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              Você pode conectar o Instagram diretamente usando o botão acima.
              Alternativamente, conecte uma página do Facebook primeiro para usar o método via Facebook Page.
            </Typography>
          </Alert>
        )}
      </Paper>

      {/* Dialogs */}

      {/* WABA Selection Dialog */}
      <Dialog open={showWabaSelection} onClose={() => setShowWabaSelection(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Selecione a Conta do WhatsApp</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 3 }}>
            Escolha a conta empresarial e o número de telefone que deseja conectar.
          </DialogContentText>

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Conta Empresarial (WABA)</InputLabel>
            <Select
              value={selectedWabaId}
              label="Conta Empresarial (WABA)"
              onChange={(e) => {
                setSelectedWabaId(e.target.value);
                setSelectedPhoneNumberId(''); // Reset phone when WABA changes
              }}
            >
              {availableWabas.map((waba) => (
                <MenuItem key={waba.id} value={waba.id}>
                  {waba.name} ({waba.id})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedWabaId && (
            <FormControl fullWidth>
              <InputLabel>Número de Telefone</InputLabel>
              <Select
                value={selectedPhoneNumberId}
                label="Número de Telefone"
                onChange={(e) => setSelectedPhoneNumberId(e.target.value)}
              >
                {availableWabas
                  .find(w => w.id === selectedWabaId)
                  ?.phone_numbers.map((phone) => (
                    <MenuItem key={phone.id} value={phone.id}>
                      {phone.display_phone_number} - {phone.verified_name} ({phone.quality_rating})
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowWabaSelection(false)}>Cancelar</Button>
          <Button
            onClick={confirmWabaSelection}
            variant="contained"
            disabled={!selectedWabaId || !selectedPhoneNumberId}
          >
            Conectar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Facebook Page Selection Dialog - Supports both OAuth and legacy flows */}
      <Dialog
        open={showPageSelection}
        onClose={() => {
          setShowPageSelection(false);
          setOauthPages([]);
          setSelectedOAuthPage('');
          setSelectedPage('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Facebook sx={{ color: '#1877F2' }} />
          Selecione a Página do Facebook
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 3 }}>
            Escolha a página que deseja conectar para receber mensagens do Facebook Messenger.
            {oauthPages.some(p => p.hasInstagram) && (
              <Typography component="span" color="primary" sx={{ display: 'block', mt: 1 }}>
                Páginas com Instagram vinculado serão conectadas automaticamente.
              </Typography>
            )}
          </DialogContentText>

          {/* OAuth Flow - Show pages with more details */}
          {oauthPages.length > 0 ? (
            <RadioGroup
              value={selectedOAuthPage}
              onChange={(e) => setSelectedOAuthPage(e.target.value)}
            >
              {oauthPages.map((page) => (
                <Paper
                  key={page.id}
                  sx={{
                    p: 2,
                    mb: 2,
                    border: '2px solid',
                    borderColor: selectedOAuthPage === page.id ? 'primary.main' : 'divider',
                    borderRadius: 2,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': { borderColor: 'primary.light', bgcolor: 'action.hover' }
                  }}
                  onClick={() => setSelectedOAuthPage(page.id)}
                >
                  <FormControlLabel
                    value={page.id}
                    control={<Radio />}
                    label={
                      <Box sx={{ ml: 1 }}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {page.name}
                        </Typography>
                        {page.category && (
                          <Typography variant="caption" color="text.secondary">
                            {page.category}
                          </Typography>
                        )}
                        {page.hasInstagram && (
                          <Chip
                            icon={<Instagram sx={{ fontSize: 16 }} />}
                            label={`@${page.instagramUsername}`}
                            size="small"
                            sx={{
                              ml: 1,
                              background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                              color: 'white',
                              '& .MuiChip-icon': { color: 'white' }
                            }}
                          />
                        )}
                      </Box>
                    }
                    sx={{ width: '100%', m: 0 }}
                  />
                </Paper>
              ))}
            </RadioGroup>
          ) : (
            /* Legacy Flow - Simple select */
            <FormControl fullWidth>
              <InputLabel>Página do Facebook</InputLabel>
              <Select
                value={selectedPage}
                label="Página do Facebook"
                onChange={(e) => setSelectedPage(e.target.value)}
              >
                {availablePages.map((page) => (
                  <MenuItem key={page.id} value={page.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {page.name}
                      {page.instagram_business_account && (
                        <Chip
                          icon={<Instagram sx={{ fontSize: 14 }} />}
                          label={`@${page.instagram_business_account.username}`}
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setShowPageSelection(false);
              setOauthPages([]);
              setSelectedOAuthPage('');
              setSelectedPage('');
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={oauthPages.length > 0 ? confirmOAuthPageSelection : confirmPageSelection}
            variant="contained"
            disabled={
              processingOAuth ||
              (oauthPages.length > 0 ? !selectedOAuthPage : !selectedPage)
            }
            startIcon={processingOAuth ? <CircularProgress size={20} /> : <Facebook />}
            sx={{ bgcolor: '#1877F2', '&:hover': { bgcolor: '#166fe5' } }}
          >
            {processingOAuth ? 'Conectando...' : 'Conectar Página'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Instagram Account Selection Dialog */}
      <Dialog open={showInstagramSelection} onClose={() => setShowInstagramSelection(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Conectar Instagram</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 3 }}>
            A seguinte conta do Instagram está vinculada à sua página do Facebook:
          </DialogContentText>
          {availableInstagramAccounts.map((account) => (
            <Paper
              key={account.id}
              sx={{
                p: 2,
                mb: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: '1px solid',
                borderColor: 'divider',
                '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Instagram sx={{ fontSize: 40, color: '#E4405F' }} />
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    @{account.username}
                  </Typography>
                  {account.name && (
                    <Typography variant="body2" color="text.secondary">
                      {account.name}
                    </Typography>
                  )}
                  {account.followersCount && (
                    <Typography variant="caption" color="text.secondary">
                      {account.followersCount.toLocaleString()} seguidores
                    </Typography>
                  )}
                </Box>
              </Box>
              <Button
                variant="contained"
                onClick={() => confirmInstagramSelection(account)}
                sx={{
                  background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                }}
              >
                Conectar
              </Button>
            </Paper>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowInstagramSelection(false)}>Cancelar</Button>
        </DialogActions>
      </Dialog>
    </Box >
  );
}
