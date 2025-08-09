#!/usr/bin/env node
// scripts/health-check.ts
// Script de monitoramento de saúde do sistema

import { logger } from '../lib/utils/logger';
import { TenantServiceFactory } from '../lib/firebase/firestore-v2';
import { sofiaAnalytics } from '../lib/services/sofia-analytics-service';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  details?: any;
}

class HealthChecker {
  private results: HealthCheckResult[] = [];
  private tenantId: string;

  constructor(tenantId: string = process.env.DEFAULT_TENANT_ID || 'default') {
    this.tenantId = tenantId;
  }

  async checkAll(): Promise<void> {
    logger.info('🏥 [Health Check] Starting system health check...');
    
    await Promise.all([
      this.checkFirestore(),
      this.checkSofiaAgent(),
      this.checkAnalytics(),
      this.checkCRM(),
      this.checkProperties(),
      this.checkReservations()
    ]);

    this.printResults();
    this.exitWithCode();
  }

  private async checkFirestore(): Promise<void> {
    const start = Date.now();
    try {
      // Tenta fazer uma query simples
      const testQuery = query(
        collection(db, `tenants/${this.tenantId}/properties`),
        where('isActive', '==', true)
      );
      await getDocs(testQuery);
      
      this.results.push({
        service: 'Firestore',
        status: 'healthy',
        responseTime: Date.now() - start
      });
    } catch (error) {
      this.results.push({
        service: 'Firestore',
        status: 'down',
        responseTime: Date.now() - start,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async checkSofiaAgent(): Promise<void> {
    const start = Date.now();
    try {
      // Verifica se consegue obter métricas em tempo real
      const metrics = await sofiaAnalytics.getRealTimeMetrics(this.tenantId);
      
      const status = metrics.avgResponseTime < 5000 ? 'healthy' : 
                     metrics.avgResponseTime < 10000 ? 'degraded' : 'down';
      
      this.results.push({
        service: 'Sofia AI Agent',
        status,
        responseTime: Date.now() - start,
        details: {
          activeConversations: metrics.activeConversations,
          todayConversations: metrics.todayConversations,
          avgResponseTime: metrics.avgResponseTime
        }
      });
    } catch (error) {
      this.results.push({
        service: 'Sofia AI Agent',
        status: 'down',
        responseTime: Date.now() - start,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async checkAnalytics(): Promise<void> {
    const start = Date.now();
    try {
      const services = new TenantServiceFactory(this.tenantId);
      const aggregatedMetrics = await sofiaAnalytics.getAggregatedMetrics(
        this.tenantId, 
        'daily', 
        1
      );
      
      const hasRecentData = aggregatedMetrics.length > 0 && 
        new Date(aggregatedMetrics[0].date).toDateString() === new Date().toDateString();
      
      this.results.push({
        service: 'Analytics Service',
        status: hasRecentData ? 'healthy' : 'degraded',
        responseTime: Date.now() - start,
        details: {
          hasRecentData,
          lastUpdate: aggregatedMetrics[0]?.date
        }
      });
    } catch (error) {
      this.results.push({
        service: 'Analytics Service',
        status: 'down',
        responseTime: Date.now() - start,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async checkCRM(): Promise<void> {
    const start = Date.now();
    try {
      const services = new TenantServiceFactory(this.tenantId);
      const leads = await services.leads.getMany([], 1);
      const clients = await services.clients.getMany([], 1);
      
      this.results.push({
        service: 'CRM Module',
        status: 'healthy',
        responseTime: Date.now() - start,
        details: {
          accessible: true,
          hasData: leads.length > 0 || clients.length > 0
        }
      });
    } catch (error) {
      this.results.push({
        service: 'CRM Module',
        status: 'down',
        responseTime: Date.now() - start,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async checkProperties(): Promise<void> {
    const start = Date.now();
    try {
      const services = new TenantServiceFactory(this.tenantId);
      const properties = await services.properties.getMany(
        [{ field: 'isActive', operator: '==', value: true }],
        5
      );
      
      const status = properties.length > 0 ? 'healthy' : 'degraded';
      
      this.results.push({
        service: 'Properties Service',
        status,
        responseTime: Date.now() - start,
        details: {
          activeProperties: properties.length
        }
      });
    } catch (error) {
      this.results.push({
        service: 'Properties Service',
        status: 'down',
        responseTime: Date.now() - start,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async checkReservations(): Promise<void> {
    const start = Date.now();
    try {
      const services = new TenantServiceFactory(this.tenantId);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const reservations = await services.reservations.getMany(
        [{ field: 'createdAt', operator: '>=', value: Timestamp.fromDate(today) }]
      );
      
      this.results.push({
        service: 'Reservations Service',
        status: 'healthy',
        responseTime: Date.now() - start,
        details: {
          todayReservations: reservations.length
        }
      });
    } catch (error) {
      this.results.push({
        service: 'Reservations Service',
        status: 'down',
        responseTime: Date.now() - start,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private printResults(): void {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║              SYSTEM HEALTH CHECK RESULTS               ║');
    console.log('╠════════════════════════════════════════════════════════╣');
    
    const maxServiceLength = Math.max(...this.results.map(r => r.service.length));
    
    this.results.forEach(result => {
      const statusIcon = result.status === 'healthy' ? '✅' : 
                        result.status === 'degraded' ? '⚠️' : '❌';
      const statusColor = result.status === 'healthy' ? '\x1b[32m' : 
                         result.status === 'degraded' ? '\x1b[33m' : '\x1b[31m';
      const resetColor = '\x1b[0m';
      
      const servicePadded = result.service.padEnd(maxServiceLength);
      const statusPadded = result.status.padEnd(10);
      const responseTime = `${result.responseTime}ms`.padEnd(8);
      
      console.log(
        `║ ${statusIcon} ${servicePadded} │ ${statusColor}${statusPadded}${resetColor} │ ${responseTime} ║`
      );
      
      if (result.details && result.status !== 'healthy') {
        console.log(`║    └─ ${JSON.stringify(result.details).slice(0, 45)}... ║`);
      }
    });
    
    console.log('╚════════════════════════════════════════════════════════╝');
    
    // Summary
    const healthy = this.results.filter(r => r.status === 'healthy').length;
    const degraded = this.results.filter(r => r.status === 'degraded').length;
    const down = this.results.filter(r => r.status === 'down').length;
    const total = this.results.length;
    
    console.log('\n📊 Summary:');
    console.log(`   Healthy: ${healthy}/${total}`);
    if (degraded > 0) console.log(`   Degraded: ${degraded}/${total}`);
    if (down > 0) console.log(`   Down: ${down}/${total}`);
    
    const overallStatus = down > 0 ? 'CRITICAL' : 
                         degraded > 0 ? 'WARNING' : 'HEALTHY';
    const statusColor = down > 0 ? '\x1b[31m' : 
                       degraded > 0 ? '\x1b[33m' : '\x1b[32m';
    
    console.log(`\n${statusColor}Overall Status: ${overallStatus}\x1b[0m\n`);
  }

  private exitWithCode(): void {
    const hasDown = this.results.some(r => r.status === 'down');
    const hasDegraded = this.results.some(r => r.status === 'degraded');
    
    if (hasDown) {
      process.exit(2); // Critical
    } else if (hasDegraded) {
      process.exit(1); // Warning
    } else {
      process.exit(0); // Success
    }
  }
}

// Execute health check
async function main() {
  try {
    const checker = new HealthChecker();
    await checker.checkAll();
  } catch (error) {
    logger.error('❌ [Health Check] Fatal error', { error });
    process.exit(3);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { HealthChecker };