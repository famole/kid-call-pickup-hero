
import { supabase } from "@/integrations/supabase/client";
import { createPickupRequest } from "@/services/pickup/createPickupRequest";
import { updatePickupRequestStatus } from "@/services/pickup/updatePickupRequest";
import { getActivePickupRequests } from "@/services/pickup/getPickupRequests";
import { getAllStudents } from "@/services/student/getStudents";
import { getAllParents } from "@/services/parentService";

export interface StressTestConfig {
  concurrentUsers: number;
  testDurationMs: number;
  operationsPerUser: number;
  includeRealtime: boolean;
  testScenarios: TestScenario[];
}

export interface TestScenario {
  name: string;
  weight: number; // 0-1, percentage of operations
  operation: () => Promise<any>;
}

export interface StressTestResults {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  operationsPerSecond: number;
  errors: Array<{
    operation: string;
    error: string;
    timestamp: number;
  }>;
  scenarioResults: Record<string, {
    count: number;
    avgTime: number;
    errors: number;
  }>;
}

class StressTestRunner {
  private config: StressTestConfig;
  private results: StressTestResults;
  private startTime: number = 0;
  private students: any[] = [];
  private parents: any[] = [];

  constructor(config: StressTestConfig) {
    this.config = config;
    this.results = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageResponseTime: 0,
      maxResponseTime: 0,
      minResponseTime: Infinity,
      operationsPerSecond: 0,
      errors: [],
      scenarioResults: {}
    };
  }

  async initialize() {
    console.log('🚀 Initializing stress test data...');
    try {
      // Load test data
      this.students = await getAllStudents();
      this.parents = await getAllParents();
      
      if (this.students.length === 0 || this.parents.length === 0) {
        throw new Error('No test data available. Please ensure students and parents exist in the database.');
      }

      console.log(`📊 Loaded ${this.students.length} students and ${this.parents.length} parents for testing`);
    } catch (error) {
      console.error('❌ Failed to initialize test data:', error);
      throw error;
    }
  }

  private getRandomStudent() {
    return this.students[Math.floor(Math.random() * this.students.length)];
  }

  private getRandomParent() {
    return this.parents[Math.floor(Math.random() * this.parents.length)];
  }

  private async executeOperation(scenario: TestScenario, userId: string): Promise<void> {
    const operationStart = performance.now();
    
    try {
      await scenario.operation();
      
      const duration = performance.now() - operationStart;
      this.updateResults(scenario.name, duration, true);
      
    } catch (error) {
      const duration = performance.now() - operationStart;
      this.updateResults(scenario.name, duration, false, error as Error);
    }
  }

  private updateResults(scenarioName: string, duration: number, success: boolean, error?: Error) {
    this.results.totalOperations++;
    
    if (success) {
      this.results.successfulOperations++;
    } else {
      this.results.failedOperations++;
      this.results.errors.push({
        operation: scenarioName,
        error: error?.message || 'Unknown error',
        timestamp: Date.now()
      });
    }

    // Update timing statistics
    this.results.maxResponseTime = Math.max(this.results.maxResponseTime, duration);
    this.results.minResponseTime = Math.min(this.results.minResponseTime, duration);

    // Update scenario-specific results
    if (!this.results.scenarioResults[scenarioName]) {
      this.results.scenarioResults[scenarioName] = {
        count: 0,
        avgTime: 0,
        errors: 0
      };
    }

    const scenarioResult = this.results.scenarioResults[scenarioName];
    const newCount = scenarioResult.count + 1;
    scenarioResult.avgTime = (scenarioResult.avgTime * scenarioResult.count + duration) / newCount;
    scenarioResult.count = newCount;
    
    if (!success) {
      scenarioResult.errors++;
    }
  }

  private async simulateUser(userId: string): Promise<void> {
    const userOperations = [];
    
    for (let i = 0; i < this.config.operationsPerUser; i++) {
      // Select random scenario based on weights
      const random = Math.random();
      let cumulativeWeight = 0;
      
      for (const scenario of this.config.testScenarios) {
        cumulativeWeight += scenario.weight;
        if (random <= cumulativeWeight) {
          userOperations.push(this.executeOperation(scenario, userId));
          break;
        }
      }
    }

    await Promise.all(userOperations);
  }

  async run(): Promise<StressTestResults> {
    console.log('🏁 Starting stress test...');
    console.log(`👥 Concurrent users: ${this.config.concurrentUsers}`);
    console.log(`⏱️ Duration: ${this.config.testDurationMs}ms`);
    console.log(`🔄 Operations per user: ${this.config.operationsPerUser}`);
    
    this.startTime = performance.now();

    // Create concurrent user simulations
    const userPromises = [];
    for (let i = 0; i < this.config.concurrentUsers; i++) {
      userPromises.push(this.simulateUser(`user-${i}`));
    }

    // Setup real-time stress test if enabled
    let realtimeChannels: any[] = [];
    if (this.config.includeRealtime) {
      console.log('📡 Setting up real-time stress test...');
      realtimeChannels = await this.setupRealtimeStressTest();
    }

    try {
      // Run all user simulations concurrently
      await Promise.all(userPromises);
    } finally {
      // Cleanup real-time channels
      realtimeChannels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    }

    const totalTime = performance.now() - this.startTime;
    
    // Calculate final statistics
    this.results.averageResponseTime = this.results.totalOperations > 0 
      ? Object.values(this.results.scenarioResults)
          .reduce((sum, result) => sum + result.avgTime * result.count, 0) / this.results.totalOperations
      : 0;
    
    this.results.operationsPerSecond = this.results.totalOperations / (totalTime / 1000);

    console.log('✅ Stress test completed!');
    this.printResults();
    
    return this.results;
  }

  private async setupRealtimeStressTest(): Promise<any[]> {
    const channels = [];
    
    // Create multiple real-time subscriptions to test real-time performance
    for (let i = 0; i < Math.min(this.config.concurrentUsers, 50); i++) {
      const channel = supabase
        .channel(`stress-test-${i}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'pickup_requests'
          },
          (payload) => {
            // Simulate real-time processing
            console.log(`📡 Real-time event received on channel ${i}:`, payload.eventType);
          }
        )
        .subscribe();
      
      channels.push(channel);
    }

    return channels;
  }

  private printResults() {
    console.log('\n📊 STRESS TEST RESULTS');
    console.log('========================');
    console.log(`Total Operations: ${this.results.totalOperations}`);
    console.log(`Successful: ${this.results.successfulOperations} (${(this.results.successfulOperations / this.results.totalOperations * 100).toFixed(2)}%)`);
    console.log(`Failed: ${this.results.failedOperations} (${(this.results.failedOperations / this.results.totalOperations * 100).toFixed(2)}%)`);
    console.log(`Average Response Time: ${this.results.averageResponseTime.toFixed(2)}ms`);
    console.log(`Max Response Time: ${this.results.maxResponseTime.toFixed(2)}ms`);
    console.log(`Min Response Time: ${this.results.minResponseTime.toFixed(2)}ms`);
    console.log(`Operations per Second: ${this.results.operationsPerSecond.toFixed(2)}`);
    
    console.log('\n📈 SCENARIO BREAKDOWN');
    console.log('=====================');
    Object.entries(this.results.scenarioResults).forEach(([name, result]) => {
      console.log(`${name}:`);
      console.log(`  Count: ${result.count}`);
      console.log(`  Avg Time: ${result.avgTime.toFixed(2)}ms`);
      console.log(`  Errors: ${result.errors}`);
      console.log(`  Success Rate: ${((result.count - result.errors) / result.count * 100).toFixed(2)}%`);
    });

    if (this.results.errors.length > 0) {
      console.log('\n❌ ERROR SUMMARY');
      console.log('================');
      const errorGroups = this.results.errors.reduce((acc, error) => {
        const key = `${error.operation}: ${error.error}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      Object.entries(errorGroups).forEach(([error, count]) => {
        console.log(`${error} (${count} times)`);
      });
    }
  }
}

// Predefined test scenarios
export const createDefaultTestScenarios = (students: any[], parents: any[]): TestScenario[] => [
  {
    name: 'Create Pickup Request',
    weight: 0.4,
    operation: async () => {
      const student = students[Math.floor(Math.random() * students.length)];
      await createPickupRequest(student.id);
    }
  },
  {
    name: 'Get Active Requests',
    weight: 0.3,
    operation: async () => {
      await getActivePickupRequests();
    }
  },
  {
    name: 'Update Request Status',
    weight: 0.2,
    operation: async () => {
      const requests = await getActivePickupRequests();
      if (requests.length > 0) {
        const request = requests[Math.floor(Math.random() * requests.length)];
        const newStatus = request.status === 'pending' ? 'called' : 'completed';
        await updatePickupRequestStatus(request.id, newStatus as any);
      }
    }
  },
  {
    name: 'Database Read Heavy',
    weight: 0.1,
    operation: async () => {
      await Promise.all([
        getAllStudents(),
        getAllParents(),
        getActivePickupRequests()
      ]);
    }
  }
];

// Main stress test function
export async function runStressTest(customConfig?: Partial<StressTestConfig>): Promise<StressTestResults> {
  const defaultConfig: StressTestConfig = {
    concurrentUsers: 10,
    testDurationMs: 30000, // 30 seconds
    operationsPerUser: 20,
    includeRealtime: true,
    testScenarios: [] // Will be populated after data load
  };

  const config = { ...defaultConfig, ...customConfig };
  
  const testRunner = new StressTestRunner(config);
  await testRunner.initialize();
  
  // Create scenarios with loaded data
  if (config.testScenarios.length === 0) {
    const students = await getAllStudents();
    const parents = await getAllParents();
    config.testScenarios = createDefaultTestScenarios(students, parents);
  }

  return await testRunner.run();
}
