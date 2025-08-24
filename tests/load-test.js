const io = require('socket.io-client');
const axios = require('axios');

// Configuration
const CONFIG = {
  baseURL: 'http://localhost:3000',
  socketURL: 'http://localhost:3000',
  concurrentUsers: 50,
  testDuration: 60000, // 1 minute
  messageInterval: 2000, // 2 seconds
  roomsToTest: 5
};

class LoadTester {
  constructor() {
    this.users = [];
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalMessages: 0,
      successfulMessages: 0,
      failedMessages: 0,
      connectionErrors: 0,
      responseTimeSum: 0,
      maxResponseTime: 0,
      minResponseTime: Infinity,
      startTime: Date.now()
    };
    this.isRunning = false;
  }

  // Generate anonymous user
  async createAnonymousUser() {
    const startTime = Date.now();
    try {
      const response = await axios.post(`${CONFIG.baseURL}/api/auth/generate-anon-id`);
      const responseTime = Date.now() - startTime;
      
      this.updateMetrics('request', true, responseTime);
      
      return {
        anonId: response.data.anonId,
        tempToken: response.data.tempToken
      };
    } catch (error) {
      this.updateMetrics('request', false, Date.now() - startTime);
      console.error('Failed to create anonymous user:', error.message);
      return null;
    }
  }

  // Create socket connection
  createSocketConnection(user) {
    return new Promise((resolve, reject) => {
      const socket = io(CONFIG.socketURL, {
        transports: ['websocket', 'polling']
      });

      socket.on('connect', () => {
        // Authenticate
        socket.emit('auth', { tempToken: user.tempToken });
        
        socket.on('auth_success', () => {
          resolve(socket);
        });

        socket.on('auth_error', (error) => {
          this.metrics.connectionErrors++;
          reject(new Error(`Auth failed: ${error.message}`));
        });
      });

      socket.on('connect_error', (error) => {
        this.metrics.connectionErrors++;
        reject(new Error(`Connection failed: ${error.message}`));
      });

      // Set timeout
      setTimeout(() => {
        if (!socket.connected) {
          reject(new Error('Connection timeout'));
        }
      }, 5000);
    });
  }

  // Simulate user behavior
  async simulateUser(userId) {
    const user = await this.createAnonymousUser();
    if (!user) return;

    try {
      const socket = await this.createSocketConnection(user);
      
      // Join a random room
      const roomId = `test_room_${Math.floor(Math.random() * CONFIG.roomsToTest) + 1}`;
      socket.emit('join_room', { roomId });

      // Send messages periodically
      const messageInterval = setInterval(() => {
        if (!this.isRunning) {
          clearInterval(messageInterval);
          return;
        }

        const message = `Test message from user ${userId} at ${Date.now()}`;
        const startTime = Date.now();
        
        socket.emit('anon_msg', {
          text: message,
          roomId: roomId
        });

        // Track message metrics
        socket.once('msg_sent', () => {
          const responseTime = Date.now() - startTime;
          this.updateMetrics('message', true, responseTime);
        });

        socket.once('msg_error', () => {
          this.updateMetrics('message', false, Date.now() - startTime);
        });

      }, CONFIG.messageInterval + Math.random() * 1000); // Add some jitter

      // Store user info for cleanup
      this.users.push({
        userId,
        socket,
        messageInterval,
        user
      });

    } catch (error) {
      console.error(`User ${userId} simulation failed:`, error.message);
    }
  }

  // Update metrics
  updateMetrics(type, success, responseTime) {
    if (type === 'request') {
      this.metrics.totalRequests++;
      if (success) {
        this.metrics.successfulRequests++;
      } else {
        this.metrics.failedRequests++;
      }
    } else if (type === 'message') {
      this.metrics.totalMessages++;
      if (success) {
        this.metrics.successfulMessages++;
      } else {
        this.metrics.failedMessages++;
      }
    }

    // Update response time metrics
    this.metrics.responseTimeSum += responseTime;
    this.metrics.maxResponseTime = Math.max(this.metrics.maxResponseTime, responseTime);
    this.metrics.minResponseTime = Math.min(this.metrics.minResponseTime, responseTime);
  }

  // Run load test
  async runLoadTest() {
    console.log('🚀 Starting GhostLink Load Test');
    console.log(`📊 Configuration:`);
    console.log(`   - Concurrent Users: ${CONFIG.concurrentUsers}`);
    console.log(`   - Test Duration: ${CONFIG.testDuration / 1000}s`);
    console.log(`   - Message Interval: ${CONFIG.messageInterval}ms`);
    console.log(`   - Rooms to Test: ${CONFIG.roomsToTest}`);
    console.log('');

    this.isRunning = true;
    this.metrics.startTime = Date.now();

    // Create concurrent users
    const userPromises = [];
    for (let i = 1; i <= CONFIG.concurrentUsers; i++) {
      userPromises.push(this.simulateUser(i));
      
      // Stagger user creation to avoid overwhelming the server
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Wait for all users to be created
    await Promise.allSettled(userPromises);

    console.log(`✅ Created ${this.users.length} concurrent users`);

    // Run test for specified duration
    await new Promise(resolve => setTimeout(resolve, CONFIG.testDuration));

    // Stop the test
    this.isRunning = false;
    console.log('⏹️ Stopping load test...');

    // Cleanup
    this.cleanup();

    // Generate report
    this.generateReport();
  }

  // Cleanup resources
  cleanup() {
    this.users.forEach(({ socket, messageInterval }) => {
      clearInterval(messageInterval);
      if (socket && socket.connected) {
        socket.disconnect();
      }
    });
    this.users = [];
  }

  // Generate performance report
  generateReport() {
    const duration = Date.now() - this.metrics.startTime;
    const avgResponseTime = this.metrics.totalRequests > 0 
      ? this.metrics.responseTimeSum / (this.metrics.totalRequests + this.metrics.totalMessages)
      : 0;

    console.log('\n📈 LOAD TEST RESULTS');
    console.log('='.repeat(50));
    console.log(`⏱️  Test Duration: ${duration / 1000}s`);
    console.log(`👥 Concurrent Users: ${CONFIG.concurrentUsers}`);
    console.log('');
    
    console.log('🌐 HTTP Requests:');
    console.log(`   Total: ${this.metrics.totalRequests}`);
    console.log(`   Successful: ${this.metrics.successfulRequests} (${((this.metrics.successfulRequests / this.metrics.totalRequests) * 100).toFixed(1)}%)`);
    console.log(`   Failed: ${this.metrics.failedRequests} (${((this.metrics.failedRequests / this.metrics.totalRequests) * 100).toFixed(1)}%)`);
    console.log('');
    
    console.log('💬 WebSocket Messages:');
    console.log(`   Total: ${this.metrics.totalMessages}`);
    console.log(`   Successful: ${this.metrics.successfulMessages} (${((this.metrics.successfulMessages / this.metrics.totalMessages) * 100).toFixed(1)}%)`);
    console.log(`   Failed: ${this.metrics.failedMessages} (${((this.metrics.failedMessages / this.metrics.totalMessages) * 100).toFixed(1)}%)`);
    console.log('');
    
    console.log('⚡ Performance Metrics:');
    console.log(`   Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`   Min Response Time: ${this.metrics.minResponseTime === Infinity ? 'N/A' : this.metrics.minResponseTime + 'ms'}`);
    console.log(`   Max Response Time: ${this.metrics.maxResponseTime}ms`);
    console.log(`   Connection Errors: ${this.metrics.connectionErrors}`);
    console.log('');
    
    console.log('📊 Throughput:');
    console.log(`   Requests/sec: ${(this.metrics.totalRequests / (duration / 1000)).toFixed(2)}`);
    console.log(`   Messages/sec: ${(this.metrics.totalMessages / (duration / 1000)).toFixed(2)}`);
    console.log('');

    // Performance assessment
    const successRate = ((this.metrics.successfulRequests + this.metrics.successfulMessages) / 
                        (this.metrics.totalRequests + this.metrics.totalMessages)) * 100;
    
    console.log('🎯 Performance Assessment:');
    if (successRate >= 99) {
      console.log('   ✅ EXCELLENT - System performing optimally');
    } else if (successRate >= 95) {
      console.log('   ✅ GOOD - System performing well');
    } else if (successRate >= 90) {
      console.log('   ⚠️  FAIR - Some performance issues detected');
    } else {
      console.log('   ❌ POOR - Significant performance issues');
    }
    
    if (avgResponseTime < 100) {
      console.log('   ✅ Response times are excellent');
    } else if (avgResponseTime < 500) {
      console.log('   ✅ Response times are acceptable');
    } else {
      console.log('   ⚠️  Response times are slow');
    }
    
    console.log('='.repeat(50));
  }

  // Memory usage test
  async testMemoryUsage() {
    console.log('🧠 Testing Memory Usage...');
    
    const initialHealth = await axios.get(`${CONFIG.baseURL}/api/health`);
    console.log('Initial Memory:', {
      heapUsed: `${(initialHealth.data.memory.heapUsed / 1024 / 1024).toFixed(2)} MB`
    });

    // Create many connections
    const connections = [];
    const userPromises = [];
    for (let i = 0; i < 100; i++) {
      const user = await this.createAnonymousUser();
      if (user) {
        try {
          const socket = await this.createSocketConnection(user);
          connections.push(socket);
        } catch (error) {
          // Ignore connection errors for memory test
        }
      }
    }
    await Promise.all(userPromises);

    const peakHealth = await axios.get(`${CONFIG.baseURL}/api/health`);
    console.log('Peak Memory:', {
      heapUsed: `${(peakHealth.data.memory.heapUsed / 1024 / 1024).toFixed(2)} MB`
    });

    // Cleanup connections
    connections.forEach(socket => {
      if (socket && socket.connected) {
        socket.disconnect();
      }
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    const finalHealth = await axios.get(`${CONFIG.baseURL}/api/health`);
    console.log('Final Memory:', {
      heapUsed: `${(finalHealth.data.memory.heapUsed / 1024 / 1024).toFixed(2)} MB`
    });

    // Compare memory after connections are closed to initial state
    const memoryLeak = finalHealth.data.memory.heapUsed - initialHealth.data.memory.heapUsed;
    console.log(`Memory Change: ${(memoryLeak / 1024 / 1024).toFixed(2)} MB`);
    
    if (memoryLeak < 10 * 1024 * 1024) { // Less than 10MB
      console.log('✅ No significant memory leaks detected');
    } else {
      console.log('⚠️  Potential memory leak detected');
    }
  }
}

// Run tests
async function runTests() {
  const tester = new LoadTester();
  
  try {
    // Check if server is running
    await axios.get(`${CONFIG.baseURL}/api/health`);
    console.log('✅ Server is running and healthy');
    
    // Run load test
    await tester.runLoadTest();
    
    // Run memory test
    await tester.testMemoryUsage();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('Make sure the GhostLink backend is running on port 3000');
  }
}

// Export for use as module
module.exports = LoadTester;

// Run if called directly
if (require.main === module) {
  runTests().catch(console.error);
}
