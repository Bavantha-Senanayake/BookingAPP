import axios from 'axios';
import mongoose from 'mongoose';

const API_URL = 'http://localhost:3000';

async function main() {
  console.log('\n🚀 Testing 10 concurrent requests...\n');
  
  // Use a test resource ID (replace with real one if needed)
  const resourceId = "6944f15ffdfccbcd108e7ffc";
  
  // Create 10 requests for the SAME time slot
  const requests = Array.from({ length: 10 }, (_, i) => 
    axios.post(`${API_URL}/api/reservations`, {
      resourceId,
      userId: `user-${i + 1}`,
      startTime: '2025-12-25T10:00:00Z',
      endTime: '2025-12-25T12:00:00Z',
    }).then(res => ({ success: true, userId: `user-${i + 1}`, status: res.status, data: res.data }))
      .catch(err => ({ 
        success: false, 
        userId: `user-${i + 1}`, 
        status: err.response?.status || 'Network Error',
        message: err.response?.data?.error || err.message
      }))
  );
  
  // Send all 10 at once
  const results = await Promise.all(requests);
  
  // Show results
  results.forEach(result => {
    if (result.success) {
      console.log(`${result.userId}: ✓ SUCCESS (${result.status}) - Reservation created`);
    } else {
      console.log(`${result.userId}: ✗ FAILED (${result.status}) - ${(result as any).message}`);
    }
  });
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\nResult: ${successCount} succeeded, ${10 - successCount} failed`);
  
  if (successCount > 1) {
    console.log('⚠️  WARNING: Multiple requests succeeded! Race condition detected.');
  } else if (successCount === 1) {
    console.log('✓ Good! Only 1 request succeeded.');
  }
}

main();
