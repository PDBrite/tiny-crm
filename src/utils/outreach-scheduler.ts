import { OutreachStep, ContactAttempt } from '../types/leads'

/**
 * Add business days to a date (excludes weekends)
 * @param date Starting date
 * @param businessDays Number of business days to add
 * @returns New date with business days added
 */
export function addBusinessDays(date: Date, businessDays: number): Date {
  const result = new Date(date)
  let daysToAdd = businessDays
  
  while (daysToAdd > 0) {
    result.setDate(result.getDate() + 1)
    
    // Skip weekends (Saturday = 6, Sunday = 0)
    if (result.getDay() !== 0 && result.getDay() !== 6) {
      daysToAdd--
    }
  }
  
  return result
}

/**
 * Check if a date is a business day (Monday-Friday)
 * @param date Date to check
 * @returns True if it's a business day
 */
export function isBusinessDay(date: Date): boolean {
  const day = date.getDay()
  return day >= 1 && day <= 5 // Monday = 1, Friday = 5
}

/**
 * Get the next business day from a given date
 * @param date Starting date
 * @returns Next business day
 */
export function getNextBusinessDay(date: Date): Date {
  return addBusinessDays(date, 1)
}

/**
 * Schedule touchpoints for a lead based on outreach sequence
 * @param leadData Lead data for template replacement
 * @returns Array of scheduled touchpoints
 */
export function scheduleTouchpointsForLead(
  ids: { leadId?: string; districtContactId?: string },
  campaignStartDate: Date,
  outreachSteps: OutreachStep[],
  leadData: { first_name?: string; last_name?: string; city?: string; company?: string }
): Partial<ContactAttempt>[] {
  const scheduledTouchpoints: Partial<ContactAttempt>[] = [];
  let previousDate = new Date(campaignStartDate);
  
  // Sort steps by step_order to ensure correct sequence
  const sortedSteps = [...outreachSteps].sort((a, b) => a.step_order - b.step_order);
  
  sortedSteps.forEach((step) => {
    let scheduledDate: Date;
    
    if (step.step_order === 1 || step.days_after_previous === undefined) {
      // First step or no days_after_previous defined: use day_offset from campaign start
      scheduledDate = addBusinessDays(campaignStartDate, step.day_offset);
    } else {
      // Use days_after_previous from the previous step's date
      scheduledDate = addBusinessDays(previousDate, step.days_after_previous);
    }
    
    // Update previous date for next iteration
    previousDate = new Date(scheduledDate);
    
    // Set time to 9:00 AM for consistency, but only store the date part
    scheduledDate.setHours(9, 0, 0, 0);
    
    // Replace template variables in name and content_link
    const subject = replaceTemplateVariables(step.name || '', leadData);
    const content = replaceTemplateVariables(step.content_link || '', leadData);
    
    scheduledTouchpoints.push({
      lead_id: ids.leadId,
      district_contact_id: ids.districtContactId,
      type: step.type,
      subject,
      content,
      scheduled_at: scheduledDate.toISOString().split('T')[0] + 'T09:00:00.000Z', // Only date with 9 AM time
    });
  });
  
  return scheduledTouchpoints;
}

/**
 * Replace template variables in text with lead data
 * @param text Text with template variables like {{first_name}}
 * @param leadData Lead data object
 * @returns Text with variables replaced
 */
export function replaceTemplateVariables(
  text: string,
  leadData: { first_name?: string; last_name?: string; city?: string; company?: string }
): string {
  return text
    .replace(/\{\{first_name\}\}/g, leadData.first_name || '[First Name]')
    .replace(/\{\{last_name\}\}/g, leadData.last_name || '[Last Name]')
    .replace(/\{\{city\}\}/g, leadData.city || '[City]')
    .replace(/\{\{company\}\}/g, leadData.company || '[Company]')
}

/**
 * Get touchpoints that are due today
 * @param touchpoints Array of scheduled touchpoints
 * @returns Touchpoints due today
 */
export function getTouchpointsDueToday(touchpoints: ContactAttempt[]): ContactAttempt[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  return touchpoints.filter(touchpoint => {
    if (!touchpoint.scheduled_at || touchpoint.completed_at) return false
    
    const scheduledDate = new Date(touchpoint.scheduled_at)
    scheduledDate.setHours(0, 0, 0, 0)
    
    return scheduledDate >= today && scheduledDate < tomorrow
  })
}

/**
 * Get overdue touchpoints
 * @param touchpoints Array of scheduled touchpoints
 * @returns Overdue touchpoints
 */
export function getOverdueTouchpoints(touchpoints: ContactAttempt[]): ContactAttempt[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  return touchpoints.filter(touchpoint => {
    if (!touchpoint.scheduled_at || touchpoint.completed_at) return false
    
    const scheduledDate = new Date(touchpoint.scheduled_at)
    scheduledDate.setHours(0, 0, 0, 0)
    
    return scheduledDate < today
  })
}

/**
 * Calculate the next batch start date (next business day)
 * @returns Next business day for starting a new batch
 */
export function getNextBatchStartDate(): Date {
  const today = new Date()
  
  // If today is a business day and it's before 5 PM, start today
  // Otherwise, start next business day
  if (isBusinessDay(today) && today.getHours() < 17) {
    return today
  }
  
  return getNextBusinessDay(today)
} 