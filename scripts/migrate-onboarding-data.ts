/**
 * Migration Script: Consolidate Revolutionary Onboarding to /onboarding/
 *
 * This script migrates data from:
 * /users/{userId}/revolutionary_onboarding/{tenantId}
 *
 * To:
 * /users/{userId}/onboarding/{tenantId}
 *
 * Usage: npx tsx scripts/migrate-onboarding-data.ts
 */

import { db } from '../lib/firebase/config';
import { collection, getDocs, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { logger } from '../lib/utils/logger';

interface MigrationStats {
  totalUsers: number;
  migratedUsers: number;
  skippedUsers: number;
  errors: number;
}

async function migrateOnboardingData() {
  const stats: MigrationStats = {
    totalUsers: 0,
    migratedUsers: 0,
    skippedUsers: 0,
    errors: 0,
  };

  try {
    logger.info('🚀 [Migration] Iniciando migração de onboarding data...');

    // Get all users
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);

    stats.totalUsers = usersSnapshot.size;
    logger.info(`📊 [Migration] Encontrados ${stats.totalUsers} usuários`);

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;

      try {
        // Get all revolutionary_onboarding documents for this user
        const revolutionaryRef = collection(db, 'users', userId, 'revolutionary_onboarding');
        const revolutionarySnapshot = await getDocs(revolutionaryRef);

        if (revolutionarySnapshot.empty) {
          logger.debug(`⏭️ [Migration] User ${userId}: sem dados revolutionary_onboarding`);
          stats.skippedUsers++;
          continue;
        }

        logger.info(`🔄 [Migration] Migrando user ${userId} (${revolutionarySnapshot.size} tenants)`);

        for (const revolutionaryDoc of revolutionarySnapshot.docs) {
          const tenantId = revolutionaryDoc.id;
          const revolutionaryData = revolutionaryDoc.data();

          // Check if onboarding document already exists
          const onboardingRef = doc(db, 'users', userId, 'onboarding', tenantId);
          const onboardingDoc = await getDoc(onboardingRef);

          if (onboardingDoc.exists()) {
            const onboardingData = onboardingDoc.data();

            // Merge revolutionary data into existing onboarding
            const mergedData = {
              ...onboardingData,
              // Keep existing basic fields
              userId: onboardingData.userId,
              tenantId: onboardingData.tenantId,
              steps: onboardingData.steps,
              currentStepId: onboardingData.currentStepId,
              startedAt: onboardingData.startedAt,
              lastUpdatedAt: onboardingData.lastUpdatedAt,
              isCompleted: onboardingData.isCompleted,
              completionPercentage: onboardingData.completionPercentage,
              // Add revolutionary fields if they don't exist
              viewMode: onboardingData.viewMode || revolutionaryData.viewMode || 'compact',
              activeDialog: onboardingData.activeDialog || revolutionaryData.activeDialog || { mode: null, isOpen: false },
              lastInteractionAt: onboardingData.lastInteractionAt || revolutionaryData.lastInteractionAt,
              timeSpentSeconds: onboardingData.timeSpentSeconds || revolutionaryData.timeSpentSeconds || 0,
              stepInteractions: onboardingData.stepInteractions || revolutionaryData.stepInteractions || {},
              showTooltips: onboardingData.showTooltips !== undefined ? onboardingData.showTooltips : revolutionaryData.showTooltips !== undefined ? revolutionaryData.showTooltips : true,
              showVideoTutorials: onboardingData.showVideoTutorials !== undefined ? onboardingData.showVideoTutorials : revolutionaryData.showVideoTutorials !== undefined ? revolutionaryData.showVideoTutorials : true,
              isDismissed: onboardingData.isDismissed || revolutionaryData.isDismissed || false,
              completedSteps: onboardingData.completedSteps || revolutionaryData.completedSteps || [],
              skippedSteps: onboardingData.skippedSteps || revolutionaryData.skippedSteps || [],
              unlockedBadges: onboardingData.unlockedBadges || revolutionaryData.unlockedBadges || [],
              analytics: onboardingData.analytics || revolutionaryData.analytics || {
                totalTimeSpentSeconds: 0,
                stepsCompleted: 0,
                stepsSkipped: 0,
                averageTimePerStep: 0,
                completionRate: 0,
                helpViewedCount: 0,
                videoWatchedCount: 0,
                errorsEncountered: 0,
              },
            };

            // Update onboarding with merged data
            await setDoc(onboardingRef, mergedData, { merge: true });
            logger.info(`✅ [Migration] Merged data for user ${userId}, tenant ${tenantId}`);
          } else {
            // No existing onboarding, create new one from revolutionary data
            const newOnboardingData = {
              userId,
              tenantId,
              // Copy all revolutionary fields
              ...revolutionaryData,
              // Ensure required fields exist
              steps: revolutionaryData.steps || {
                add_property: 'pending',
                connect_whatsapp: 'pending',
              },
              currentStepId: revolutionaryData.currentStepId || 'add_property',
              startedAt: revolutionaryData.startedAt || new Date(),
              lastUpdatedAt: revolutionaryData.lastUpdatedAt || new Date(),
              isCompleted: revolutionaryData.isCompleted || false,
              completionPercentage: revolutionaryData.completionPercentage || 0,
            };

            await setDoc(onboardingRef, newOnboardingData);
            logger.info(`📝 [Migration] Created new onboarding for user ${userId}, tenant ${tenantId}`);
          }

          // Delete old revolutionary_onboarding document
          await deleteDoc(doc(db, 'users', userId, 'revolutionary_onboarding', tenantId));
          logger.info(`🗑️ [Migration] Deleted revolutionary_onboarding for user ${userId}, tenant ${tenantId}`);
        }

        stats.migratedUsers++;
      } catch (error) {
        stats.errors++;
        logger.error(`❌ [Migration] Erro ao migrar user ${userId}`, error as Error);
      }
    }

    logger.info('✅ [Migration] Migração concluída!');
    logger.info('📊 [Migration] Estatísticas:', stats);

  } catch (error) {
    logger.error('❌ [Migration] Erro fatal na migração', error as Error);
    throw error;
  }
}

// Execute migration
if (require.main === module) {
  migrateOnboardingData()
    .then(() => {
      logger.info('🎉 [Migration] Script finalizado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 [Migration] Script falhou', error);
      process.exit(1);
    });
}

export { migrateOnboardingData };
