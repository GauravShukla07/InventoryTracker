/**
 * FILE ROLE: Database Connection Testing Utility Component
 * 
 * PURPOSE:
 * Provides a comprehensive testing interface for SQL Server database connections
 * with role-based authentication testing, SQL query execution, and diagnostic capabilities.
 * Essential tool for validating database connectivity, user permissions, and troubleshooting.
 * 
 * KEY FEATURES:
 * 1. Connection Testing - Validates database connectivity with custom credentials
 * 2. SQL Query Execution - Tests queries with role-specific permissions and error handling
 * 3. Preset Connection Tests - Quick tests for predefined role-based users
 * 4. Environment Diagnostics - System configuration and connection status information
 * 
 * AUTHENTICATION TESTING:
 * - Tests john_login_user authentication connection
 * - Validates role-based user connections (admin, manager, operator, viewer)
 * - Shows detailed error messages for permission violations
 * - Displays connection timing and server information
 * 
 * SQL QUERY CAPABILITIES:
 * - Execute custom SELECT, INSERT, UPDATE, DELETE queries
 * - Quick query buttons for common database operations
 * - Tabular display of query results with proper formatting
 * - Comprehensive error handling with SQL state codes
 * - Query execution metrics (timing, row counts, affected rows)
 * 
 * DATABASE CONFIGURATION:
 * - Server: 163.227.186.23 (Windows SQL Server)
 * - Port: 2499 (non-standard for security)
 * - Database: USE InventoryDB
 * - Authentication: SQL Server Authentication
 * - Connection: Non-encrypted (internal network)
 */

// React and UI component imports
import React, { useState } from "react";                                        // React hooks for state management
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";  // Card components for layout
import { Button } from "@/components/ui/button";                               // Button component for actions
import { Input } from "@/components/ui/input";                                 // Input component for form fields
import { Label } from "@/components/ui/label";                                 // Label component for form labels
import { Checkbox } from "@/components/ui/checkbox";                           // Checkbox for boolean options
import { Textarea } from "@/components/ui/textarea";                           // Textarea for SQL query input
import { Alert, AlertDescription } from "@/components/ui/alert";               // Alert components for messages
import { Badge } from "@/components/ui/badge";                                 // Badge for status indicators
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Tab components for organization
import { Separator } from "@/components/ui/separator";                         // Visual separator component
import { Database, CheckCircle, XCircle, Clock, Server, Shield, AlertTriangle, ArrowLeft } from "lucide-react"; // Icons
import { Link } from "wouter";                                                 // Navigation component

/**
 * CONNECTION PARAMETERS INTERFACE
 * Defines the structure for SQL Server connection configuration
 */
interface ConnectionParams {
  server: string;                    // SQL Server IP address (163.227.186.23)
  database: string;                  // Target database name (USE InventoryDB)
  uid: string;                       // Username for SQL Server Authentication
  pwd: string;                       // Password for SQL Server Authentication
  port?: number;                     // SQL Server port (2499)
  encrypt?: boolean;                 // Enable/disable connection encryption
  trustServerCertificate?: boolean;  // Trust self-signed certificates
  connectTimeout?: number;           // Connection timeout in milliseconds
}

/**
 * CONNECTION TEST RESULT INTERFACE
 * Contains the results of database connection testing
 */
interface ConnectionResult {
  success: boolean;                  // Whether connection was successful
  message: string;                   // Human-readable result message
  connectionTime?: number;           // Connection establishment time in ms
  serverInfo?: {                     // SQL Server information
    version?: string;                // SQL Server version string
    productName?: string;            // Product name (Microsoft SQL Server)
  };
  details?: any;                     // Additional connection details
  error?: string;                    // Error message if connection failed
}

/**
 * SQL QUERY RESULT INTERFACE
 * Contains the results of SQL query execution
 */
interface QueryResult {
  success: boolean;                  // Whether query executed successfully
  message: string;                   // Human-readable result message
  executionTime?: number;            // Query execution time in milliseconds
  rowCount?: number;                 // Number of rows returned by SELECT queries
  columns?: string[];                // Column names in result set
  data?: any[];                      // Query result data rows
  affectedRows?: number;             // Number of rows affected by INSERT/UPDATE/DELETE
  error?: string;                    // Error message if query failed
  sqlState?: string;                 // SQL error state code
  details?: any;                     // Additional error details from SQL Server
}

/**
 * CONNECTION TEST COMPONENT
 * Main component for database connection testing and SQL query execution
 */
export default function ConnectionTest() {
  // CONNECTION PARAMETERS STATE
  // Stores user-configured database connection settings
  const [connectionParams, setConnectionParams] = useState<ConnectionParams>({
    server: '163.227.186.23',        // Fixed SQL Server IP address
    database: 'USE InventoryDB',     // Target inventory database
    uid: '',                         // User-provided database username
    pwd: '',                         // User-provided database password
    encrypt: false,                  // Disabled for internal network
    trustServerCertificate: true,    // Trust self-signed certificates
    connectTimeout: 15000            // 15-second connection timeout
  });

  // CONNECTION TEST STATE MANAGEMENT
  const [testResult, setTestResult] = useState<ConnectionResult | null>(null);        // Current connection test result
  const [isLoading, setIsLoading] = useState(false);                                  // Connection test loading state
  const [presetResults, setPresetResults] = useState<ConnectionResult[]>([]);         // Results from preset connection tests
  const [environmentInfo, setEnvironmentInfo] = useState<any>(null);                  // System environment information
  const [isConnected, setIsConnected] = useState(false);                             // Track successful connection state
  
  // SQL QUERY EXECUTION STATE MANAGEMENT
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM users');                    // Current SQL query text
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);          // SQL query execution result
  const [isQueryLoading, setIsQueryLoading] = useState(false);                       // Query execution loading state

  /**
   * HANDLE INPUT CHANGE
   * Updates connection parameters when user modifies form fields
   * Supports string, boolean, and number input types for comprehensive configuration
   * 
   * @param field - The connection parameter field to update
   * @param value - The new value for the specified field
   */
  const handleInputChange = (field: keyof ConnectionParams, value: string | boolean | number) => {
    setConnectionParams(prev => ({
      ...prev,              // Preserve existing connection parameters
      [field]: value        // Update the specified field with new value
    }));
    
    // RESET CONNECTION STATE WHEN PARAMETERS CHANGE
    // Force user to re-test connection when credentials or settings change
    if (field === 'uid' || field === 'pwd' || field === 'server' || field === 'database') {
      setIsConnected(false);
      setTestResult(null);
      setQueryResult(null);  // Clear query results since connection changed
    }
  };

  /**
   * EXECUTE SQL QUERY
   * Sends SQL query to backend for execution using established connection
   * Requires successful connection test before allowing query execution
   * Provides comprehensive error handling and result display capabilities
   */
  const executeQuery = async () => {
    // CONNECTION STATE VALIDATION
    // Ensure connection has been tested and is successful before allowing queries
    if (!isConnected || !testResult?.success) {
      alert('Please test the connection first and ensure it is successful before running queries');
      return;
    }

    // CREDENTIAL VALIDATION
    // Double-check that credentials are still available
    if (!connectionParams.uid || !connectionParams.pwd) {
      alert('Connection credentials are missing. Please test connection again.');
      return;
    }

    // QUERY VALIDATION
    if (!sqlQuery.trim()) {
      alert('Please enter a SQL query to execute');
      return;
    }

    // INITIALIZE QUERY EXECUTION STATE
    setIsQueryLoading(true);        // Show loading spinner during query execution
    setQueryResult(null);           // Clear previous query results

    try {
      // SEND QUERY TO BACKEND API USING ESTABLISHED CONNECTION
      // POST request to execute-query endpoint with verified connection params and SQL query
      const response = await fetch('/api/database/execute-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',    // JSON payload for API request
        },
        body: JSON.stringify({
          ...connectionParams,      // Include all verified connection configuration
          port: 2499,              // Fixed port for SQL Server
          query: sqlQuery,         // SQL query text to execute
          useEstablishedConnection: true  // Flag to indicate using established connection
        })
      });

      // PROCESS QUERY RESPONSE
      const result = await response.json();      // Parse JSON response from backend
      setQueryResult(result);                    // Update UI with query results
      
    } catch (error) {
      // HANDLE NETWORK OR API ERRORS
      // Display user-friendly error message when query execution fails
      setQueryResult({
        success: false,
        message: 'Failed to execute query',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      // CLEANUP LOADING STATE
      setIsQueryLoading(false);     // Hide loading spinner regardless of result
    }
  };

  /**
   * TEST DATABASE CONNECTION
   * Validates database connectivity using current connection parameters
   * Provides detailed feedback on connection success/failure with timing metrics
   * Tests authentication and basic server information retrieval
   */
  const testConnection = async () => {
    // INITIALIZE CONNECTION TEST STATE
    setIsLoading(true);             // Show loading spinner during connection test
    setTestResult(null);            // Clear previous test results

    try {
      // SEND CONNECTION TEST REQUEST
      // POST request to test-connection endpoint with current parameters
      const response = await fetch('/api/database/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',    // JSON payload for API request
        },
        body: JSON.stringify({
          ...connectionParams,      // Include all connection configuration
          port: 2499               // Fixed port for SQL Server connection
        })
      });

      // PROCESS CONNECTION TEST RESPONSE
      const result = await response.json();      // Parse JSON response from backend
      setTestResult(result);                     // Update UI with connection test results
      setIsConnected(result.success);            // Track successful connection state for query execution
      
    } catch (error) {
      // HANDLE CONNECTION TEST ERRORS
      // Display user-friendly error message when connection test fails
      setTestResult({
        success: false,
        message: 'Failed to test connection',
        error: error instanceof Error ? error.message : 'Network error occurred'
      });
      setIsConnected(false);        // Mark connection as failed
    } finally {
      // CLEANUP LOADING STATE
      setIsLoading(false);          // Hide loading spinner regardless of result
    }
  };

  /**
   * TEST PRESET CONNECTIONS
   * Executes connection tests for predefined role-based database users
   * Useful for validating all authentication paths and role configurations
   */
  const testPresetConnections = async () => {
    // INITIALIZE PRESET TEST STATE
    setIsLoading(true);             // Show loading spinner during preset tests
    setPresetResults([]);           // Clear previous preset test results

    try {
      // FETCH PRESET CONNECTION TEST RESULTS
      const response = await fetch('/api/database/test-presets');
      const data = await response.json();
      setPresetResults(data.results || []);      // Update UI with preset test results
    } catch (error) {
      // LOG PRESET TEST ERRORS
      console.error('Failed to test preset connections:', error);
    } finally {
      // CLEANUP LOADING STATE
      setIsLoading(false);          // Hide loading spinner regardless of result
    }
  };

  /**
   * LOAD ENVIRONMENT INFORMATION
   * Retrieves system configuration and database environment details
   * Provides diagnostic information for troubleshooting connection issues
   */
  const loadEnvironmentInfo = async () => {
    try {
      // FETCH ENVIRONMENT CONFIGURATION
      const response = await fetch('/api/database/environment');
      const data = await response.json();
      setEnvironmentInfo(data.environment);      // Store environment info for display
    } catch (error) {
      // LOG ENVIRONMENT INFO ERRORS
      console.error('Failed to load environment info:', error);
    }
  };

  /**
   * LOAD DEFAULT CREDENTIALS
   * Populates connection form with predefined credential sets
   * Supports quick testing of different user roles and authentication scenarios
   * 
   * @param preset - The credential preset to load (john, admin, operator)
   */
  const loadDefaultCredentials = (preset: 'john' | 'admin' | 'operator') => {
    // PREDEFINED CREDENTIAL SETS
    // Maps preset names to their corresponding database credentials
    const defaults = {
      john: { uid: 'john_login_user', pwd: 'StrongPassword1!' },        // Authentication user
      admin: { uid: 'admin_user', pwd: 'AdminPass123!' },               // Administrative privileges
      operator: { uid: 'inventory_operator', pwd: 'InventoryOp123!' }   // Operational privileges
    };

    // UPDATE CONNECTION PARAMETERS
    // Merge selected preset credentials with existing connection settings
    setConnectionParams(prev => ({
      ...prev,                      // Preserve existing connection settings
      ...defaults[preset]           // Override with selected preset credentials
    }));
    
    // RESET CONNECTION STATE
    // Clear connection state when credentials change to force re-testing
    setIsConnected(false);
    setTestResult(null);
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
              {!isConnected && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Please test the connection successfully in the Custom Connection tab before executing queries
                  </AlertDescription>
                </Alert>
              )}

              {isConnected && (
                <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    Connection established successfully. You can now execute SQL queries.
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
                disabled={isQueryLoading || !isConnected || !sqlQuery.trim()}
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