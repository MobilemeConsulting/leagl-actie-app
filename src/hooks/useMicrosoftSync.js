import emailjs from 'emailjs-com';

/**
 * Hook providing Microsoft Graph API and EmailJS utilities.
 *
 * Usage:
 *   const { syncToMicrosoftToDo, sendReminderEmail } = useMicrosoftSync();
 */
export function useMicrosoftSync() {
  /**
   * Create a task in Microsoft To Do via the Graph API.
   * Uses the provider_token from the Supabase Microsoft OAuth session.
   *
   * @param {Object} action      — action row (subject, due_date, etc.)
   * @param {string} accessToken — Microsoft Graph access token from session.provider_token
   * @returns {Object}           — the created task from the Graph API response
   */
  const syncToMicrosoftToDo = async (action, accessToken) => {
    if (!accessToken) {
      throw new Error('No Microsoft access token available. User must sign in with Microsoft.');
    }

    // Build the Graph API task payload from the action data
    const taskBody = {
      title: action.subject,
      importance: 'normal',
      status: mapStatusToGraphStatus(action.status),
      // Graph API expects due date in dateTimeTimeZone format
      ...(action.due_date && {
        dueDateTime: {
          dateTime: `${action.due_date}T00:00:00.000Z`,
          timeZone: 'UTC',
        },
      }),
      body: {
        contentType: 'text',
        content: action.assigned_to_email
          ? `Toegewezen aan: ${action.assigned_to_email}`
          : '',
      },
    };

    // POST to the default task list (Microsoft To Do "Tasks")
    const response = await fetch(
      'https://graph.microsoft.com/v1.0/me/todo/lists/tasks/tasks',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskBody),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Graph API error ${response.status}: ${errorBody}`);
    }

    const createdTask = await response.json();
    return createdTask;
  };

  /**
   * Send a reminder email via the EmailJS REST API.
   * Uses environment variables for service/template/user IDs.
   *
   * @param {Object} action — action row with subject, due_date, assigned_to_email
   */
  const sendReminderEmail = async (action) => {
    const serviceId = import.meta.env?.VITE_EMAILJS_SERVICE_ID;
    const templateId = import.meta.env?.VITE_EMAILJS_TEMPLATE_ID;
    const userId = import.meta.env?.VITE_EMAILJS_USER_ID;

    if (!serviceId || !templateId || !userId) {
      console.warn('EmailJS environment variables not configured — reminder skipped.');
      return;
    }

    if (!action.assigned_to_email) {
      console.warn(`Action ${action.id} has no assigned email — reminder skipped.`);
      return;
    }

    // Template variables must match the EmailJS template placeholders
    const templateParams = {
      to_email: action.assigned_to_email,
      action_subject: action.subject,
      due_date: action.due_date
        ? new Date(action.due_date).toLocaleDateString('nl-NL', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
        : 'Geen deadline',
      status: action.status,
    };

    await emailjs.send(serviceId, templateId, templateParams, userId);
  };

  return { syncToMicrosoftToDo, sendReminderEmail };
}

/**
 * Map our app's status values to Microsoft Graph task status values.
 * Graph API accepts: 'notStarted', 'inProgress', 'completed', 'waitingOnOthers', 'deferred'
 */
function mapStatusToGraphStatus(appStatus) {
  const map = {
    Open: 'notStarted',
    'In Progress': 'inProgress',
    Completed: 'completed',
  };
  return map[appStatus] ?? 'notStarted';
}
