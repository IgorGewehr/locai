// app/api/agent/metrics/route.ts

import { NextResponse } from 'next/server';
import { AgentMonitor } from '@/lib/monitoring/agent-monitor';

export async function GET() {
  try {
    const metrics = AgentMonitor.getMetrics();
    
    return NextResponse.json({
      success: true,
      data: {
        ...metrics,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        projectedMonthlyCost: metrics.totalCost * 30, // Projeção mensal
        efficiency: {
          cacheEfficiency: metrics.cacheHitRate > 0.6 ? 'good' : 'needs_improvement',
          costEfficiency: metrics.averageCostPerRequest < 0.01 ? 'excellent' : 'monitor',
          errorRate: metrics.errorRate < 0.05 ? 'good' : 'critical'
        }
      }
    });
    
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to get metrics' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    AgentMonitor.resetDaily();
    
    return NextResponse.json({
      success: true,
      message: 'Metrics reset successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to reset metrics' },
      { status: 500 }
    );
  }
}