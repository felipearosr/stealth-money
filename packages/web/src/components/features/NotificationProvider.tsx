'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

/**
 * Browser notification types
 */
export interface BrowserNotification {
  id: string;
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  data?: Record<string, unknown>;
  timestamp: Date;
  read: boolean;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

/**
 * Notification context type
 */
interface NotificationContextType {
  notifications: BrowserNotification[];
  unreadCount: number;
  isSupported: boolean;
  permission: NotificationPermission;
  requestPermission: () => Promise<NotificationPermission>;
  showNotification: (notification: Omit<BrowserNotification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAllNotifications: () => void;
  connectWebSocket: (userId?: string) => void;
  disconnectWebSocket: () => void;
}

/**
 * WebSocket message types
 */
interface WebSocketMessage {
  type: 'notification' | 'status_update' | 'error';
  payload: Record<string, unknown>;
}

/**
 * Notification context
 */
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

/**
 * Notification provider props
 */
interface NotificationProviderProps {
  children: React.ReactNode;
  websocketUrl?: string;
  maxNotifications?: number;
}

/**
 * Notification provider component
 */
export function NotificationProvider({ 
  children, 
  websocketUrl = 'ws://localhost:3001/notifications',
  maxNotifications = 50 
}: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<BrowserNotification[]>([]);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const [, setIsConnected] = useState(false);

  // Check if browser notifications are supported
  const isSupported = typeof window !== 'undefined' && 'Notification' in window;

  // Initialize notification permission state
  useEffect(() => {
    if (isSupported) {
      setPermission(Notification.permission);
    }
  }, [isSupported]);

  /**
   * Request notification permission from user
   */
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      return 'denied';
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }, [isSupported]);

  /**
   * Mark notification as read
   */
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
  }, []);

  /**
   * Show browser notification
   */
  const showNotification = useCallback((
    notificationData: Omit<BrowserNotification, 'id' | 'timestamp' | 'read'>
  ) => {
    const notification: BrowserNotification = {
      ...notificationData,
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false
    };

    // Add to notifications list
    setNotifications(prev => {
      const updated = [notification, ...prev];
      // Keep only the most recent notifications
      return updated.slice(0, maxNotifications);
    });

    // Show browser notification if permission granted
    if (isSupported && permission === 'granted') {
      try {
        const browserNotification = new Notification(notification.title, {
          body: notification.body,
          icon: notification.icon || '/favicon.ico',
          tag: notification.tag,
          data: notification.data,
          requireInteraction: false,
          silent: false
        });

        // Handle notification click
        browserNotification.onclick = () => {
          // Mark as read
          markAsRead(notification.id);
          
          // Handle action based on notification data
          if (notification.data?.url && typeof notification.data.url === 'string') {
            window.open(notification.data.url, '_blank');
          }
          
          browserNotification.close();
        };

        // Auto-close after 5 seconds
        setTimeout(() => {
          browserNotification.close();
        }, 5000);

      } catch (error) {
        console.error('Error showing browser notification:', error);
      }
    }
  }, [isSupported, permission, maxNotifications, markAsRead]);

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  }, []);

  /**
   * Clear specific notification
   */
  const clearNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  /**
   * Clear all notifications
   */
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  /**
   * Connect to WebSocket for real-time notifications
   */
  const connectWebSocket = useCallback((userId?: string) => {
    if (websocket) {
      websocket.close();
    }

    try {
      const wsUrl = userId ? `${websocketUrl}?userId=${userId}` : websocketUrl;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected for notifications');
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          if (message.type === 'notification') {
            showNotification({
              title: String(message.payload.title || ''),
              body: String(message.payload.body || ''),
              icon: String(message.payload.icon || ''),
              tag: String(message.payload.tag || ''),
              data: message.payload.data as Record<string, unknown> | undefined,
              actions: message.payload.actions as Array<{
                action: string;
                title: string;
                icon?: string;
              }> | undefined
            });
          } else if (message.type === 'status_update') {
            // Handle transfer status updates
            showNotification({
              title: 'Transfer Update',
              body: String(message.payload.message || 'Your transfer status has been updated'),
              icon: '/icons/transfer-update.png',
              tag: `transfer-${String(message.payload.transferId || '')}`,
              data: {
                transferId: message.payload.transferId,
                status: message.payload.status,
                url: `/status/${String(message.payload.transferId || '')}`
              }
            });
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (!websocket || websocket.readyState === WebSocket.CLOSED) {
            connectWebSocket(userId);
          }
        }, 5000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

      setWebsocket(ws);
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
    }
  }, [websocketUrl, websocket, showNotification]);

  /**
   * Disconnect WebSocket
   */
  const disconnectWebSocket = useCallback(() => {
    if (websocket) {
      websocket.close();
      setWebsocket(null);
      setIsConnected(false);
    }
  }, [websocket]);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (websocket) {
        websocket.close();
      }
    };
  }, [websocket]);

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  const contextValue: NotificationContextType = {
    notifications,
    unreadCount,
    isSupported,
    permission,
    requestPermission,
    showNotification,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
    connectWebSocket,
    disconnectWebSocket
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

/**
 * Hook to use notification context
 */
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

/**
 * Notification bell component
 */
export function NotificationBell() {
  const { unreadCount, notifications, markAsRead, clearNotification, requestPermission, permission } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const handleNotificationClick = (notification: BrowserNotification) => {
    markAsRead(notification.id);
    
    if (notification.data?.url && typeof notification.data.url === 'string') {
      window.open(notification.data.url, '_blank');
    }
  };

  const handleRequestPermission = async () => {
    await requestPermission();
  };

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        
        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              {permission !== 'granted' && (
                <button
                  onClick={handleRequestPermission}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Enable
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No notifications yet
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">
                        {notification.title}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.body}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {notification.timestamp.toLocaleString()}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-2">
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          clearNotification(notification.id);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                        aria-label="Clear notification"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full text-sm text-blue-600 hover:text-blue-800"
              >
                Close
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}