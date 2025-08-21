const io = require('socket.io-client');
const axios = require('axios');

// Realistic configuration for production testing
const CONFIG = {
  baseURL: 'http://localhost:3000',
  socketURL: 'http://localhost:3000',
  concurrentUsers: 10, // Realistic concurrent users
  testDuration: 30000, // 30 seconds
  messageInterval: 5000, // 5 seconds between messages
  roomsToTest: 3,
  userCreationDelay: 1000 // 1 second delay between user creation
};

class RealisticTester {
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
      console.error('Failed to create anonymous user:', error.response?.status || error.message);
      return null;
    }
  }

  createSocketConnection(user) {
    return new Promise((resolve, reject) => {
      const socket = io(CONFIG.socketURL, {
        transports: ['websocket', 'polling']
      });

      socket.on('connect', () => {
        resolve(socket);
      });

      socket.on('connect_error', (error) => {
        this.metrics.connectionErrors++;
        reject(new Error(`Connection failed: ${error.message}`));
      });

      setTimeout(() => {
        if (!socket.connected) {
          reject(new Error('Connection timeout'));
        }
      }, 5000);
    });
  }

  async simulateUser(userId) {
    console.log(`👤 Creating user ${userId}...`);
    
    const user = await this.createAnonymousUser();
    if (!user) {
      console.log(`❌ Failed to create user ${userId}`);
      return;
    }

    try {
      const socket = await this.createSocketConnection(user);
      console.log(`✅ User ${userId} connected (${user.anonId})`);
      
      // Join a random room
      const roomId = `test_room_${Math.floor(Math.random() * CONFIG.roomsToTest) + 1}`;
      socket.emit('join_room', { roomId });

      // Send messages periodically
      const messageInterval = setInterval(() => {
        if (!this.isRunning) {
          clearInterval(messageInterval);
          return;
        }

        const message = `Hello from ${user.anonId} at ${new Date().toLocaleTimeString()}`;
        const startTime = Date.now();
        
        socket.emit('send_message', {
          text: message,
          roomId: roomId
        });

        this.metrics.totalMessages++;
        
        // Listen for confirmation from the server
        socket.once('message_sent', () => {
          const responseTime = Date.now() - startTime;
          this.updateMetrics('message', true, responseTime);
        });

        socket.once('message_error', () => {
          this.updateMetrics('message', false, Date.now() - startTime);
        });

      }, CONFIG.messageInterval + Math.random() * 2000);

      this.users.push({
        userId,
        socket,
        messageInterval,
        user
      });

    } catch (error) {
      console.error(`❌ User ${userId} simulation failed:`, error.message);
    }
  }

  updateMetrics(type, success, responseTime) {
    if (type === 'request') {
      this.metrics.totalRequests++;
      if (success) {
        this.metrics.successfulRequests++;
      } else {
        this.metrics.failedRequests++;
      }
    } else if (type === 'message') {
      if (success) {
        this.metrics.successfulMessages++;
      } else {
        this.metrics.failedMessages++;
      }
    }

    this.metrics.responseTimeSum += responseTime;
    this.metrics.maxResponseTime = Math.max(this.metrics.maxResponseTime, responseTime);
    this.metrics.minResponseTime = Math.min(this.metrics.minResponseTime, responseTime);
  }

  async runRealisticTest() {
    console.log('🚀 Starting Realistic GhostLink Performance Test');
    console.log(`📊 Configuration:`);
    console.log(`   - Concurrent Users: ${CONFIG.concurrentUsers}`);
    console.log(`   - Test Duration: ${CONFIG.testDuration / 1000}s`);
    console.log(`   - Message Interval: ${CONFIG.messageInterval}ms`);
    console.log(`   - User Creation Delay: ${CONFIG.userCreationDelay}ms`);
    console.log('');

    this.isRunning = true;
    this.metrics.startTime = Date.now();

    // Create users with realistic delays
    for (let i = 1; i <= CONFIG.concurrentUsers; i++) {
      this.simulateUser(i);
      
      // Wait between user creation to simulate realistic load
      if (i < CONFIG.concurrentUsers) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.userCreationDelay));
      }
    }

    console.log(`⏳ Running test for ${CONFIG.testDuration / 1000} seconds...`);

    // Run test for specified duration
    await new Promise(resolve => setTimeout(resolve, CONFIG.testDuration));

    // Stop the test
    this.isRunning = false;
    console.log('⏹️ Stopping test...');

    // Cleanup
    this.cleanup();

    // Generate report
    this.generateReport();
  }

  cleanup() {
    this.users.forEach(({ socket, messageInterval }) => {
      clearInterval(messageInterval);
      if (socket && socket.connected) {
        socket.disconnect();
      }
    });
    this.users = [];
  }

  generateReport() {
    const duration = Date.now() - this.metrics.startTime;
    const avgResponseTime = (this.metrics.totalRequests + this.metrics.totalMessages) > 0 
      ? this.metrics.responseTimeSum / (this.metrics.totalRequests + this.metrics.totalMessages)
      : 0;

    console.log('\n📈 REALISTIC PERFORMANCE TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`⏱️  Test Duration: ${duration / 1000}s`);
    console.log(`👥 Target Concurrent Users: ${CONFIG.concurrentUsers}`);
    console.log(`👥 Actual Connected Users: ${this.users.length}`);
    console.log('');
    
    console.log('🌐 Authentication Requests:');
    console.log(`   Total: ${this.metrics.totalRequests}`);
    console.log(`   Successful: ${this.metrics.successfulRequests} (${this.metrics.totalRequests > 0 ? ((this.metrics.successfulRequests / this.metrics.totalRequests) * 100).toFixed(1) : 0}%)`);
    console.log(`   Failed: ${this.metrics.failedRequests} (${this.metrics.totalRequests > 0 ? ((this.metrics.failedRequests / this.metrics.totalRequests) * 100).toFixed(1) : 0}%)`);
    console.log('');
    
    console.log('💬 Messages Sent:');
    console.log(`   Total: ${this.metrics.totalMessages}`);
    console.log(`   Successful: ${this.metrics.successfulMessages} (${this.metrics.totalMessages > 0 ? ((this.metrics.successfulMessages / this.metrics.totalMessages) * 100).toFixed(1) : 0}%)`);
    console.log(`   Failed: ${this.metrics.failedMessages} (${this.metrics.totalMessages > 0 ? ((this.metrics.failedMessages / this.metrics.totalMessages) * 100).toFixed(1) : 0}%)`);
    console.log('');
    
    console.log('⚡ Performance Metrics:');
    console.log(`   Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`   Min Response Time: ${this.metrics.minResponseTime === Infinity ? 'N/A' : this.metrics.minResponseTime + 'ms'}`);
    console.log(`   Max Response Time: ${this.metrics.maxResponseTime}ms`);
    console.log(`   Connection Errors: ${this.metrics.connectionErrors}`);
    console.log('');
    
    console.log('📊 Throughput:');
    console.log(`   Auth Requests/sec: ${(this.metrics.totalRequests / (duration / 1000)).toFixed(2)}`);
    console.log(`   Messages/sec: ${(this.metrics.totalMessages / (duration / 1000)).toFixed(2)}`);
    console.log('');

    // Performance assessment
    const authSuccessRate = this.metrics.totalRequests > 0 ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100 : 0;
    const messageSuccessRate = this.metrics.totalMessages > 0 ? (this.metrics.successfulMessages / this.metrics.totalMessages) * 100 : 0;
    
    console.log('🎯 Performance Assessment:');
    
    if (authSuccessRate >= 90) {
      console.log('   ✅ Authentication: Excellent performance');
    } else if (authSuccessRate >= 70) {
      console.log('   ⚠️  Authentication: Acceptable performance');
    } else {
      console.log('   ❌ Authentication: Poor performance');
    }
    
    if (messageSuccessRate >= 95) {
      console.log('   ✅ Messaging: Excellent performance');
    } else if (messageSuccessRate >= 80) {
      console.log('   ⚠️  Messaging: Acceptable performance');
    } else {
      console.log('   ❌ Messaging: Poor performance');
    }
    
    if (avgResponseTime < 100) {
      console.log('   ✅ Response times are excellent');
    } else if (avgResponseTime < 500) {
      console.log('   ✅ Response times are acceptable');
    } else {
      console.log('   ⚠️  Response times need optimization');
    }

    if (this.metrics.connectionErrors === 0) {
      console.log('   ✅ No connection errors detected');
    } else {
      console.log(`   ⚠️  ${this.metrics.connectionErrors} connection errors detected`);
    }
    
    console.log('');
    console.log('💡 Recommendations:');
    
    if (authSuccessRate < 90) {
      console.log('   - Consider adjusting rate limiting for realistic usage');
      console.log('   - Review authentication endpoint performance');
    }
    
    if (avgResponseTime > 200) {
      console.log('   - Consider implementing response caching');
      console.log('   - Review database query optimization');
    }
    
    if (this.metrics.connectionErrors > 0) {
      console.log('   - Review WebSocket connection handling');
      console.log('   - Consider connection pooling optimization');
    }
    
    console.log('   - Monitor memory usage under sustained load');
    console.log('   - Implement horizontal scaling for higher loads');
    console.log('   - Consider CDN for static assets');
    
    console.log('='.repeat(60));
  }
}

// Run realistic test
async function runRealisticTest() {
  const tester = new RealisticTester();
  
  try {
    // Check if server is running
    const healthResponse = await axios.get(`${CONFIG.baseURL}/api/health`);
    console.log('✅ Server is running and healthy');
    console.log(`📊 Server uptime: ${healthResponse.data.uptime.toFixed(2)}s`);
    console.log(`💾 Memory usage: ${(healthResponse.data.memory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log('');
    
    // Run realistic test
    await tester.runRealisticTest();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('Make sure the GhostLink backend is running on port 3000');
  }
}

// Export for use as module
module.exports = RealisticTester;

// Run if called directly
if (require.main === module) {
  runRealisticTest().catch(console.error);
}
