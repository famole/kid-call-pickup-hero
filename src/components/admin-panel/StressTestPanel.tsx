
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Play, Square, TrendingUp, Users, Clock, CheckCircle, XCircle } from 'lucide-react';
import { runStressTest, StressTestConfig, StressTestResults } from '@/utils/stressTest';
import { logger } from '@/utils/logger';

const StressTestPanel: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<StressTestResults | null>(null);
  const [progress, setProgress] = useState(0);
  const [config, setConfig] = useState<StressTestConfig>({
    concurrentUsers: 10,
    testDurationMs: 30000,
    operationsPerUser: 20,
    includeRealtime: true,
    testScenarios: []
  });

  const handleRunTest = async () => {
    setIsRunning(true);
    setProgress(0);
    setResults(null);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 2, 95));
      }, 300);

      const testResults = await runStressTest(config);
      
      clearInterval(progressInterval);
      setProgress(100);
      setResults(testResults);
    } catch (error) {
      logger.error('Stress test failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const handleStopTest = () => {
    setIsRunning(false);
    setProgress(0);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Stress Test Configuration
          </CardTitle>
          <CardDescription>
            Configure and run performance tests on your Supabase functions and app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="concurrentUsers">Concurrent Users</Label>
              <Input
                id="concurrentUsers"
                type="number"
                min="1"
                max="100"
                value={config.concurrentUsers}
                onChange={(e) => setConfig(prev => ({ 
                  ...prev, 
                  concurrentUsers: parseInt(e.target.value) || 1 
                }))}
                disabled={isRunning}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="testDuration">Test Duration (seconds)</Label>
              <Input
                id="testDuration"
                type="number"
                min="10"
                max="300"
                value={config.testDurationMs / 1000}
                onChange={(e) => setConfig(prev => ({ 
                  ...prev, 
                  testDurationMs: (parseInt(e.target.value) || 10) * 1000 
                }))}
                disabled={isRunning}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="operationsPerUser">Operations per User</Label>
              <Input
                id="operationsPerUser"
                type="number"
                min="1"
                max="100"
                value={config.operationsPerUser}
                onChange={(e) => setConfig(prev => ({ 
                  ...prev, 
                  operationsPerUser: parseInt(e.target.value) || 1 
                }))}
                disabled={isRunning}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="includeRealtime"
                checked={config.includeRealtime}
                onCheckedChange={(checked) => setConfig(prev => ({ 
                  ...prev, 
                  includeRealtime: checked 
                }))}
                disabled={isRunning}
              />
              <Label htmlFor="includeRealtime">Include Real-time Tests</Label>
            </div>
          </div>

          <div className="mt-6 flex gap-4">
            <Button 
              onClick={handleRunTest} 
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              {isRunning ? 'Running...' : 'Start Stress Test'}
            </Button>
            
            {isRunning && (
              <Button 
                variant="destructive"
                onClick={handleStopTest}
                className="flex items-center gap-2"
              >
                <Square className="h-4 w-4" />
                Stop Test
              </Button>
            )}
          </div>

          {isRunning && (
            <div className="mt-4">
              <Label>Test Progress</Label>
              <Progress value={progress} className="mt-2" />
              <p className="text-sm text-muted-foreground mt-1">
                Running stress test... {progress.toFixed(0)}%
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Test Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
                <TabsTrigger value="errors">Errors</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                        <div>
                          <p className="text-2xl font-bold">{results.totalOperations}</p>
                          <p className="text-xs text-muted-foreground">Total Operations</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <div>
                          <p className="text-2xl font-bold">
                            {((results.successfulOperations / results.totalOperations) * 100).toFixed(1)}%
                          </p>
                          <p className="text-xs text-muted-foreground">Success Rate</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-orange-500" />
                        <div>
                          <p className="text-2xl font-bold">{results.averageResponseTime.toFixed(0)}ms</p>
                          <p className="text-xs text-muted-foreground">Avg Response</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-purple-500" />
                        <div>
                          <p className="text-2xl font-bold">{results.operationsPerSecond.toFixed(1)}</p>
                          <p className="text-xs text-muted-foreground">Ops/Second</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Performance Metrics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span>Min Response Time:</span>
                        <span className="font-mono">{results.minResponseTime.toFixed(2)}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Max Response Time:</span>
                        <span className="font-mono">{results.maxResponseTime.toFixed(2)}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Successful:</span>
                        <span className="font-mono text-green-600">{results.successfulOperations}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Failed:</span>
                        <span className="font-mono text-red-600">{results.failedOperations}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Performance Grade</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const successRate = (results.successfulOperations / results.totalOperations) * 100;
                        const avgResponseTime = results.averageResponseTime;
                        
                        let grade = 'F';
                        let color = 'text-red-500';
                        let message = 'Poor performance';
                        
                        if (successRate >= 99 && avgResponseTime < 100) {
                          grade = 'A+';
                          color = 'text-green-500';
                          message = 'Excellent performance';
                        } else if (successRate >= 95 && avgResponseTime < 200) {
                          grade = 'A';
                          color = 'text-green-500';
                          message = 'Very good performance';
                        } else if (successRate >= 90 && avgResponseTime < 500) {
                          grade = 'B';
                          color = 'text-yellow-500';
                          message = 'Good performance';
                        } else if (successRate >= 80 && avgResponseTime < 1000) {
                          grade = 'C';
                          color = 'text-orange-500';
                          message = 'Average performance';
                        } else if (successRate >= 70) {
                          grade = 'D';
                          color = 'text-red-400';
                          message = 'Below average performance';
                        }
                        
                        return (
                          <div className="text-center">
                            <div className={`text-6xl font-bold ${color}`}>{grade}</div>
                            <p className="text-sm text-muted-foreground mt-2">{message}</p>
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="scenarios" className="space-y-4">
                <div className="space-y-4">
                  {Object.entries(results.scenarioResults).map(([name, result]) => (
                    <Card key={name}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold">{name}</h3>
                          <span className={`text-sm px-2 py-1 rounded ${
                            result.errors === 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {((result.count - result.errors) / result.count * 100).toFixed(1)}% success
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Count:</span>
                            <span className="ml-2 font-mono">{result.count}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Avg Time:</span>
                            <span className="ml-2 font-mono">{result.avgTime.toFixed(2)}ms</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Errors:</span>
                            <span className="ml-2 font-mono text-red-600">{result.errors}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="errors" className="space-y-4">
                {results.errors.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <p className="text-lg font-semibold">No Errors!</p>
                      <p className="text-muted-foreground">All operations completed successfully.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {results.errors.map((error, index) => (
                      <Card key={index}>
                        <CardContent className="pt-4">
                          <div className="flex items-start gap-2">
                            <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <span className="font-semibold text-sm">{error.operation}</span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(error.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                              <p className="text-sm text-red-600 mt-1">{error.error}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Important Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Stress tests will create real data in your database. Clean up test data if needed.</p>
          <p>• High concurrent user counts may affect your Supabase plan limits.</p>
          <p>• Real-time tests create multiple websocket connections.</p>
          <p>• Monitor your Supabase dashboard during tests for resource usage.</p>
          <p>• Consider running tests during off-peak hours in production environments.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default StressTestPanel;
