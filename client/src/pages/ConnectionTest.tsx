import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Database, CheckCircle, XCircle, Clock, Server, Shield, AlertTriangle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

interface ConnectionParams {
  server: string;
  database: string;
  uid: string;
  pwd: string;
  port?: number;
  encrypt?: boolean;
  trustServerCertificate?: boolean;
  connectTimeout?: number;
}

interface ConnectionResult {
  success: boolean;
  message: string;
  connectionTime?: number;
  serverInfo?: {
    version?: string;
    productName?: string;
  };
  details?: any;
  error?: string;
}

interface QueryResult {
  success: boolean;
  message: string;
  executionTime?: number;
  rowCount?: number;
  columns?: string[];
  data?: any[];
  affectedRows?: number;
  error?: string;
  sqlState?: string;
  details?: any;
}

export default function ConnectionTest() {
  const [connectionParams, setConnectionParams] = useState<ConnectionParams>({
    server: '163.227.186.23',
    database: 'USE InventoryDB',
    uid: '',
    pwd: '',
    encrypt: false,
    trustServerCertificate: true,
    connectTimeout: 15000
  });

  const [testResult, setTestResult] = useState<ConnectionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [presetResults, setPresetResults] = useState<ConnectionResult[]>([]);
  const [environmentInfo, setEnvironmentInfo] = useState<any>(null);
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM users');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [isQueryLoading, setIsQueryLoading] = useState(false);

  const handleInputChange = (field: keyof ConnectionParams, value: string | boolean | number) => {
    setConnectionParams(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const executeQuery = async () => {
    if (!connectionParams.uid || !connectionParams.pwd) {
      alert('Please fill in username and password first');
      return;
    }

    setIsQueryLoading(true);
    setQueryResult(null);

    try {
      const response = await fetch('/api/database/execute-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...connectionParams,
          port: 2499,
          query: sqlQuery
        })
      });

      const result = await response.json();
      setQueryResult(result);
    } catch (error) {
      setQueryResult({
        success: false,
        message: 'Failed to execute query',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsQueryLoading(false);
    }
  };

  const testConnection = async () => {
    setIsLoading(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/database/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...connectionParams,
          port: 2499
        })
      });

      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Failed to test connection',
        error: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testPresetConnections = async () => {
    setIsLoading(true);
    setPresetResults([]);

    try {
      const response = await fetch('/api/database/test-presets');
      const data = await response.json();
      setPresetResults(data.results || []);
    } catch (error) {
      console.error('Failed to test preset connections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadEnvironmentInfo = async () => {
    try {
      const response = await fetch('/api/database/environment');
      const data = await response.json();
      setEnvironmentInfo(data.environment);
    } catch (error) {
      console.error('Failed to load environment info:', error);
    }
  };

  const loadDefaultCredentials = (preset: 'john' | 'admin' | 'operator') => {
    const defaults = {
      john: { uid: 'john_login_user', pwd: 'StrongPassword1!' },
      admin: { uid: 'admin_user', pwd: 'AdminPass123!' },
      operator: { uid: 'inventory_operator', pwd: 'InventoryOp123!' }
    };

    setConnectionParams(prev => ({
      ...prev,
      ...defaults[preset]
    }));
  };

  // Load environment info on component mount
  React.useEffect(() => {
    loadEnvironmentInfo();
  }, []);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Database className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Database Connection Test</h1>
        </div>
        <Link href="/login">
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Button>
        </Link>
      </div>
      
      <p className="text-muted-foreground">
        Test database connections with custom credentials. Use this tool to verify server connectivity,
        authentication, and permissions before deployment.
      </p>

      <Tabs defaultValue="custom" className="space-y-4">
        <TabsList>
          <TabsTrigger value="custom">Custom Connection</TabsTrigger>
          <TabsTrigger value="query">SQL Query</TabsTrigger>
          <TabsTrigger value="presets">Test Presets</TabsTrigger>
          <TabsTrigger value="environment">Environment Info</TabsTrigger>
        </TabsList>

        <TabsContent value="custom" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Server className="h-5 w-5" />
                <span>Connection Parameters</span>
              </CardTitle>
              <CardDescription>
                Enter database connection details to test connectivity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="server">Server</Label>
                  <Input
                    id="server"
                    value={connectionParams.server}
                    onChange={(e) => handleInputChange('server', e.target.value)}
                    placeholder="163.227.186.23"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use IP address only: 163.227.186.23
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="database">Database</Label>
                  <Input
                    id="database"
                    value={connectionParams.database}
                    onChange={(e) => handleInputChange('database', e.target.value)}
                    placeholder="USE InventoryDB"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="uid">Username (UID)</Label>
                  <Input
                    id="uid"
                    value={connectionParams.uid}
                    onChange={(e) => handleInputChange('uid', e.target.value)}
                    placeholder="username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pwd">Password (PWD)</Label>
                  <Input
                    id="pwd"
                    type="password"
                    value={connectionParams.pwd}
                    onChange={(e) => handleInputChange('pwd', e.target.value)}
                    placeholder="password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="port">Port</Label>
                  <Input
                    id="port"
                    type="number"
                    value={2499}
                    onChange={(e) => handleInputChange('port', parseInt(e.target.value))}
                    placeholder="2499"
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">Fixed port 2499</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeout">Timeout (ms)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    value={connectionParams.connectTimeout}
                    onChange={(e) => handleInputChange('connectTimeout', parseInt(e.target.value))}
                    placeholder="15000"
                  />
                </div>
              </div>

              <div className="flex space-x-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="encrypt"
                    checked={connectionParams.encrypt}
                    onCheckedChange={(checked) => handleInputChange('encrypt', checked)}
                  />
                  <Label htmlFor="encrypt">Encrypt Connection</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="trust"
                    checked={connectionParams.trustServerCertificate}
                    onCheckedChange={(checked) => handleInputChange('trustServerCertificate', checked)}
                  />
                  <Label htmlFor="trust">Trust Server Certificate</Label>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div>
                  <Label>Quick Load Credentials</Label>
                  <div className="flex space-x-2 flex-wrap gap-2 mt-2">
                    <Button variant="outline" size="sm" onClick={() => loadDefaultCredentials('john')}>
                      John (Auth User)
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => loadDefaultCredentials('admin')}>
                      Admin User
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => loadDefaultCredentials('operator')}>
                      Inventory Operator
                    </Button>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>✓ Connection Configuration</strong><br/>
                    Using IP address 163.227.186.23 with port 2499 (TCP ports filtered, using custom port)
                  </p>
                </div>
              </div>

              <Button 
                onClick={testConnection} 
                disabled={isLoading || !connectionParams.uid || !connectionParams.pwd}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Clock className="mr-2 h-4 w-4 animate-spin" />
                    Testing Connection...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Test Connection
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {testResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  {testResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span>Test Result</span>
                  {testResult.connectionTime && (
                    <Badge variant="secondary">{testResult.connectionTime}ms</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className={testResult.success ? "border-green-500" : "border-red-500"}>
                  <AlertDescription>{testResult.message}</AlertDescription>
                </Alert>

                {testResult.serverInfo && (
                  <div className="space-y-2">
                    <Label>Server Information</Label>
                    <Textarea
                      readOnly
                      value={`Product: ${testResult.serverInfo.productName}\nVersion: ${testResult.serverInfo.version}`}
                      className="text-sm"
                    />
                  </div>
                )}

                {testResult.details && (
                  <div className="space-y-2">
                    <Label>Connection Details</Label>
                    <Textarea
                      readOnly
                      value={JSON.stringify(testResult.details, null, 2)}
                      className="text-sm font-mono"
                      rows={8}
                    />
                  </div>
                )}

                {testResult.error && (
                  <div className="space-y-2">
                    <Label>Error Details</Label>
                    <Textarea
                      readOnly
                      value={testResult.error}
                      className="text-sm text-red-600"
                      rows={3}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="query" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>SQL Query Execution</span>
              </CardTitle>
              <CardDescription>
                Execute SQL queries against the database using your connection credentials
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Connection Status Check */}
              {(!connectionParams.uid || !connectionParams.pwd) && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Please set username and password in the Custom Connection tab first
                  </AlertDescription>
                </Alert>
              )}

              {/* Query Input */}
              <div className="space-y-2">
                <Label htmlFor="sqlQuery">SQL Query</Label>
                <Textarea
                  id="sqlQuery"
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  placeholder="SELECT * FROM users"
                  rows={6}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Enter your SQL query above. Examples: SELECT, INSERT, UPDATE, DELETE
                </p>
              </div>

              {/* Quick Query Buttons */}
              <div className="space-y-2">
                <Label>Quick Queries</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSqlQuery('SELECT * FROM users')}
                  >
                    All Users
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSqlQuery('SELECT UserID, Username, Email, Role FROM users WHERE IsActive = 1')}
                  >
                    Active Users
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSqlQuery('SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = \'users\'')}
                  >
                    User Table Schema
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSqlQuery('SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = \'BASE TABLE\'')}
                  >
                    All Tables
                  </Button>
                </div>
              </div>

              {/* Execute Button */}
              <Button
                onClick={executeQuery}
                disabled={isQueryLoading || !connectionParams.uid || !connectionParams.pwd || !sqlQuery.trim()}
                className="w-full"
              >
                {isQueryLoading ? (
                  <>
                    <Clock className="mr-2 h-4 w-4 animate-spin" />
                    Executing Query...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Execute Query
                  </>
                )}
              </Button>

              {/* Query Result */}
              {queryResult && (
                <div className="space-y-4">
                  <Separator />
                  <div>
                    <h3 className="font-medium mb-2">Query Result</h3>
                    <Alert className={queryResult.success ? "border-green-200 bg-green-50 dark:bg-green-900/20" : "border-red-200 bg-red-50 dark:bg-red-900/20"}>
                      {queryResult.success ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <AlertDescription>
                        <div className="space-y-2">
                          <p className={queryResult.success ? "text-green-800 dark:text-green-200" : "text-red-800 dark:text-red-200"}>
                            {queryResult.message}
                          </p>
                          {queryResult.success && (
                            <div className="text-sm text-muted-foreground">
                              <p>Execution time: {queryResult.executionTime}ms</p>
                              <p>Rows returned: {queryResult.rowCount}</p>
                              {queryResult.affectedRows > 0 && <p>Affected rows: {queryResult.affectedRows}</p>}
                            </div>
                          )}
                          {!queryResult.success && queryResult.error && (
                            <div className="text-sm text-red-700 dark:text-red-300 mt-2">
                              <p><strong>Error:</strong> {queryResult.error}</p>
                              {queryResult.sqlState && <p><strong>SQL State:</strong> {queryResult.sqlState}</p>}
                            </div>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>

                    {/* Data Results Table */}
                    {queryResult.success && queryResult.data && queryResult.data.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-medium mb-2">Query Results ({queryResult.rowCount} rows)</h4>
                        <div className="border rounded-md overflow-auto max-h-96">
                          <table className="w-full text-sm">
                            <thead className="bg-muted">
                              <tr>
                                {queryResult.columns?.map((column, index) => (
                                  <th key={index} className="p-2 text-left font-medium border-r">
                                    {column}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {queryResult.data.map((row, rowIndex) => (
                                <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-background" : "bg-muted/50"}>
                                  {queryResult.columns?.map((column, colIndex) => (
                                    <td key={colIndex} className="p-2 border-r font-mono text-xs">
                                      {row[column] !== null ? String(row[column]) : <span className="text-muted-foreground italic">NULL</span>}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Empty Result */}
                    {queryResult.success && queryResult.rowCount === 0 && (
                      <div className="mt-4 p-4 bg-muted/50 rounded-md text-center text-muted-foreground">
                        Query executed successfully but returned no rows
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="presets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Preset Connection Tests</span>
              </CardTitle>
              <CardDescription>
                Test predefined role-based connections used by the application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={testPresetConnections} disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Clock className="mr-2 h-4 w-4 animate-spin" />
                    Testing Presets...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Test All Preset Connections
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {presetResults.length > 0 && (
            <div className="space-y-4">
              {presetResults.map((result, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      {result.success ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <span>{result.message}</span>
                      {result.connectionTime && (
                        <Badge variant="secondary">{result.connectionTime}ms</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {result.details && (
                      <Textarea
                        readOnly
                        value={JSON.stringify(result.details, null, 2)}
                        className="text-sm font-mono"
                        rows={6}
                      />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="environment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5" />
                <span>Environment Configuration</span>
              </CardTitle>
              <CardDescription>
                Current database configuration and environment settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={loadEnvironmentInfo} className="mb-4">
                Refresh Environment Info
              </Button>
              
              {environmentInfo && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>SQL Server Mode</Label>
                      <Badge variant={environmentInfo.sqlServerMode ? "default" : "secondary"}>
                        {environmentInfo.sqlServerMode ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    <div>
                      <Label>Server Host</Label>
                      <p className="text-sm font-mono">{environmentInfo.serverHost}</p>
                    </div>
                    <div>
                      <Label>Database</Label>
                      <p className="text-sm font-mono">{environmentInfo.database}</p>
                    </div>
                    <div>
                      <Label>Authentication User</Label>
                      <p className="text-sm font-mono">{environmentInfo.authUser}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}