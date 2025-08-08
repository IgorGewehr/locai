"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, updateProfile } from "firebase/auth";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import { useRouter, usePathname } from "next/navigation";
import { logger } from "@/lib/utils/logger";

// ===== INTERFACES =====

interface User {
  uid: string;
  email: string;
  name: string;
  fullName: string;
  role: 'admin' | 'user' | 'agent';
  tenantId: string; // UID do usuário = tenantId
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
  lastLogin?: Date;
  companyName?: string;
  whatsappNumbers?: string[];
  plan?: 'free' | 'basic' | 'premium';
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
  signUp: (email: string, password: string, name: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  
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
      logger.info('🔍 [Auth] Buscando dados do usuário', { uid });
      
      // Buscar dados existentes
      logger.info('🔍 [Auth] Criando referência do usuário', { uid, collection: 'users' });
      const userRef = doc(db, 'users', uid);
      
      logger.info('🔍 [Auth] Executando getDoc', { uid });
      let userSnap;
      try {
        userSnap = await getDoc(userRef);
        logger.info('✅ [Auth] getDoc executado com sucesso', { uid, exists: userSnap.exists() });
      } catch (getDocError) {
        logger.error('❌ [Auth] Erro específico no getDoc', {
          uid,
          error: getDocError instanceof Error ? getDocError.message : 'Unknown getDoc error',
          errorCode: (getDocError as any)?.code,
          errorStack: getDocError instanceof Error ? getDocError.stack : undefined
        });
        throw getDocError;
      }
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        
        // Atualizar último login
        logger.info('🔄 [Auth] Atualizando último login', { uid });
        await updateDoc(userRef, {
          lastLogin: new Date(),
          emailVerified: authUser.emailVerified
        }).catch(error => {
          logger.warn('⚠️ [Auth] Erro ao atualizar último login', { 
            uid,
            error: error instanceof Error ? error.message : 'Unknown error',
            errorCode: (error as any)?.code 
          });
        });
        
        logger.info('✅ [Auth] Usuário existente encontrado', { uid, email: userData.email });
        
        return {
          uid,
          email: userData.email,
          name: userData.name || userData.fullName || '',
          fullName: userData.fullName || userData.name || '',
          role: userData.role || 'user',
          tenantId: uid, // UID = tenantId
          isActive: userData.isActive !== false,
          emailVerified: authUser.emailVerified,
          createdAt: userData.createdAt?.toDate() || new Date(),
          lastLogin: new Date(),
          companyName: userData.companyName,
          whatsappNumbers: userData.whatsappNumbers || [],
          plan: userData.plan || 'free'
        };
      }
      
      // Criar novo usuário
      logger.info('🔧 [Auth] Criando novo usuário', { uid, email: authUser.email });
      
      const [firstName, ...lastNameArray] = (authUser.displayName || '').split(' ');
      const lastName = lastNameArray.join(' ');
      
      const newUserData = {
        email: authUser.email,
        name: authUser.displayName || '',
        fullName: authUser.displayName || '',
        firstName: firstName || '',
        lastName: lastName || '',
        role: 'user',
        isActive: true,
        emailVerified: authUser.emailVerified,
        plan: 'free',
        createdAt: new Date(),
        lastLogin: new Date(),
        whatsappNumbers: [],
        authProvider: authUser.providerData?.[0]?.providerId === 'google.com' ? 'google' : 'email'
      };
      
      logger.info('🔧 [Auth] Executando setDoc para novo usuário', { uid, data: newUserData });
      await setDoc(userRef, newUserData, { merge: true });
      
      logger.info('✅ [Auth] Novo usuário criado', { uid, email: authUser.email });
      
      return {
        uid,
        email: authUser.email,
        name: newUserData.name,
        fullName: newUserData.fullName,
        role: 'user',
        tenantId: uid,
        isActive: true,
        emailVerified: authUser.emailVerified,
        createdAt: new Date(),
        lastLogin: new Date(),
        companyName: '',
        whatsappNumbers: [],
        plan: 'free'
      };
      
    } catch (error) {
      logger.error('❌ [Auth] Erro ao buscar/criar usuário', {
        uid,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: (error as any)?.code,
        errorStack: error instanceof Error ? error.stack : undefined,
        step: 'getUserOrCreateData'
      });
      throw error;
    }
  }, []);

  /**
   * Verifica se deve redirecionar para área protegida
   */
  const shouldRedirectToApp = useCallback((userData: User | null, currentPath: string) => {
    if (!userData || !userData.isActive) return false;
    
    const publicRoutes = ['/', '/login', '/signup', '/reset-password'];
    const isInPublicRoute = publicRoutes.includes(currentPath);
    
    return isInPublicRoute;
  }, []);

  /**
   * Verifica se deve redirecionar para login
   */
  const shouldRedirectToAuth = useCallback((userData: User | null, currentPath: string) => {
    const protectedRoutes = ['/dashboard'];
    const isProtectedRoute = protectedRoutes.some(route => currentPath.startsWith(route));
    
    if (!isProtectedRoute) return false;
    
    if (!userData) {
      return { redirect: '/login', reason: 'no_user' };
    }
    
    if (!userData.isActive) {
      return { redirect: '/login', reason: 'inactive_user' };
    }
    
    return false;
  }, []);

  // ===== AUTHENTICATION STATE LISTENER =====

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | null = null;
    
    logger.info('🔐 [Auth] Inicializando listener de autenticação', { pathname });
    
    const handleAuthenticatedUser = async (authUser: any) => {
      if (!isMounted) return;
      
      if (processingRef.current) {
        logger.warn('⚠️ [Auth] Processamento já em andamento, pulando');
        return;
      }
      
      try {
        processingRef.current = true;
        logger.info('👤 [Auth] Processando usuário autenticado', { uid: authUser.uid });
        
        // Buscar dados do usuário com cache
        const userData = await getCachedUser(authUser.uid, () => getUserOrCreateData(authUser));
        
        if (!isMounted) return;
        
        setUser(userData);
        
        // Gerar token JWT para o usuário autenticado
        try {
          const response = await fetch('/api/auth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              uid: userData.uid,
              email: userData.email,
              name: userData.name,
              role: userData.role,
              tenantId: userData.tenantId
            })
          });
          
          if (response.ok) {
            const { token } = await response.json();
            // O cookie é configurado pelo servidor, apenas salvar no localStorage
            localStorage.setItem('auth_token', token);
            logger.info('✅ [Auth] Token JWT criado e armazenado', {
              userId: userData.uid,
              tenantId: userData.tenantId
            });
          }
        } catch (error) {
          logger.error('❌ [Auth] Erro ao criar token JWT', { error });
        }
        
        logger.info('✅ [Auth] Usuário autenticado processado', {
          uid: userData.uid,
          tenantId: userData.tenantId,
          role: userData.role
        });
        
        // Redirecionamento
        setTimeout(() => {
          if (!isMounted) return;
          
          if (shouldRedirectToApp(userData, pathname)) {
            logger.info('🔄 [Auth] Redirecionando para dashboard');
            router.push('/dashboard');
          } else {
            const authRedirect = shouldRedirectToAuth(userData, pathname);
            if (authRedirect) {
              logger.info('🔄 [Auth] Redirecionando para login', { reason: authRedirect.reason });
              router.push(authRedirect.redirect);
            }
          }
        }, 500);
        
      } catch (error) {
        logger.error('❌ [Auth] Erro ao processar usuário autenticado', {
          uid: authUser.uid,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        if (isMounted) {
          setUser(null);
          // Tentar novamente após um erro
          setTimeout(() => {
            if (isMounted && authUser) {
              logger.info('🔄 [Auth] Tentando reprocessar usuário após erro');
              processingRef.current = false; // Liberar para nova tentativa
            }
          }, 1000);
        }
      } finally {
        processingRef.current = false;
      }
    };
    
    const handleUnauthenticatedUser = () => {
      if (!isMounted) return;
      
      logger.info('🚫 [Auth] Usuário não autenticado');
      
      setUser(null);
      invalidateUserCache();
      
      const authRedirect = shouldRedirectToAuth(null, pathname);
      if (authRedirect) {
        logger.info('🔄 [Auth] Redirecionando usuário não autenticado', { reason: authRedirect.reason });
        router.push(authRedirect.redirect);
      }
    };
    
    try {
      unsubscribe = onAuthStateChanged(auth, async (authUser) => {
        if (!isMounted) return;
        
        logger.info('🔔 [Auth] onAuthStateChanged disparado', { 
          hasUser: !!authUser,
          uid: authUser?.uid,
          processing: processingRef.current 
        });
        
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
      logger.info('🚪 [Auth] Iniciando logout');
      
      await signOut(auth);
      
      setUser(null);
      invalidateUserCache();
      
      logger.info('✅ [Auth] Logout realizado com sucesso');
      router.push('/');
    } catch (error) {
      logger.error('❌ [Auth] Erro ao fazer logout', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, [router]);

  const reloadUser = useCallback(async (forceRefresh = false) => {
    if (!user?.uid) return;
    
    try {
      logger.info('🔄 [Auth] Recarregando dados do usuário', { forceRefresh });
      
      if (forceRefresh) {
        invalidateUserCache(user.uid);
      }
      
      const authUser = auth.currentUser;
      if (!authUser) return;
      
      const userData = await getCachedUser(user.uid, () => getUserOrCreateData(authUser));
      setUser(userData);
      
      logger.info('✅ [Auth] Dados do usuário recarregados');
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

  const signIn = useCallback(async (email: string, password: string): Promise<void> => {
    try {
      logger.info('🔐 [Auth] Iniciando login', { email });
      
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      logger.info('✅ [Auth] Login realizado com sucesso', { 
        uid: result.user.uid,
        email: result.user.email 
      });
      
      // Forçar reprocessamento do usuário após login
      logger.info('🔄 [Auth] Forçando reprocessamento do usuário logado');
      
      // O listener onAuthStateChanged deveria processar automaticamente, 
      // mas vamos tentar forçar se necessário
      setTimeout(() => {
        if (result.user && mountedRef.current) {
          logger.info('🔧 [Auth] Timeout - verificando se usuário foi processado');
        }
      }, 2000);
    } catch (error: any) {
      logger.error('❌ [Auth] Erro no login', {
        email,
        error: error.message,
        code: error.code
      });
      throw error;
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string): Promise<void> => {
    try {
      logger.info('👤 [Auth] Iniciando registro', { email, name });
      
      // Criar usuário no Firebase Auth
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Atualizar perfil do usuário
      await updateProfile(result.user, {
        displayName: name
      });
      
      // Criar documento do usuário no Firestore
      const userData = {
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
        authProvider: 'email'
      };
      
      await setDoc(doc(db, 'users', result.user.uid), userData);
      
      logger.info('✅ [Auth] Registro realizado com sucesso', { 
        uid: result.user.uid,
        email: result.user.email,
        name 
      });
      
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
    resetPassword,
    
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
    resetPassword,
    getTenantId,
    getUserData
  ]);

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