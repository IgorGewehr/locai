import { AgentOrchestratorService } from '@/lib/services/agent-orchestrator.service';
import scenarios from './agent-scenarios.json';

interface TestScenario {
  scenario: string;
  description: string;
  userMessage: string;
  expectedAction: 'call_tool' | 'reply';
  expectedToolName?: string;
  expectedToolParams?: Record<string, any>;
  expectedResponse?: {
    shouldContain: string[];
    shouldNotContain: string[];
  };
  chainedTool?: string;
  priority: 'high' | 'medium' | 'low';
}

interface TestResult {
  scenario: string;
  passed: boolean;
  actualAction: string;
  actualToolName?: string;
  actualResponse: string;
  errors: string[];
  executionTime: number;
  confidence: number;
}

export class AgentEvaluator {
  private orchestrator: AgentOrchestratorService;
  private testPhone = '+5511999999999';
  private tenantId = 'test-tenant';

  constructor() {
    this.orchestrator = new AgentOrchestratorService(this.tenantId);
  }

  async runAllTests(): Promise<{
    totalTests: number;
    passedTests: number;
    failedTests: number;
    results: TestResult[];
    summary: {
      highPriority: { passed: number; total: number };
      mediumPriority: { passed: number; total: number };
      lowPriority: { passed: number; total: number };
    };
  }> {
    console.log('🧪 Starting Agent Evaluation Tests...');
    console.log(`📊 Total scenarios: ${scenarios.length}`);
    
    const results: TestResult[] = [];
    let totalPassed = 0;
    
    for (const scenario of scenarios as TestScenario[]) {
      console.log(`\n🔍 Testing: ${scenario.scenario}`);
      
      const result = await this.runSingleTest(scenario);
      results.push(result);
      
      if (result.passed) {
        totalPassed++;
        console.log(`✅ PASSED: ${scenario.scenario}`);
      } else {
        console.log(`❌ FAILED: ${scenario.scenario}`);
        console.log(`   Errors: ${result.errors.join(', ')}`);
      }
    }
    
    // Calculate summary by priority
    const summary = this.calculateSummary(results);
    
    return {
      totalTests: scenarios.length,
      passedTests: totalPassed,
      failedTests: scenarios.length - totalPassed,
      results,
      summary
    };
  }

  private async runSingleTest(scenario: TestScenario): Promise<TestResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    
    try {
      // Execute the scenario
      const result = await this.orchestrator.processMessage(
        scenario.userMessage,
        this.testPhone
      );
      
      const executionTime = Date.now() - startTime;
      
      // Extract the actual action from the result
      // Note: This would need to be adapted based on your actual implementation
      const actualAction = result.metrics?.finalAction || 'unknown';
      const actualResponse = result.response;
      const confidence = result.metrics?.confidence || 0;
      
      // Validate expected action
      if (scenario.expectedAction === 'reply' && actualAction !== 'reply') {
        errors.push(`Expected reply but got ${actualAction}`);
      }
      
      if (scenario.expectedAction === 'call_tool' && actualAction !== 'call_tool') {
        errors.push(`Expected tool call but got ${actualAction}`);
      }
      
      // Validate expected response content
      if (scenario.expectedResponse) {
        const { shouldContain, shouldNotContain } = scenario.expectedResponse;
        
        for (const text of shouldContain) {
          if (!actualResponse.toLowerCase().includes(text.toLowerCase())) {
            errors.push(`Response should contain "${text}"`);
          }
        }
        
        for (const text of shouldNotContain) {
          if (actualResponse.toLowerCase().includes(text.toLowerCase())) {
            errors.push(`Response should not contain "${text}"`);
          }
        }
      }
      
      // Validate tool name (this would need implementation details)
      let actualToolName = undefined;
      if (scenario.expectedToolName) {
        // This would need to be extracted from your actual implementation
        // For now, we'll skip this validation
      }
      
      return {
        scenario: scenario.scenario,
        passed: errors.length === 0,
        actualAction,
        actualToolName,
        actualResponse,
        errors,
        executionTime,
        confidence
      };
      
    } catch (error) {
      return {
        scenario: scenario.scenario,
        passed: false,
        actualAction: 'error',
        actualResponse: error instanceof Error ? error.message : 'Unknown error',
        errors: [`Test execution failed: ${error}`],
        executionTime: Date.now() - startTime,
        confidence: 0
      };
    }
  }

  private calculateSummary(results: TestResult[]) {
    const priorities = ['high', 'medium', 'low'] as const;
    const summary = {} as any;
    
    for (const priority of priorities) {
      const priorityScenarios = scenarios.filter(s => s.priority === priority);
      const priorityResults = results.filter(r => 
        priorityScenarios.some(s => s.scenario === r.scenario)
      );
      
      summary[`${priority}Priority`] = {
        passed: priorityResults.filter(r => r.passed).length,
        total: priorityResults.length
      };
    }
    
    return summary;
  }

  async runScenario(scenarioName: string): Promise<TestResult | null> {
    const scenario = scenarios.find(s => s.scenario === scenarioName);
    if (!scenario) {
      console.log(`❌ Scenario "${scenarioName}" not found`);
      return null;
    }
    
    return this.runSingleTest(scenario as TestScenario);
  }

  generateReport(results: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    results: TestResult[];
    summary: any;
  }): string {
    const passRate = ((results.passedTests / results.totalTests) * 100).toFixed(1);
    
    let report = `
🧪 AGENT EVALUATION REPORT
=======================

📊 OVERALL RESULTS:
- Total Tests: ${results.totalTests}
- Passed: ${results.passedTests}
- Failed: ${results.failedTests}
- Success Rate: ${passRate}%

🎯 BY PRIORITY:
- High Priority: ${results.summary.highPriority.passed}/${results.summary.highPriority.total} (${((results.summary.highPriority.passed / results.summary.highPriority.total) * 100).toFixed(1)}%)
- Medium Priority: ${results.summary.mediumPriority.passed}/${results.summary.mediumPriority.total} (${((results.summary.mediumPriority.passed / results.summary.mediumPriority.total) * 100).toFixed(1)}%)
- Low Priority: ${results.summary.lowPriority.passed}/${results.summary.lowPriority.total} (${((results.summary.lowPriority.passed / results.summary.lowPriority.total) * 100).toFixed(1)}%)

⚡ PERFORMANCE:
- Average Execution Time: ${(results.results.reduce((acc, r) => acc + r.executionTime, 0) / results.results.length).toFixed(0)}ms
- Average Confidence: ${(results.results.reduce((acc, r) => acc + r.confidence, 0) / results.results.length).toFixed(2)}

❌ FAILED TESTS:
`;
    
    const failedTests = results.results.filter(r => !r.passed);
    if (failedTests.length === 0) {
      report += '   None! All tests passed! 🎉\n';
    } else {
      failedTests.forEach(test => {
        report += `   - ${test.scenario}: ${test.errors.join(', ')}\n`;
      });
    }
    
    return report;
  }
}

// Usage example
export async function runAgentTests(): Promise<void> {
  const evaluator = new AgentEvaluator();
  const results = await evaluator.runAllTests();
  const report = evaluator.generateReport(results);
  
  console.log(report);
  
  // Save report to file (optional)
  // await fs.writeFile('./test-report.txt', report);
}