/**
 * Secure Session Management
 * Handles session storage, expiration, and security
 */

interface SessionData {
  token: string;
  refreshToken: string;
  user: any;
  company: any;
  expiresAt: number;
  lastActivity: number;
}

class SessionManager {
  private readonly SESSION_KEY = 'timebeacon_session';
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private readonly MAX_IDLE_TIME = 15 * 60 * 1000; // 15 minutes
  private activityTimer: number | null = null;

  /**
   * Store session data securely
   */
  setSession(data: {
    accessToken: string;
    refreshToken: string;
    user: any;
    company: any;
    expiresIn: number;
  }): void {
    const sessionData: SessionData = {
      token: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user,
      company: data.company,
      expiresAt: Date.now() + (data.expiresIn * 1000),
      lastActivity: Date.now(),
    };

    // Encrypt session data
    const encryptedData = this.encryptSession(sessionData);
    localStorage.setItem(this.SESSION_KEY, encryptedData);

    // Start activity monitoring
    this.startActivityMonitoring();
  }

  /**
   * Get current session
   */
  getSession(): SessionData | null {
    try {
      const encryptedData = localStorage.getItem(this.SESSION_KEY);
      if (!encryptedData) return null;

      const sessionData = this.decryptSession(encryptedData);
      if (!sessionData) return null;

      // Check if session is expired
      if (this.isSessionExpired(sessionData)) {
        this.clearSession();
        return null;
      }

      // Update last activity
      sessionData.lastActivity = Date.now();
      this.setSession({
        accessToken: sessionData.token,
        refreshToken: sessionData.refreshToken,
        user: sessionData.user,
        company: sessionData.company,
        expiresIn: Math.floor((sessionData.expiresAt - Date.now()) / 1000),
      });

      return sessionData;
    } catch (error) {
      console.error('Error getting session:', error);
      this.clearSession();
      return null;
    }
  }

  /**
   * Clear session data
   */
  clearSession(): void {
    localStorage.removeItem(this.SESSION_KEY);
    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
      this.activityTimer = null;
    }
  }

  /**
   * Check if session is valid
   */
  isSessionValid(): boolean {
    const session = this.getSession();
    return session !== null && !this.isSessionExpired(session);
  }

  /**
   * Refresh session activity
   */
  refreshActivity(): void {
    const session = this.getSession();
    if (session) {
      session.lastActivity = Date.now();
      this.setSession({
        accessToken: session.token,
        refreshToken: session.refreshToken,
        user: session.user,
        company: session.company,
        expiresIn: Math.floor((session.expiresAt - Date.now()) / 1000),
      });
    }
  }

  /**
   * Check if session is expired
   */
  private isSessionExpired(session: SessionData): boolean {
    const now = Date.now();
    const isTokenExpired = now > session.expiresAt;
    const isIdleExpired = now - session.lastActivity > this.MAX_IDLE_TIME;
    
    return isTokenExpired || isIdleExpired;
  }

  /**
   * Encrypt session data (simple XOR for demo - use proper encryption in production)
   */
  private encryptSession(data: SessionData): string {
    const jsonString = JSON.stringify(data);
    const key = this.getEncryptionKey();
    let encrypted = '';
    
    for (let i = 0; i < jsonString.length; i++) {
      encrypted += String.fromCharCode(
        jsonString.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    
    return btoa(encrypted);
  }

  /**
   * Decrypt session data
   */
  private decryptSession(encryptedData: string): SessionData | null {
    try {
      const encrypted = atob(encryptedData);
      const key = this.getEncryptionKey();
      let decrypted = '';
      
      for (let i = 0; i < encrypted.length; i++) {
        decrypted += String.fromCharCode(
          encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        );
      }
      
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Failed to decrypt session:', error);
      return null;
    }
  }

  /**
   * Get encryption key (in production, use proper key management)
   */
  private getEncryptionKey(): string {
    return 'timebeacon-session-key-2024';
  }

  /**
   * Start monitoring user activity
   */
  private startActivityMonitoring(): void {
    // Clear existing timer
    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
    }

    // Set up activity listeners
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    const refreshActivity = () => this.refreshActivity();

    events.forEach(event => {
      document.addEventListener(event, refreshActivity, { passive: true });
    });

    // Set up idle timeout
    this.activityTimer = setTimeout(() => {
      this.clearSession();
      window.location.href = '/login?reason=idle';
    }, this.MAX_IDLE_TIME);
  }
}

export const sessionManager = new SessionManager();