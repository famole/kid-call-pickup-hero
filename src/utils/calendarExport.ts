import { format } from 'date-fns';
import { SchoolActivity } from '@/services/activitiesService';

/**
 * Generates an ICS (iCalendar) file content for a school activity
 */
export const generateICSContent = (activity: SchoolActivity): string => {
  const now = new Date();
  const timestamp = format(now, "yyyyMMdd'T'HHmmss'Z'");
  
  // Parse the activity date and time
  const activityDate = new Date(activity.activity_date);
  let startDate: Date;
  let endDate: Date;
  
  if (activity.activity_time) {
    // If time is provided, parse it and create a datetime
    const [hours, minutes] = activity.activity_time.split(':').map(Number);
    startDate = new Date(activityDate);
    startDate.setHours(hours, minutes, 0, 0);
    
    // Default duration: 1 hour
    endDate = new Date(startDate);
    endDate.setHours(startDate.getHours() + 1);
  } else {
    // All-day event
    startDate = activityDate;
    endDate = activityDate;
  }
  
  const formatDateForICS = (date: Date, isAllDay: boolean): string => {
    if (isAllDay) {
      return format(date, 'yyyyMMdd');
    }
    return format(date, "yyyyMMdd'T'HHmmss");
  };
  
  const isAllDay = !activity.activity_time;
  const startFormatted = formatDateForICS(startDate, isAllDay);
  const endFormatted = formatDateForICS(endDate, isAllDay);
  
  // Escape special characters in text fields
  const escapeText = (text: string): string => {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  };
  
  const title = escapeText(activity.title);
  const description = activity.description ? escapeText(activity.description) : '';
  const location = activity.location_name || 
    (activity.activity_classes && activity.activity_classes.length > 0 
      ? activity.activity_classes.map(ac => ac.classes.name).join(', ')
      : 'School');
  
  // Generate geo location if coordinates are available
  const geoLine = activity.location_coords 
    ? `GEO:${activity.location_coords.lat};${activity.location_coords.lng}`
    : '';
  
  // Add link to description if available
  const fullDescription = activity.link 
    ? `${description}${description ? '\\n\\n' : ''}Link: ${activity.link}`
    : description;
  
  // Generate ICS content
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Upsy//School Activities//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${activity.id}@upsy.app`,
    `DTSTAMP:${timestamp}`,
    isAllDay ? `DTSTART;VALUE=DATE:${startFormatted}` : `DTSTART:${startFormatted}`,
    isAllDay ? `DTEND;VALUE=DATE:${endFormatted}` : `DTEND:${endFormatted}`,
    `SUMMARY:${title}`,
    fullDescription ? `DESCRIPTION:${fullDescription}` : '',
    `LOCATION:${location}`,
    geoLine,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(line => line !== '').join('\r\n');
  
  return icsContent;
};

/**
 * Downloads an ICS file for a school activity
 */
export const downloadActivityAsICS = (activity: SchoolActivity): void => {
  const icsContent = generateICSContent(activity);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${activity.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};
