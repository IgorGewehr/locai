#!/usr/bin/env node

/**
 * Script para testar o agente de IA
 * 
 * Uso:
 * node scripts/test-agent.js
 * node scripts/test-agent.js --scenario "Busca simples por apartamento"
 * node scripts/test-agent.js --verbose
 */

const { AgentEvaluator } = require('../lib/tests/agent-evaluator');

async function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose');
  const scenarioIndex = args.findIndex(arg => arg === '--scenario');
  const specificScenario = scenarioIndex !== -1 ? args[scenarioIndex + 1] : null;

  console.log('🤖 LocAI Agent Testing Suite');
  console.log('============================\n');

  try {
    const evaluator = new AgentEvaluator();

    if (specificScenario) {
      console.log(`🎯 Running specific scenario: ${specificScenario}\n`);
      
      const result = await evaluator.runScenario(specificScenario);
      
      if (result) {
        console.log(`📊 Result: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
        console.log(`⏱️  Execution Time: ${result.executionTime}ms`);
        console.log(`🎯 Confidence: ${result.confidence}`);
        console.log(`💬 Response: ${result.actualResponse}`);
        
        if (result.errors.length > 0) {
          console.log(`❌ Errors: ${result.errors.join(', ')}`);
        }
      }
    } else {
      console.log('🧪 Running all test scenarios...\n');
      
      const results = await evaluator.runAllTests();
      const report = evaluator.generateReport(results);
      
      console.log(report);
      
      if (verbose) {
        console.log('\n📋 DETAILED RESULTS:');
        results.results.forEach(result => {
          console.log(`\n${result.passed ? '✅' : '❌'} ${result.scenario}`);
          console.log(`   Action: ${result.actualAction}`);
          console.log(`   Time: ${result.executionTime}ms`);
          console.log(`   Confidence: ${result.confidence}`);
          if (result.errors.length > 0) {
            console.log(`   Errors: ${result.errors.join(', ')}`);
          }
        });
      }
      
      // Exit with error code if tests failed
      if (results.failedTests > 0) {
        process.exit(1);
      }
    }
    
  } catch (error) {
    console.error('❌ Error running tests:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };