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
import { Database, CheckCircle, XCircle, Clock, Server, Shield, AlertTriangle } from "lucide-react";

interface ConnectionParams {
  server: string;
  database: string;
  uid: string;
  pwd: string;
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

export default function ConnectionTest() {
  const [connectionParams, setConnectionParams] = useState<ConnectionParams>({
    server: 'WSERVER718623-I\\SQLEXPRESS',
    database: 'InventoryDB',
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

  const handleInputChange = (field: keyof ConnectionParams, value: string | boolean | number) => {
    setConnectionParams(prev => ({
      ...prev,
      [field]: value
    }));
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
        body: JSON.stringify(connectionParams)
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
      <div className="flex items-center space-x-2">
        <Database className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Database Connection Test</h1>
      </div>
      
      <p className="text-muted-foreground">
        Test database connections with custom credentials. Use this tool to verify server connectivity,
        authentication, and permissions before deployment.
      </p>

      <Tabs defaultValue="custom" className="space-y-4">
        <TabsList>
          <TabsTrigger value="custom">Custom Connection</TabsTrigger>
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
                    placeholder="WSERVER718623-I\SQLEXPRESS"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use server\instance format or IP address (e.g., 192.168.1.100\SQLEXPRESS)
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

                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>⚠️ DNS Resolution Issue Detected</strong><br/>
                    The server name "WSERVER718623-I" cannot be resolved. Try these alternatives:
                  </p>
                  <div className="grid grid-cols-1 gap-1 mt-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="justify-start text-left h-auto p-2 text-xs"
                      onClick={() => handleInputChange('server', '192.168.1.100\\SQLEXPRESS')}
                    >
                      <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-green-700 dark:text-green-400">192.168.1.100\SQLEXPRESS</code>
                      <span className="ml-2 text-muted-foreground">Try with IP address</span>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="justify-start text-left h-auto p-2 text-xs"
                      onClick={() => handleInputChange('server', 'localhost\\SQLEXPRESS')}
                    >
                      <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-blue-700 dark:text-blue-400">localhost\SQLEXPRESS</code>
                      <span className="ml-2 text-muted-foreground">If SQL Server is local</span>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="justify-start text-left h-auto p-2 text-xs"
                      onClick={() => handleInputChange('server', 'WSERVER718623-I,1433')}
                    >
                      <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-purple-700 dark:text-purple-400">WSERVER718623-I,1433</code>
                      <span className="ml-2 text-muted-foreground">Try with port number</span>
                    </Button>
                  </div>
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