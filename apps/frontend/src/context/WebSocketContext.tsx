import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

type MessageCallback = (data: any) => void;

interface WebSocketContextType {
  subscribe: (stream: string, callback: MessageCallback) => void;
  unsubscribe: (stream: string, callback: MessageCallback) => void;
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Map<string, Set<MessageCallback>>>(new Map());
  const activeSubscriptionsRef = useRef<Set<string>>(new Set());

  // WebSocket URL configuration: default to ws://localhost:3000
  const WS_URL = (import.meta.env.VITE_WS_URL as string) || 'ws://localhost:3000';

  const connect = () => {
    if (socketRef.current) return;

    try {
      const ws = new WebSocket(WS_URL);
      socketRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connection active:', WS_URL);
        setIsConnected(true);

        // Resubscribe to active channels on reconnect
        if (activeSubscriptionsRef.current.size > 0) {
          ws.send(
            JSON.stringify({
              method: 'SUBSCRIBE',
              params: Array.from(activeSubscriptionsRef.current),
            })
          );
        }
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          const { stream, data } = parsed;
          if (stream) {
            const streamListeners = listenersRef.current.get(stream);
            if (streamListeners) {
              streamListeners.forEach((callback) => callback(data));
            }
          }
        } catch (err) {
          console.error('Failed to parse incoming WebSocket message:', err);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket connection closed. Retrying connection in 3s...');
        setIsConnected(false);
        socketRef.current = null;
        setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.error('WebSocket client connection error:', err);
        ws.close();
      };
    } catch (error) {
      console.error('WebSocket connection setup failed:', error);
      setTimeout(connect, 3000);
    }
  };

  useEffect(() => {
    connect();
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  const subscribe = (stream: string, callback: MessageCallback) => {
    if (!listenersRef.current.has(stream)) {
      listenersRef.current.set(stream, new Set());
    }
    listenersRef.current.get(stream)!.add(callback);

    if (!activeSubscriptionsRef.current.has(stream)) {
      activeSubscriptionsRef.current.add(stream);
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            method: 'SUBSCRIBE',
            params: [stream],
          })
        );
      }
    }
  };

  const unsubscribe = (stream: string, callback: MessageCallback) => {
    const streamListeners = listenersRef.current.get(stream);
    if (streamListeners) {
      streamListeners.delete(callback);
      if (streamListeners.size === 0) {
        listenersRef.current.delete(stream);
        activeSubscriptionsRef.current.delete(stream);

        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(
            JSON.stringify({
              method: 'UNSUBSCRIBE',
              params: [stream],
            })
          );
        }
      }
    }
  };

  return (
    <WebSocketContext.Provider value={{ subscribe, unsubscribe, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export const useWebSocketStream = (stream: string | null, onMessage: MessageCallback) => {
  const ws = useWebSocket();
  const callbackRef = useRef<MessageCallback>(onMessage);

  useEffect(() => {
    callbackRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!stream) return;

    const listener = (data: any) => {
      callbackRef.current(data);
    };

    ws.subscribe(stream, listener);
    return () => {
      ws.unsubscribe(stream, listener);
    };
  }, [stream, ws]);
};

export const useSubscription = (stream: string | null, onMessage: MessageCallback) => {
  return useWebSocketStream(stream, onMessage);
};
