import cron from 'node-cron';

const API_URL = 'http://localhost:3000/api/cron';
const CRON_SECRET = process.env.CRON_SECRET || 'secret123';

async function triggerReport(scheduleType) {
  try {
    console.log(`[${new Date().toISOString()}] Triggering ${scheduleType} report...`);
    const res = await fetch(API_URL, {
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`
      }
    });
    
    if (res.ok) {
      console.log(`[${new Date().toISOString()}] ${scheduleType} report sent successfully.`);
    } else {
      console.error(`[${new Date().toISOString()}] Failed to send ${scheduleType} report. Status: ${res.status}`);
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error triggering ${scheduleType} report:`, error.message);
  }
}

// ----------------------------------------------------
// Schedule: Every day at 23:59 (11:59 PM)
// ----------------------------------------------------
cron.schedule('59 23 * * *', () => {
  triggerReport('Daily');
});

// ----------------------------------------------------
// Schedule: Last day of the month at 23:50 (11:50 PM)
// Using standard cron to trigger on the 28-31st and then check if tomorrow is the 1st
// Simplification: Run at 23:50 on the 28th, 29th, 30th, 31st
// ----------------------------------------------------
cron.schedule('50 23 28-31 * *', () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (tomorrow.getDate() === 1) {
    triggerReport('Monthly');
  }
});

console.log('Scheduler is running...');
console.log('- Daily report scheduled for 23:59 every day.');
console.log('- Monthly report scheduled for 23:50 on the last day of each month.');
