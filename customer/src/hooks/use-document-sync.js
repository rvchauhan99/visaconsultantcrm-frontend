"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import api from "@/lib/api";

/**
 * Resolves the appropriate WebSocket URL for connecting to the backend.
 * Works seamlessly across physical mobile devices and laptop on the local network.
 */
function getBackendWsUrl(sessionId) {
  if (typeof window === "undefined" || !sessionId) return "";

  let backendHttp = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  const host = window.location.hostname;

  // If running on a LAN IP (e.g. 10.136.72.12), ensure we don't connect to localhost
  if (!backendHttp || (backendHttp.includes("localhost") && host !== "localhost")) {
    backendHttp = `http://${host}:8000`;
  }

  // Convert HTTP/HTTPS to WS/WSS
  const wsProto = backendHttp.startsWith("https") ? "wss:" : "ws:";
  const cleanHost = backendHttp.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return `${wsProto}//${cleanHost}/api/documents/ws/${sessionId}`;
}

/**
 * useDocumentSync establishes a live WebSocket connection (with automatic polling failover)
 * for a specific upload session ID.
 *
 * Used by the laptop to receive real-time document upload events from the phone.
 *
 * @param {string} sessionId - The shared session ID encoded in the QR code
 * @param {function} onDocumentUploaded - Callback invoked when a document is uploaded on phone
 */
export function useDocumentSync(sessionId, onDocumentUploaded) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const callbackRef = useRef(onDocumentUploaded);

  // Keep callback reference current
  useEffect(() => {
    callbackRef.current = onDocumentUploaded;
  }, [onDocumentUploaded]);

  // Polling fallback mechanism
  const pollSessionStatus = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await api.get(`/documents/session/${sessionId}`);
      const documents = res.data?.documents || {};
      Object.values(documents).forEach((doc) => {
        if (doc && doc.status === "uploaded") {
          callbackRef.current?.(doc);
        }
      });
    } catch {
      // Non-blocking fallback
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    let isMounted = true;
    let ws = null;

    function connect() {
      if (!isMounted) return;

      const wsUrl = getBackendWsUrl(sessionId);
      if (!wsUrl) return;

      try {
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          setIsConnected(true);
          // Stop aggressive polling when WebSocket is connected
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === "document_uploaded") {
              setLastEvent(data);
              callbackRef.current?.(data);
            } else if (data.type === "session_sync" && data.documents) {
              Object.values(data.documents).forEach((doc) => {
                if (doc && doc.status === "uploaded") {
                  callbackRef.current?.(doc);
                }
              });
            }
          } catch {
            // Ignore non-JSON ping/pong frames
          }
        };

        ws.onclose = () => {
          if (!isMounted) return;
          setIsConnected(false);
          // Start fallback polling if WS closes
          if (!pollIntervalRef.current) {
            pollIntervalRef.current = setInterval(pollSessionStatus, 3000);
          }
          // Attempt reconnect after 2 seconds
          reconnectTimeoutRef.current = setTimeout(connect, 2000);
        };

        ws.onerror = () => {
          if (ws) ws.close();
        };
      } catch {
        // Fallback to polling immediately on constructor error
        if (!pollIntervalRef.current) {
          pollIntervalRef.current = setInterval(pollSessionStatus, 3000);
        }
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      }
    }

    connect();

    // Heartbeat ping interval
    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send("ping");
      }
    }, 15000);

    return () => {
      isMounted = false;
      clearInterval(pingInterval);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [sessionId, pollSessionStatus]);

  return {
    isConnected,
    lastEvent,
    checkNow: pollSessionStatus,
  };
}
