"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, updateProfile, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import { useRouter, usePathname } from "next/navigation";
import { logger } from "@/lib/utils/logger";
import { SubscriptionService } from "@/lib/services/subscription-service";
import { SubscriptionValidation } from "@/lib/types/subscription";

// ===== INTERFACES =====

interface User {
  uid: string;
  email: string;
  name: string;
  fullName: string;
  role: 'admin' | 'user' | 'agent';
  isAdmin: boolean; // Computed property for convenience
  idog?: boolean; // Super admin flag
  tenantId: string; // UID do usuário = tenantId
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
  lastLogin?: Date;
  companyName?: string;
  whatsappNumbers?: string[];
  plan?: 'free' | 'basic' | 'premium';
  firstAccess?: boolean; // Flag para primeiro acesso
  // Novos campos para usuários criados via webhook
  createdViaWebhook?: boolean;
  passwordSet?: boolean;
}

interface AuthContextType {
  // Estados básicos
  user: User | null;
  loading: boolean;
  tenantId: string | null;

  // Funções principais
  logout: () => Promise<void>;
  reloadUser: (forceRefresh?: boolean) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, extraData?: { free?: number; businessName?: string; propertiesCount?: number }) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;

  // Token Firebase
  getFirebaseToken: (forceRefresh?: boolean) => Promise<string | null>;

  // Verificações
  isAdmin: boolean;
  isAuthenticated: boolean;

  // Dados do tenant
  getTenantId: () => string | null;
  getUserData: () => User | null;
}

// ===== CONTEXT =====

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ===== CACHE PARA OTIMIZAÇÃO =====
const userCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

const getCachedUser = (uid: string, computeFn: () => Promise<any>, duration = CACHE_DURATION) => {
  const cached = userCache.get(uid);
  
  if (cached && Date.now() - cached.timestamp < duration) {
    return Promise.resolve(cached.value);
  }
  
  return computeFn().then(result => {
    userCache.set(uid, {
      value: result,
      timestamp: Date.now()
    });
    return result;
  });
};

const invalidateUserCache = (uid?: string) => {
  if (uid) {
    userCache.delete(uid);
  } else {
    userCache.clear();
  }
};

// ===== PROVIDER =====

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  // Estados principais
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Hooks do Next.js
  const router = useRouter();
  const pathname = usePathname();
  
  // Refs para otimização
  const mountedRef = useRef(true);
  const processingRef = useRef(false);

  // ===== FUNÇÕES AUXILIARES =====

  /**
   * Busca ou cria dados do usuário no Firestore
   * Estrutura: users/{uid} (dados do usuário)
   * Multi-tenant: tenants/{uid}/collections (dados da empresa)
   */
  const getUserOrCreateData = useCallback(async (authUser: any): Promise<User> => {
    const uid = authUser.uid;
    
    try {
      // 🛡️ VALIDAÇÃO DE SEGURANÇA: Verificar se UID é válido
      if (!uid || typeof uid !== 'string' || uid.length < 10) {
        throw new Error('UID inválido fornecido pelo Firebase Auth');
      }
      
      // Buscar dados existentes
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();

        // ✅ LOG DEBUG: Verificar dados do Firestore
        logger.info('📊 [Auth] Dados do usuário carregados do Firestore', {
          uid,
          name: userData.name,
          fullName: userData.fullName,
          email: userData.email,
          displayNameFromAuth: authUser.displayName
        });

        // Atualizar último login
        await updateDoc(userRef, {
          lastLogin: new Date(),
          emailVerified: authUser.emailVerified
        }).catch(error => {
          logger.warn('⚠️ [Auth] Erro ao atualizar último login', {
            uid,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        });

        return {
          uid,
          email: userData.email,
          name: userData.name || userData.fullName || '',
          fullName: userData.fullName || userData.name || '',
          role: userData.role || 'user',
          isAdmin: (userData.role || 'user') === 'admin', // Computed property
          idog: userData.idog === true, // Super admin flag
          tenantId: uid, // UID = tenantId
          isActive: userData.isActive !== false,
          emailVerified: authUser.emailVerified,
          createdAt: userData.createdAt?.toDate() || new Date(),
          lastLogin: new Date(),
          companyName: userData.companyName,
          whatsappNumbers: userData.whatsappNumbers || [],
          plan: userData.plan || 'free',
          firstAccess: userData.firstAccess !== false, // Default true se não existir
          // Novos campos para usuários criados via webhook
          createdViaWebhook: userData.createdViaWebhook || false,
          passwordSet: userData.passwordSet !== false, // Default true para usuários normais
          // Log para debug de usuários migrados
          ...(userData.migratedFrom && {
            migratedFrom: userData.migratedFrom,
            migratedAt: userData.migratedAt?.toDate?.() || userData.migratedAt
          })
        };
      }
      
      // 🛡️ CRIAR NOVO USUÁRIO COM VALIDAÇÃO ROBUSTA
      // Fallback chain: displayName -> email prefix -> 'User'
      const displayName = authUser.displayName ||
                         authUser.email?.split('@')[0] ||
                         'User';

      // Garantir que split sempre retorna array válido
      const nameParts = displayName.split(' ').filter((part: string) => part.trim().length > 0);
      const firstName = nameParts[0] || 'User';
      const lastName = nameParts.slice(1).join(' ') || '';
      const fullName = nameParts.join(' ') || 'User';

      // Validar email (campo crítico)
      if (!authUser.email || typeof authUser.email !== 'string' || !authUser.email.includes('@')) {
        throw new Error('Email inválido fornecido pelo provedor de autenticação');
      }

      const newUserData = {
        email: authUser.email,
        name: fullName,
        fullName: fullName,
        firstName: firstName,
        lastName: lastName,
        role: 'user',
        isActive: true,
        emailVerified: authUser.emailVerified || false,
        plan: 'free',
        createdAt: new Date(),
        lastLogin: new Date(),
        whatsappNumbers: [],
        authProvider: authUser.providerData?.[0]?.providerId === 'google.com' ? 'google' : 'email',
        firstAccess: true // Novo usuário sempre tem firstAccess = true
      };
      
      await setDoc(userRef, newUserData, { merge: true });

      // 🛡️ RETORNAR DADOS VALIDADOS
      return {
        uid,
        email: authUser.email, // Já validado acima
        name: fullName,
        fullName: fullName,
        role: 'user',
        isAdmin: false, // New users are not admin by default
        idog: false, // New users are not super admin by default
        tenantId: uid,
        isActive: true,
        emailVerified: authUser.emailVerified || false,
        createdAt: new Date(),
        lastLogin: new Date(),
        companyName: '',
        whatsappNumbers: [],
        plan: 'free',
        firstAccess: true, // Novo usuário sempre tem firstAccess = true
        // Novos campos para usuários criados via webhook
        createdViaWebhook: false, // Usuários criados normalmente
        passwordSet: true // Usuários criados normalmente já têm senha
      };
      
    } catch (error) {
      logger.error('❌ [Auth] Erro ao buscar/criar usuário', {
        uid,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }, []);

  /**
   * Verifica se deve redirecionar para área protegida
   */
  const shouldRedirectToApp = useCallback((userData: User | null, currentPath: string) => {
    if (!userData || !userData.isActive) return false;

    // ✅ NOVO: Rotas públicas + onboarding (não redireciona)
    const publicRoutes = ['/', '/login', '/signup', '/reset-password', '/create-account', '/onboarding'];
    const isInPublicRoute = publicRoutes.some(route => {
      if (route === '/') {
        return currentPath === '/'; // Exact match for root
      }
      return currentPath === route || currentPath.startsWith(route + '/'); // Avoid startsWith conflicts
    });

    // ✅ NOVO: Se está em /onboarding, não redirecionar
    if (currentPath.startsWith('/onboarding')) {
      return false;
    }

    // Redirecionar para dashboard se estiver em rota pública e autenticado
    return isInPublicRoute;
  }, []);

  /**
   * Verifica se deve redirecionar para login ou planos
   */
  const shouldRedirectToAuth = useCallback(async (userData: User | null, currentPath: string) => {
    const protectedRoutes = ['/dashboard'];
    const isProtectedRoute = protectedRoutes.some(route => currentPath.startsWith(route));

    if (!isProtectedRoute) return false;

    if (!userData) {
      return { redirect: '/login', reason: 'no_user' };
    }

    if (!userData.isActive) {
      return { redirect: '/login', reason: 'inactive_user' };
    }

    // ✅ NOVA VERIFICAÇÃO: Usuário criado via webhook sem senha
    if (userData.createdViaWebhook && !userData.passwordSet) {
      logger.info('🔐 [Auth] Redirecionando usuário para definir senha', {
        userId: userData.uid,
        email: userData.email,
        currentPath
      });

      return {
        redirect: `/set-password?email=${encodeURIComponent(userData.email)}`,
        reason: 'password_required'
      };
    }
    
    // ✅ OTIMIZAÇÃO: Pular validação para usuários recém-criados (< 10s)
    const accountAge = Date.now() - userData.createdAt.getTime();
    const isNewAccount = accountAge < 10000; // 10 segundos

    if (isNewAccount) {
      logger.info('⚡ [Auth] Novo usuário detectado, pulando validação de subscription', {
        userId: userData.uid,
        accountAge: Math.round(accountAge / 1000) + 's'
      });
      return false; // Permitir acesso imediato
    }

    // ✅ NOVA VERIFICAÇÃO: Trial/Assinatura com FALLBACK DE SEGURANÇA
    try {
      const subscriptionValidation = await SubscriptionService.validateUserAccess(userData.uid);

      if (!subscriptionValidation.hasAccess) {
        logger.info('🚫 [Auth] Redirecionando para planos', {
          userId: userData.uid,
          reason: subscriptionValidation.reason,
          currentPath
        });

        return {
          redirect: subscriptionValidation.redirectUrl || 'https://moneyin.agency/alugazapplanos/',
          reason: subscriptionValidation.reason || 'no_access',
          isExternalRedirect: true
        };
      }

      // Log trial status se aplicável
      if (subscriptionValidation.trialStatus) {
        logger.info('ℹ️ [Auth] Usuário em trial', {
          userId: userData.uid,
          daysRemaining: subscriptionValidation.trialStatus.daysRemaining,
          trialEndDate: subscriptionValidation.trialStatus.trialEndDate
        });
      }

    } catch (error) {
      logger.error('❌ [Auth] Erro na validação de assinatura', error as Error, {
        userId: userData.uid
      });

      // 🛡️ FALLBACK CRÍTICO: Em caso de erro na validação, permitir acesso
      // Isso garante que problemas de conectividade ou bugs não travem usuários
      logger.warn('⚠️ [Auth] Permitindo acesso devido a erro na validação', {
        userId: userData.uid,
        error: error instanceof Error ? error.message : 'Unknown'
      });
    }
    
    return false;
  }, []);

  // ===== AUTHENTICATION STATE LISTENER =====

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | null = null;
    
    const handleAuthenticatedUser = async (authUser: any) => {
      if (!isMounted) return;
      
      if (processingRef.current) {
        return;
      }
      
      try {
        processingRef.current = true;
        
        // Buscar dados do usuário com cache
        const userData = await getCachedUser(authUser.uid, () => getUserOrCreateData(authUser));
        
        if (!isMounted) return;
        
        setUser(userData);
        
        // Armazenar Firebase ID token
        try {
          const firebaseIdToken = await authUser.getIdToken();
          localStorage.setItem('auth_token', firebaseIdToken);
          logger.info('✅ [Auth] Firebase ID token armazenado', {
            userId: userData.uid,
            tenantId: userData.tenantId
          });
        } catch (error) {
          logger.error('❌ [Auth] Erro ao obter Firebase ID token', { error });
        }
        
        // Redirecionamento mais robusto
        setTimeout(async () => {
          if (!isMounted) return;
          
          // Se usuário está autenticado e em rota pública, redirecionar
          if (shouldRedirectToApp(userData, pathname)) {
            // Verificar se há um redirectPath salvo
            let targetPath = '/dashboard';
            
            try {
              const savedPath = localStorage.getItem('redirectPath');
              if (savedPath && savedPath.startsWith('/dashboard')) {
                targetPath = savedPath;
                localStorage.removeItem('redirectPath'); // Limpar após usar
                logger.info('🔄 [Auth] Redirecionando para path salvo', {
                  from: pathname,
                  to: targetPath,
                  userId: userData.uid
                });
              } else {
                logger.info('🔄 [Auth] Redirecionando usuário autenticado para dashboard', {
                  from: pathname,
                  to: targetPath,
                  userId: userData.uid
                });
              }
            } catch (error) {
              // Se der erro ao acessar localStorage, usar dashboard padrão
              logger.warn('⚠️ [Auth] Erro ao acessar localStorage para redirectPath');
            }
            
            // ✅ NOVO: Evitar redirecionamentos múltiplos
            const isAlreadyRedirecting = sessionStorage.getItem('redirecting');
            if (isAlreadyRedirecting) {
              sessionStorage.removeItem('redirecting');
              return;
            }

            logger.info('🔄 [Auth] Redirecting authenticated user to dashboard', {
              from: pathname,
              to: targetPath,
              userId: userData.uid
            });
            sessionStorage.setItem('redirecting', 'true');
            router.replace(targetPath); // ✅ replace em vez de push
          } else {
            // Verificar se precisa redirecionar para login ou planos
            const authRedirect = await shouldRedirectToAuth(userData, pathname);
            if (authRedirect) {
              logger.info('🔄 [Auth] Redirecionando usuário', {
                from: pathname,
                to: authRedirect.redirect,
                reason: authRedirect.reason,
                isExternal: authRedirect.isExternalRedirect
              });
              
              // ✅ NOVO: Evitar redirecionamentos múltiplos
              const isAlreadyRedirecting = sessionStorage.getItem('redirecting');
              if (isAlreadyRedirecting) {
                sessionStorage.removeItem('redirecting');
                return;
              }
              
              sessionStorage.setItem('redirecting', 'true');

              // Redirecionamento externo (planos) vs interno (login)
              if (authRedirect.isExternalRedirect) {
                logger.info('🔄 [Auth] Redirecting to external plans page', {
                  url: authRedirect.redirect,
                  reason: authRedirect.reason
                });
                window.location.href = authRedirect.redirect;
              } else {
                logger.info('🔄 [Auth] Redirecting to login', {
                  from: pathname,
                  reason: authRedirect.reason
                });
                router.replace(authRedirect.redirect);
              }
            }
          }
        }, 50); // ✅ Otimizado para 50ms - mais rápido para signup
        
      } catch (error) {
        logger.error('❌ [Auth] Erro ao processar usuário autenticado', {
          uid: authUser.uid,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        if (isMounted) {
          setUser(null);
        }
      } finally {
        processingRef.current = false;
      }
    };
    
    const handleUnauthenticatedUser = async () => {
      if (!isMounted) return;
      
      setUser(null);
      invalidateUserCache();
      
      const authRedirect = await shouldRedirectToAuth(null, pathname);
      if (authRedirect) {
        // ✅ NOVO: Evitar redirecionamentos múltiplos
        const isAlreadyRedirecting = sessionStorage.getItem('redirecting');
        if (isAlreadyRedirecting) {
          sessionStorage.removeItem('redirecting');
          return;
        }

        logger.info('🔄 [Auth] Redirecting unauthenticated user to login', {
          from: pathname,
          reason: 'no_user'
        });
        sessionStorage.setItem('redirecting', 'true');
        router.replace(authRedirect.redirect); // ✅ replace em vez de push
      }
    };
    
    try {
      unsubscribe = onAuthStateChanged(auth, async (authUser) => {
        if (!isMounted) return;
        
        try {
          if (authUser) {
            await handleAuthenticatedUser(authUser);
          } else {
            handleUnauthenticatedUser();
          }
        } catch (error) {
          logger.error('❌ [Auth] Erro no listener de autenticação', {
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      });
    } catch (error) {
      logger.error('❌ [Auth] Erro ao configurar listener', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      if (isMounted) {
        setLoading(false);
      }
    }
    
    return () => {
      isMounted = false;
      processingRef.current = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [pathname, router, getUserOrCreateData, shouldRedirectToApp, shouldRedirectToAuth]);

  // ===== FUNÇÕES PÚBLICAS =====

  const logout = useCallback(async () => {
    try {
      logger.info('🚪 [Auth] Iniciando logout completo');
      
      // 1. LIMPAR ESTADO LOCAL primeiro
      setUser(null);
      setLoading(false);
      invalidateUserCache();
      
      // 2. LIMPAR TOKENS E STORAGE
      localStorage.removeItem('auth_token');
      localStorage.removeItem('firebase-auth');
      sessionStorage.clear();
      
      // 3. LIMPAR COOKIES via API (opcional, mantido para limpeza)
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include'
        });
      } catch (error) {
        // Ignorar erro, não é crítico
      }
      
      // 4. SIGN OUT Firebase (por último para evitar loop)
      await signOut(auth);
      
      // 5. GARANTIR redirecionamento
      setTimeout(() => {
        window.location.href = '/login'; // Forçar recarregamento completo
      }, 100);
      
      logger.info('✅ [Auth] Logout completo realizado');
      
    } catch (error) {
      logger.error('❌ [Auth] Erro no logout', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // LOGOUT FORÇADO em caso de erro
      setUser(null);
      invalidateUserCache();
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
    }
  }, [router]);

  const reloadUser = useCallback(async (forceRefresh = false) => {
    if (!user?.uid) return;
    
    try {
      if (forceRefresh) {
        invalidateUserCache(user.uid);
      }
      
      const authUser = auth.currentUser;
      if (!authUser) return;
      
      const userData = await getCachedUser(user.uid, () => getUserOrCreateData(authUser));
      setUser(userData);
    } catch (error) {
      logger.error('❌ [Auth] Erro ao recarregar usuário', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, [user?.uid, getUserOrCreateData]);

  const getTenantId = useCallback(() => {
    return user?.tenantId || null;
  }, [user?.tenantId]);

  const getUserData = useCallback(() => {
    return user;
  }, [user]);

  const getFirebaseToken = useCallback(async (forceRefresh = false): Promise<string | null> => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        logger.debug('🔒 [Auth] Nenhum usuário autenticado');
        return null;
      }
      
      const token = await currentUser.getIdToken(forceRefresh);
      logger.debug(`✅ [Auth] Token Firebase obtido${forceRefresh ? ' (refreshed)' : ''}`);
      return token;
    } catch (error) {
      logger.error('❌ [Auth] Erro ao obter token Firebase', {
        error: error instanceof Error ? error.message : 'Unknown error',
        forceRefresh
      });
      return null;
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<void> => {
    try {
      logger.info('🔐 [Auth] Iniciando login', { email });
      
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      // O listener onAuthStateChanged vai processar o usuário automaticamente
    } catch (error: any) {
      logger.error('❌ [Auth] Erro no login', {
        email,
        error: error.message,
        code: error.code
      });
      throw error;
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string, extraData?: { free?: number; businessName?: string; propertiesCount?: number }): Promise<void> => {
    try {
      logger.info('👤 [Auth] Iniciando registro', { email, name });
      
      // Criar usuário no Firebase Auth
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Atualizar perfil do usuário
      await updateProfile(result.user, {
        displayName: name
      });
      
      // Criar documento do usuário no Firestore
      const userData: any = {
        email,
        name,
        fullName: name,
        role: 'user',
        isActive: true,
        emailVerified: result.user.emailVerified,
        plan: 'free',
        createdAt: new Date(),
        lastLogin: new Date(),
        whatsappNumbers: [],
        authProvider: 'email',
        firstAccess: true // Novo usuário sempre tem firstAccess = true
      };
      
      // ✅ NOVA LÓGICA: Adicionar campos extras se fornecidos
      if (extraData?.free !== undefined) {
        userData.free = extraData.free;
      } else {
        // 🎁 Garantir 7 dias grátis para TODOS os novos cadastros
        userData.free = 7;
      }

      if (extraData?.businessName) {
        userData.companyName = extraData.businessName;
      }
      if (extraData?.propertiesCount !== undefined) {
        userData.propertiesCount = extraData.propertiesCount;
      }
      
      await setDoc(doc(db, 'users', result.user.uid), userData);

      // ✅ LOG DEBUG: Confirmar dados salvos no Firestore
      logger.info('✅ [Auth] Registro realizado com sucesso', {
        uid: result.user.uid,
        email: result.user.email,
        name: userData.name,
        fullName: userData.fullName,
        displayNameInAuth: result.user.displayName,
        free: userData.free
      });
      
      // Forçar invalidação do cache para garantir que os dados sejam recarregados
      invalidateUserCache(result.user.uid);
      
      // Forçar uma atualização imediata do estado do usuário
      const newUser: User = {
        uid: result.user.uid,
        email: result.user.email!,
        name,
        fullName: name,
        role: 'user',
        isAdmin: false,
        tenantId: result.user.uid,
        isActive: true,
        emailVerified: result.user.emailVerified,
        createdAt: new Date(),
        lastLogin: new Date(),
        companyName: '',
        whatsappNumbers: [],
        plan: 'free',
        firstAccess: true, // Garantir que firstAccess seja true
        // Novos campos para usuários criados via webhook
        createdViaWebhook: false, // Usuários criados normalmente
        passwordSet: true // Usuários criados normalmente já têm senha
      };
      
      setUser(newUser);
      
      // O listener onAuthStateChanged vai processar o usuário automaticamente
    } catch (error: any) {
      logger.error('❌ [Auth] Erro no registro', {
        email,
        name,
        error: error.message,
        code: error.code
      });
      throw error;
    }
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<void> => {
    try {
      logger.info('🔐 [Auth] Enviando email de reset de senha', { email });

      await sendPasswordResetEmail(auth, email, {
        url: `${window.location.origin}/login`,
        handleCodeInApp: false,
      });

      logger.info('✅ [Auth] Email de reset enviado', { email });
    } catch (error: any) {
      logger.error('❌ [Auth] Erro ao enviar email de reset', {
        email,
        error: error.message,
        code: error.code
      });
      throw error;
    }
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<void> => {
    try {
      logger.info('🔐 [Auth] Iniciando login com Google');

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      const result = await signInWithPopup(auth, provider);

      // Verificar se é um novo usuário ou usuário existente
      const userRef = doc(db, 'users', result.user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // Novo usuário - criar com 7 dias grátis
        const displayName = result.user.displayName || result.user.email?.split('@')[0] || 'User';

        const userData: any = {
          email: result.user.email,
          name: displayName,
          fullName: displayName,
          role: 'user',
          isActive: true,
          emailVerified: result.user.emailVerified,
          plan: 'free',
          createdAt: new Date(),
          lastLogin: new Date(),
          whatsappNumbers: [],
          authProvider: 'google',
          firstAccess: true,
          free: 7 // 🎁 7 dias grátis para novos cadastros
        };

        await setDoc(userRef, userData);

        logger.info('✅ [Auth] Novo usuário criado com Google', {
          uid: result.user.uid,
          email: result.user.email,
          name: displayName,
          free: 7
        });

        // Forçar invalidação do cache
        invalidateUserCache(result.user.uid);

        // Atualizar estado imediato
        const newUser: User = {
          uid: result.user.uid,
          email: result.user.email!,
          name: displayName,
          fullName: displayName,
          role: 'user',
          isAdmin: false,
          tenantId: result.user.uid,
          isActive: true,
          emailVerified: result.user.emailVerified,
          createdAt: new Date(),
          lastLogin: new Date(),
          companyName: '',
          whatsappNumbers: [],
          plan: 'free',
          firstAccess: true,
          createdViaWebhook: false,
          passwordSet: true
        };

        setUser(newUser);
      } else {
        logger.info('✅ [Auth] Login com Google realizado', {
          uid: result.user.uid,
          email: result.user.email
        });
      }

      // O listener onAuthStateChanged vai processar o usuário automaticamente
    } catch (error: any) {
      logger.error('❌ [Auth] Erro no login com Google', {
        error: error.message,
        code: error.code
      });
      throw error;
    }
  }, []);

  // ===== CLEANUP =====

  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      invalidateUserCache();
    };
  }, []);

  // ===== CONTEXT VALUE =====

  const contextValue = useMemo((): AuthContextType => ({
    // Estados básicos
    user,
    loading,
    tenantId: user?.tenantId || null,

    // Funções principais
    logout,
    reloadUser,
    signIn,
    signUp,
    signInWithGoogle,
    resetPassword,

    // Token Firebase
    getFirebaseToken,

    // Verificações
    isAdmin: user?.role === 'admin',
    isAuthenticated: !!user,

    // Dados do tenant
    getTenantId,
    getUserData
  }), [
    user,
    loading,
    logout,
    reloadUser,
    signIn,
    signUp,
    signInWithGoogle,
    resetPassword,
    getFirebaseToken,
    getTenantId,
    getUserData
  ]);

  // Expor reloadUser no contexto do usuário para uso em hooks
  if (user && typeof (user as any).reloadUser === 'undefined') {
    (user as any).reloadUser = reloadUser;
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// ===== HOOK =====

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};