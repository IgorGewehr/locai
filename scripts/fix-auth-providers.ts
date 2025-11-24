/**
 * Script de migração para adicionar campo authProviders aos usuários existentes
 *
 * Este script corrige usuários que foram criados antes da implementação
 * do sistema de múltiplos provedores de autenticação.
 *
 * Uso:
 * npx tsx scripts/fix-auth-providers.ts
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Inicializar Firebase Admin
const app = initializeApp({
  credential: cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

const db = getFirestore(app);
const auth = getAuth(app);

async function migrateAuthProviders() {
  console.log('🔄 Iniciando migração de provedores de autenticação...\n');

  try {
    // 1. Buscar todos os usuários do Firestore
    const usersSnapshot = await db.collection('users').get();
    console.log(`📊 Total de usuários encontrados: ${usersSnapshot.size}\n`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // 2. Processar cada usuário
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const uid = userDoc.id;

      try {
        // Pular se já tem authProviders configurado
        if (userData.authProviders && Array.isArray(userData.authProviders)) {
          console.log(`⏭️  Pulando ${userData.email} - já tem authProviders configurado`);
          skippedCount++;
          continue;
        }

        // Buscar dados do Firebase Auth para verificar provedores reais
        const authUser = await auth.getUser(uid);
        const firebaseProviders = authUser.providerData.map(p => p.providerId);

        console.log(`🔍 Processando: ${userData.email}`);
        console.log(`   Provedores no Firebase Auth: ${firebaseProviders.join(', ')}`);

        // Determinar authProviders baseado nos dados existentes
        let authProviders: string[] = [];

        // Prioridade 1: Usar provedores do Firebase Auth
        if (firebaseProviders.length > 0) {
          authProviders = firebaseProviders;
        }
        // Prioridade 2: Usar authProvider (campo legado)
        else if (userData.authProvider) {
          if (userData.authProvider === 'email') {
            authProviders = ['password'];
          } else if (userData.authProvider === 'google') {
            authProviders = ['google.com'];
          } else {
            authProviders = [userData.authProvider];
          }
        }
        // Prioridade 3: Fallback (email por padrão)
        else {
          authProviders = ['password'];
        }

        console.log(`   ✅ Definindo authProviders: ${authProviders.join(', ')}`);

        // Atualizar documento
        await db.collection('users').doc(uid).update({
          authProviders,
          migratedAuthProviders: true,
          migratedAt: new Date(),
        });

        console.log(`   ✨ Migrado com sucesso!\n`);
        migratedCount++;

      } catch (error) {
        console.error(`   ❌ Erro ao processar ${userData.email}:`, error);
        errorCount++;
      }
    }

    // 3. Resumo final
    console.log('\n' + '='.repeat(50));
    console.log('📋 RESUMO DA MIGRAÇÃO');
    console.log('='.repeat(50));
    console.log(`✅ Migrados: ${migratedCount}`);
    console.log(`⏭️  Pulados: ${skippedCount}`);
    console.log(`❌ Erros: ${errorCount}`);
    console.log(`📊 Total: ${usersSnapshot.size}`);
    console.log('='.repeat(50) + '\n');

    console.log('✅ Migração concluída com sucesso!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Erro fatal na migração:', error);
    process.exit(1);
  }
}

// Executar migração
migrateAuthProviders();
