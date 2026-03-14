/**
 * scripts/reminder.js — Railway cron job script
 *
 * Queries actions due today or tomorrow that are not yet Completed,
 * then sends a reminder email to each assignee via the EmailJS REST API.
 *
 * Run locally:  node scripts/reminder.js
 * Environment:  Requires SUPABASE_URL, SUPABASE_SERVICE_KEY,
 *               VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, VITE_EMAILJS_USER_ID
 *
 * NOTE: This file uses CommonJS require() so it can run in Node without
 *       a build step (Railway cron doesn't run Vite).
 */

// Load environment variables from .env when running locally
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Use the CommonJS-compatible Supabase v2 client
const { createClient } = require('@supabase/supabase-js');

// --- Configuration validation ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const EMAILJS_SERVICE_ID = process.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = process.env.VITE_EMAILJS_TEMPLATE_ID;
const EMAILJS_USER_ID = process.env.VITE_EMAILJS_USER_ID;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('[reminder] SUPABASE_URL and SUPABASE_SERVICE_KEY are required.');
  process.exit(1);
}

if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_USER_ID) {
  console.error('[reminder] EmailJS environment variables are required.');
  process.exit(1);
}

// Use the service role key so the script can read all actions (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Format a date as YYYY-MM-DD in the local timezone.
 */
function toDateString(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Send one reminder email via the EmailJS REST API.
 * EmailJS has a free REST endpoint so we don't need a browser SDK.
 */
async function sendReminderEmail(action) {
  if (!action.assigned_to_email) {
    console.log(`[reminder] Skipping action #${action.id} — no assigned email`);
    return;
  }

  // Build the date display string in Dutch
  const dueDateDisplay = action.due_date
    ? new Date(action.due_date).toLocaleDateString('nl-NL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Geen deadline';

  // POST to the EmailJS v1 REST API — works outside the browser
  const payload = {
    service_id: EMAILJS_SERVICE_ID,
    template_id: EMAILJS_TEMPLATE_ID,
    user_id: EMAILJS_USER_ID,
    template_params: {
      to_email: action.assigned_to_email,
      action_subject: action.subject,
      due_date: dueDateDisplay,
      status: action.status,
      action_id: String(action.id),
    },
  };

  const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`EmailJS error ${response.status}: ${text}`);
  }

  console.log(`[reminder] Sent reminder for action #${action.id} to ${action.assigned_to_email}`);
}

async function main() {
  console.log('[reminder] Starting reminder job at', new Date().toISOString());

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayStr = toDateString(today);
  const tomorrowStr = toDateString(tomorrow);

  console.log(`[reminder] Checking actions due on ${todayStr} or ${tomorrowStr}`);

  // Fetch all non-completed actions due today or tomorrow
  const { data: actions, error } = await supabase
    .from('Actions')
    .select('id, subject, due_date, assigned_to_email, status')
    .in('due_date', [todayStr, tomorrowStr])
    .neq('status', 'Completed');

  if (error) {
    console.error('[reminder] Failed to query actions:', error.message);
    process.exit(1);
  }

  console.log(`[reminder] Found ${actions.length} action(s) requiring reminders`);

  if (actions.length === 0) {
    console.log('[reminder] No reminders to send. Exiting.');
    return;
  }

  // Process reminders sequentially to avoid rate limiting
  let successCount = 0;
  let failCount = 0;

  for (const action of actions) {
    try {
      await sendReminderEmail(action);
      successCount++;
    } catch (err) {
      console.error(`[reminder] Failed to send reminder for action #${action.id}:`, err.message);
      failCount++;
    }
  }

  console.log(
    `[reminder] Done. Sent: ${successCount}, Failed: ${failCount}, Total: ${actions.length}`
  );
}

// Run the main function and handle top-level errors
main().catch((err) => {
  console.error('[reminder] Unhandled error:', err.message);
  process.exit(1);
});
