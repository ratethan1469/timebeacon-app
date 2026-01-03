import { useState, useEffect } from 'react';
import { calendarIntegration, CalendarEvent } from '../services/calendarIntegration';

export const useCalendarEvents = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch events directly from the calendar integration service
      const fetchedEvents = await calendarIntegration.fetchCalendarEvents();

      setEvents(fetchedEvents);
      console.log(`📅 Loaded ${fetchedEvents.length} calendar events for display`);
    } catch (err) {
      console.error('Failed to fetch calendar events:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch calendar events');
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getEventsForDate = (date: string): CalendarEvent[] => {
    return events.filter(event => {
      const eventDate = new Date(event.start).toISOString().split('T')[0];
      return eventDate === date;
    });
  };

  const getIntegrationStatus = () => {
    return calendarIntegration.getStatus();
  };

  useEffect(() => {
    // Initial fetch
    fetchEvents();
    
    // Set up periodic sync every 5 minutes
    const interval = setInterval(fetchEvents, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    events,
    isLoading,
    error,
    fetchEvents,
    getEventsForDate,
    getIntegrationStatus
  };
};