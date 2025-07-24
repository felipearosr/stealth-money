import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NotificationProvider, useNotifications, NotificationBell } from '../NotificationProvider';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(public url: string) {
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }

  //send(data: string) {
    // Mock send functionality
  //}
}

// Mock Notification API
class MockNotification {
  static permission: NotificationPermission = 'default';
  static requestPermission = jest.fn().mockResolvedValue('granted');

  onclick: ((event: Event) => void) | null = null;

  constructor(public title: string, public options?: NotificationOptions) {
    setTimeout(() => {
      if (this.onclick) {
        this.onclick(new Event('click'));
      }
    }, 10);
  }

  close() {
    // Mock close functionality
  }
}

// Setup mocks
beforeAll(() => {
  global.WebSocket = MockWebSocket as any;
  global.Notification = MockNotification as any;
  Object.defineProperty(window, 'Notification', {
    value: MockNotification,
    writable: true
  });
});

// Test component that uses the notification hook
function TestComponent() {
  const {
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
  } = useNotifications();

  return (
    <div>
      <div data-testid="notification-count">{notifications.length}</div>
      <div data-testid="unread-count">{unreadCount}</div>
      <div data-testid="is-supported">{isSupported.toString()}</div>
      <div data-testid="permission">{permission}</div>
      
      <button
        data-testid="request-permission"
        onClick={requestPermission}
      >
        Request Permission
      </button>
      
      <button
        data-testid="show-notification"
        onClick={() => showNotification({
          title: 'Test Notification',
          body: 'This is a test notification',
          icon: '/test-icon.png',
          tag: 'test',
          data: { testData: 'value' }
        })}
      >
        Show Notification
      </button>
      
      <button
        data-testid="mark-as-read"
        onClick={() => {
          if (notifications.length > 0) {
            markAsRead(notifications[0].id);
          }
        }}
      >
        Mark First as Read
      </button>
      
      <button
        data-testid="mark-all-read"
        onClick={markAllAsRead}
      >
        Mark All Read
      </button>
      
      <button
        data-testid="clear-notification"
        onClick={() => {
          if (notifications.length > 0) {
            clearNotification(notifications[0].id);
          }
        }}
      >
        Clear First
      </button>
      
      <button
        data-testid="clear-all"
        onClick={clearAllNotifications}
      >
        Clear All
      </button>
      
      <button
        data-testid="connect-websocket"
        onClick={() => connectWebSocket('test-user')}
      >
        Connect WebSocket
      </button>
      
      <button
        data-testid="disconnect-websocket"
        onClick={disconnectWebSocket}
      >
        Disconnect WebSocket
      </button>

      <div data-testid="notifications-list">
        {notifications.map(notification => (
          <div key={notification.id} data-testid={`notification-${notification.id}`}>
            <span data-testid="notification-title">{notification.title}</span>
            <span data-testid="notification-read">{notification.read.toString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

describe('NotificationProvider', () => {
  beforeEach(() => {
    MockNotification.permission = 'default';
    MockNotification.requestPermission.mockClear();
  });

  it('should provide notification context to children', () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    expect(screen.getByTestId('notification-count')).toHaveTextContent('0');
    expect(screen.getByTestId('unread-count')).toHaveTextContent('0');
    expect(screen.getByTestId('is-supported')).toHaveTextContent('true');
    expect(screen.getByTestId('permission')).toHaveTextContent('default');
  });

  it('should request notification permission', async () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    const requestButton = screen.getByTestId('request-permission');
    fireEvent.click(requestButton);

    await waitFor(() => {
      expect(MockNotification.requestPermission).toHaveBeenCalled();
    });
  });

  it('should show and manage notifications', async () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    // Show a notification
    const showButton = screen.getByTestId('show-notification');
    fireEvent.click(showButton);

    await waitFor(() => {
      expect(screen.getByTestId('notification-count')).toHaveTextContent('1');
      expect(screen.getByTestId('unread-count')).toHaveTextContent('1');
    });

    // Check notification content
    expect(screen.getByTestId('notification-title')).toHaveTextContent('Test Notification');
    expect(screen.getByTestId('notification-read')).toHaveTextContent('false');
  });

  it('should mark notifications as read', async () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    // Show a notification
    fireEvent.click(screen.getByTestId('show-notification'));

    await waitFor(() => {
      expect(screen.getByTestId('unread-count')).toHaveTextContent('1');
    });

    // Mark as read
    fireEvent.click(screen.getByTestId('mark-as-read'));

    await waitFor(() => {
      expect(screen.getByTestId('unread-count')).toHaveTextContent('0');
      expect(screen.getByTestId('notification-read')).toHaveTextContent('true');
    });
  });

  it('should mark all notifications as read', async () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    // Show multiple notifications
    fireEvent.click(screen.getByTestId('show-notification'));
    fireEvent.click(screen.getByTestId('show-notification'));

    await waitFor(() => {
      expect(screen.getByTestId('unread-count')).toHaveTextContent('2');
    });

    // Mark all as read
    fireEvent.click(screen.getByTestId('mark-all-read'));

    await waitFor(() => {
      expect(screen.getByTestId('unread-count')).toHaveTextContent('0');
    });
  });

  it('should clear individual notifications', async () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    // Show a notification
    fireEvent.click(screen.getByTestId('show-notification'));

    await waitFor(() => {
      expect(screen.getByTestId('notification-count')).toHaveTextContent('1');
    });

    // Clear the notification
    fireEvent.click(screen.getByTestId('clear-notification'));

    await waitFor(() => {
      expect(screen.getByTestId('notification-count')).toHaveTextContent('0');
    });
  });

  it('should clear all notifications', async () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    // Show multiple notifications
    fireEvent.click(screen.getByTestId('show-notification'));
    fireEvent.click(screen.getByTestId('show-notification'));

    await waitFor(() => {
      expect(screen.getByTestId('notification-count')).toHaveTextContent('2');
    });

    // Clear all notifications
    fireEvent.click(screen.getByTestId('clear-all'));

    await waitFor(() => {
      expect(screen.getByTestId('notification-count')).toHaveTextContent('0');
    });
  });

  it('should handle WebSocket connection', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    render(
      <NotificationProvider websocketUrl="ws://localhost:3001/test">
        <TestComponent />
      </NotificationProvider>
    );

    // Connect WebSocket
    fireEvent.click(screen.getByTestId('connect-websocket'));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('WebSocket connected for notifications');
    });

    consoleSpy.mockRestore();
  });

  it('should handle WebSocket messages', async () => {
    let mockWebSocket: MockWebSocket;
    const originalWebSocket = global.WebSocket;
    
    global.WebSocket = class extends MockWebSocket {
      constructor(url: string) {
        super(url);
        mockWebSocket = this;
      }
    } as any;

    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    // Connect WebSocket
    fireEvent.click(screen.getByTestId('connect-websocket'));

    await waitFor(() => {
      expect(mockWebSocket!).toBeDefined();
    });

    // Simulate receiving a notification message
    act(() => {
      if (mockWebSocket!.onmessage) {
        mockWebSocket!.onmessage(new MessageEvent('message', {
          data: JSON.stringify({
            type: 'notification',
            payload: {
              title: 'WebSocket Notification',
              body: 'This came from WebSocket',
              icon: '/ws-icon.png'
            }
          })
        }));
      }
    });

    await waitFor(() => {
      expect(screen.getByTestId('notification-count')).toHaveTextContent('1');
    });

    global.WebSocket = originalWebSocket;
  });

  it('should handle status update messages', async () => {
    let mockWebSocket: MockWebSocket;
    const originalWebSocket = global.WebSocket;
    
    global.WebSocket = class extends MockWebSocket {
      constructor(url: string) {
        super(url);
        mockWebSocket = this;
      }
    } as any;

    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    // Connect WebSocket
    fireEvent.click(screen.getByTestId('connect-websocket'));

    await waitFor(() => {
      expect(mockWebSocket!).toBeDefined();
    });

    // Simulate receiving a status update message
    act(() => {
      if (mockWebSocket!.onmessage) {
        mockWebSocket!.onmessage(new MessageEvent('message', {
          data: JSON.stringify({
            type: 'status_update',
            payload: {
              transferId: 'transfer-123',
              status: 'completed',
              message: 'Your transfer has been completed'
            }
          })
        }));
      }
    });

    await waitFor(() => {
      expect(screen.getByTestId('notification-count')).toHaveTextContent('1');
    });

    global.WebSocket = originalWebSocket;
  });

  it('should limit number of notifications', async () => {
    render(
      <NotificationProvider maxNotifications={2}>
        <TestComponent />
      </NotificationProvider>
    );

    // Show 3 notifications
    fireEvent.click(screen.getByTestId('show-notification'));
    fireEvent.click(screen.getByTestId('show-notification'));
    fireEvent.click(screen.getByTestId('show-notification'));

    await waitFor(() => {
      // Should only keep the most recent 2
      expect(screen.getByTestId('notification-count')).toHaveTextContent('2');
    });
  });
});

describe('NotificationBell', () => {
  it('should render notification bell with unread count', async () => {
    render(
      <NotificationProvider>
        <div>
          <TestComponent />
          <NotificationBell />
        </div>
      </NotificationProvider>
    );

    // Show a notification
    fireEvent.click(screen.getByTestId('show-notification'));

    await waitFor(() => {
      // Check for the badge specifically in the notification bell
      const badge = screen.getByLabelText(/Notifications.*1 unread/);
      expect(badge).toBeInTheDocument();
    });
  });

  it('should open and close notification dropdown', async () => {
    render(
      <NotificationProvider>
        <div>
          <TestComponent />
          <NotificationBell />
        </div>
      </NotificationProvider>
    );

    // Show a notification first
    fireEvent.click(screen.getByTestId('show-notification'));

    await waitFor(() => {
      expect(screen.getByTestId('notification-count')).toHaveTextContent('1');
    });

    // Click the bell to open dropdown
    const bellButton = screen.getByLabelText(/Notifications/);
    fireEvent.click(bellButton);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Notifications' })).toBeInTheDocument();
      // Check for notification in dropdown specifically
      expect(screen.getAllByText('Test Notification')).toHaveLength(2); // One in test component, one in dropdown
    });

    // Click close button
    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('Close')).not.toBeInTheDocument();
    });
  });

  it('should show empty state when no notifications', () => {
    render(
      <NotificationProvider>
        <NotificationBell />
      </NotificationProvider>
    );

    // Click the bell to open dropdown
    const bellButton = screen.getByLabelText(/Notifications/);
    fireEvent.click(bellButton);

    expect(screen.getByText('No notifications yet')).toBeInTheDocument();
  });

  it('should handle notification click in dropdown', async () => {
    render(
      <NotificationProvider>
        <div>
          <TestComponent />
          <NotificationBell />
        </div>
      </NotificationProvider>
    );

    // Show a notification
    fireEvent.click(screen.getByTestId('show-notification'));

    await waitFor(() => {
      expect(screen.getByTestId('unread-count')).toHaveTextContent('1');
    });

    // Open dropdown
    const bellButton = screen.getByLabelText(/Notifications/);
    fireEvent.click(bellButton);

    // Click on the notification in the dropdown (use the h4 element specifically)
    const notificationItem = screen.getByRole('heading', { level: 4, name: 'Test Notification' });
    fireEvent.click(notificationItem.closest('div[class*="cursor-pointer"]')!);

    await waitFor(() => {
      expect(screen.getByTestId('unread-count')).toHaveTextContent('0');
    });
  });
});