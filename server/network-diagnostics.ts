import { exec } from 'child_process';
import { promisify } from 'util';
import * as net from 'net';
import * as dns from 'dns';

const execAsync = promisify(exec);
const dnsResolve = promisify(dns.resolve);

export interface NetworkDiagnostics {
  serverName: string;
  instanceName?: string;
  dnsResolution: {
    success: boolean;
    ip?: string;
    error?: string;
  };
  portTest: {
    success: boolean;
    port?: number;
    error?: string;
  };
  ping: {
    success: boolean;
    responseTime?: number;
    error?: string;
  };
  suggestions: string[];
}

/**
 * Run network diagnostics for SQL Server connection issues
 */
export async function runNetworkDiagnostics(serverName: string): Promise<NetworkDiagnostics> {
  const suggestions: string[] = [];
  let parsedServer = serverName;
  let instanceName = '';

  // Parse server and instance name
  if (serverName.includes('\\')) {
    const parts = serverName.split('\\');
    parsedServer = parts[0];
    instanceName = parts[1];
  }

  const diagnostics: NetworkDiagnostics = {
    serverName: parsedServer,
    instanceName,
    dnsResolution: { success: false },
    portTest: { success: false },
    ping: { success: false },
    suggestions
  };

  // Test DNS resolution
  try {
    const addresses = await dnsResolve(parsedServer);
    diagnostics.dnsResolution = {
      success: true,
      ip: addresses[0]
    };
    console.log(`✅ DNS resolution successful: ${parsedServer} → ${addresses[0]}`);
  } catch (error: any) {
    diagnostics.dnsResolution = {
      success: false,
      error: error.message
    };
    console.log(`❌ DNS resolution failed: ${error.message}`);
    
    suggestions.push('DNS resolution failed. Check if server name is correct');
    suggestions.push('Try using IP address instead of server name');
    suggestions.push('Check network connectivity and DNS settings');
    
    if (parsedServer.includes('-')) {
      suggestions.push('Server names with hyphens sometimes have DNS issues - try IP address');
    }
  }

  // Test ping
  try {
    const { stdout } = await execAsync(`ping -c 1 -W 5000 ${parsedServer}`);
    const match = stdout.match(/time=(\d+\.?\d*)/);
    const responseTime = match ? parseFloat(match[1]) : undefined;
    
    diagnostics.ping = {
      success: true,
      responseTime
    };
    console.log(`✅ Ping successful: ${responseTime}ms`);
  } catch (error: any) {
    diagnostics.ping = {
      success: false,
      error: error.message
    };
    console.log(`❌ Ping failed: ${error.message}`);
    
    suggestions.push('Server is not reachable via ping');
    suggestions.push('Check if server is running and accessible on the network');
    suggestions.push('Verify firewall settings allow ICMP and SQL Server ports');
  }

  // Test SQL Server port (1433 for default instance, dynamic for named instances)
  const testPort = instanceName ? 1434 : 1433; // SQL Browser service for named instances
  
  try {
    const portOpen = await testTcpPort(parsedServer, testPort, 5000);
    diagnostics.portTest = {
      success: portOpen,
      port: testPort
    };
    
    if (portOpen) {
      console.log(`✅ Port ${testPort} is open`);
    } else {
      diagnostics.portTest.error = `Port ${testPort} is closed or filtered`;
      console.log(`❌ Port ${testPort} is closed or filtered`);
      
      if (instanceName) {
        suggestions.push(`SQL Browser service (port 1434) is not responding`);
        suggestions.push('Named instances require SQL Browser service to be running');
        suggestions.push('Check SQL Server Configuration Manager');
      } else {
        suggestions.push(`SQL Server port ${testPort} is not accessible`);
        suggestions.push('Check if SQL Server is running and configured to accept TCP connections');
        suggestions.push('Verify firewall allows SQL Server port');
      }
    }
  } catch (error: any) {
    diagnostics.portTest = {
      success: false,
      error: error.message
    };
    suggestions.push(`Port test failed: ${error.message}`);
  }

  // Additional suggestions based on common issues
  if (instanceName) {
    suggestions.push('For named instances, ensure SQL Server Browser service is running');
    suggestions.push('Consider using a specific port instead of dynamic port');
  }

  if (parsedServer.toUpperCase().includes('WSERVER')) {
    suggestions.push('This appears to be a Windows server - verify Windows firewall settings');
    suggestions.push('Check if remote connections are enabled in SQL Server Configuration');
  }

  return diagnostics;
}

/**
 * Test if a TCP port is open
 */
function testTcpPort(host: string, port: number, timeout: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    
    socket.setTimeout(timeout);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.connect(port, host);
  });
}