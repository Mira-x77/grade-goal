/**
 * Analytics Service
 * Tracks user sessions, page views, events, and time spent in app
 */

import { supabase } from '@/integrations/supabase/client';
import { getDeviceId } from '@/lib/device-id';

interface SessionData {
  sessionId: string | null;
  sessionStart: Date | null;
  currentPage: string | null;
  pageStartTime: Date | null;
}

class AnalyticsService {
  private session: SessionData = {
    sessionId: null,
    sessionStart: null,
    currentPage: null,
    pageStartTime: null,
  };

  private deviceId: string | null = null;
  private userId: string | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize analytics (call on app start)
   */
  async initialize(userId?: string | null, gradingSystem?: string): Promise<void> {
    try {
      this.deviceId = await getDeviceId();
      this.userId = userId || null;

      // Start new session
      await this.startSession(gradingSystem);

      // Set up periodic heartbeat to keep session alive
      this.startHeartbeat();

      // Listen for page unload to end session
      this.setupUnloadListener();

      console.log('📊 Analytics initialized:', { sessionId: this.session.sessionId });
    } catch (error) {
      console.error('Failed to initialize analytics:', error);
    }
  }

  /**
   * Start a new session
   */
  private async startSession(gradingSystem?: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('app_sessions')
        .insert({
          user_id: this.userId,
          device_id: this.deviceId,
          session_start: new Date().toISOString(),
          grading_system: gradingSystem,
          platform: this.getPlatform(),
        })
        .select('id')
        .single();

      if (error) throw error;

      this.session.sessionId = data.id;
      this.session.sessionStart = new Date();
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  }

  /**
   * End current session
   */
  async endSession(): Promise<void> {
    if (!this.session.sessionId) return;

    try {
      // End current page view
      await this.endPageView();

      // End session
      await supabase.rpc('end_app_session', {
        p_session_id: this.session.sessionId,
      });

      console.log('📊 Session ended:', { sessionId: this.session.sessionId });

      // Clear session data
      this.session = {
        sessionId: null,
        sessionStart: null,
        currentPage: null,
        pageStartTime: null,
      };

      // Stop heartbeat
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  }

  /**
   * Track page view
   */
  async trackPageView(pageName: string, pagePath?: string): Promise<void> {
    if (!this.session.sessionId) return;

    try {
      // End previous page view if exists
      await this.endPageView();

      // Start new page view
      const { data, error } = await supabase
        .from('page_views')
        .insert({
          user_id: this.userId,
          device_id: this.deviceId,
          session_id: this.session.sessionId,
          page_name: pageName,
          page_path: pagePath,
          viewed_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) throw error;

      this.session.currentPage = pageName;
      this.session.pageStartTime = new Date();

      console.log('📊 Page view tracked:', pageName);
    } catch (error) {
      console.error('Failed to track page view:', error);
    }
  }

  /**
   * End current page view and update duration
   */
  private async endPageView(): Promise<void> {
    if (!this.session.currentPage || !this.session.pageStartTime) return;

    try {
      const durationSeconds = Math.floor(
        (Date.now() - this.session.pageStartTime.getTime()) / 1000
      );

      await supabase
        .from('page_views')
        .update({ view_duration_seconds: durationSeconds })
        .eq('session_id', this.session.sessionId)
        .eq('page_name', this.session.currentPage)
        .is('view_duration_seconds', null);

      console.log('📊 Page view ended:', {
        page: this.session.currentPage,
        duration: durationSeconds,
      });
    } catch (error) {
      console.error('Failed to end page view:', error);
    }
  }

  /**
   * Track custom event
   */
  async trackEvent(
    eventType: string,
    eventName: string,
    eventData?: Record<string, any>
  ): Promise<void> {
    if (!this.deviceId) return;

    try {
      await supabase.from('event_tracking').insert({
        user_id: this.userId,
        device_id: this.deviceId,
        session_id: this.session.sessionId,
        event_type: eventType,
        event_name: eventName,
        event_data: eventData || null,
        occurred_at: new Date().toISOString(),
      });

      console.log('📊 Event tracked:', eventName);
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }

  /**
   * Get daily usage stats (ADMIN ONLY - not shown to users)
   */
  async getDailyStats(date?: Date): Promise<{
    totalSessions: number;
    totalTimeSeconds: number;
    totalTimeFormatted: string;
    pagesVisited: number;
    eventsTracked: number;
    downloads: number;
  } | null> {
    if (!this.deviceId) return null;

    try {
      const targetDate = date || new Date();
      const dateString = targetDate.toISOString().split('T')[0];

      const { data, error } = await supabase.rpc('get_daily_usage_stats', {
        p_device_id: this.deviceId,
        p_date: dateString,
      });

      if (error) throw error;

      return data[0] || null;
    } catch (error) {
      console.error('Failed to get daily stats:', error);
      return null;
    }
  }

  /**
   * Start heartbeat to update session periodically
   */
  private startHeartbeat(): void {
    // Update session every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      if (this.session.sessionId) {
        // Just a keep-alive ping
        console.log('📊 Session heartbeat');
      }
    }, 30000);
  }

  /**
   * Set up listener for page unload to end session
   */
  private setupUnloadListener(): void {
    const handleUnload = () => {
      // Use sendBeacon for reliable tracking on unload
      if (this.session.sessionId && navigator.sendBeacon) {
        const data = JSON.stringify({
          session_id: this.session.sessionId,
        });
        navigator.sendBeacon('/api/end-session', data);
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    // For mobile: handle visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.endSession();
      }
    });
  }

  /**
   * Get platform type
   */
  private getPlatform(): string {
    const userAgent = navigator.userAgent.toLowerCase();

    if (/android/.test(userAgent)) return 'android';
    if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
    if (/mobile/.test(userAgent)) return 'mobile_web';

    return 'web';
  }

  /**
   * Update user ID (when user logs in)
   */
  updateUserId(userId: string | null): void {
    this.userId = userId;
  }

  /**
   * Common event shortcuts
   */
  async trackDownload(itemType: 'paper' | 'book', itemId: string): Promise<void> {
    await this.trackEvent('download', `download_${itemType}`, { item_id: itemId });
  }

  async trackSearch(query: string, resultsCount: number): Promise<void> {
    await this.trackEvent('search', 'search_query', {
      query,
      results_count: resultsCount,
    });
  }

  async trackButtonClick(buttonName: string): Promise<void> {
    await this.trackEvent('interaction', 'button_click', { button_name: buttonName });
  }

  async trackFeatureUse(featureName: string): Promise<void> {
    await this.trackEvent('feature', 'feature_used', { feature_name: featureName });
  }
}

export const analyticsService = new AnalyticsService();
