import { useCallback, useEffect, useRef, useState } from "react";

/**
 * WebSocket client for server.js. Reconnects every 2 s when the server is
 * away. Returns:
 *   wsStatus  "connecting" | "open" | "closed"
 *   train     latest state snapshot from the server (null while offline)
 *   logLines  ring buffer of the server's mirrored log lines
 *   send      send({type:"cmd", …})
 */
export function useTrainSocket(url) {
  const [wsStatus, setWsStatus] = useState("connecting");
  const [train, setTrain] = useState(null);
  const [logLines, setLogLines] = useState([]);
  const wsRef = useRef(null);

  useEffect(() => {
    let alive = true;
    let retryTimer;

    function connect() {
      if (!alive) return;
      setWsStatus("connecting");
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => { if (alive) setWsStatus("open"); };
      ws.onmessage = (event) => {
        if (!alive) return;
        let msg;
        try { msg = JSON.parse(event.data); } catch { return; }
        if (msg.type === "state") {
          setTrain(msg.state);
        } else if (msg.type === "log") {
          setLogLines((prev) => {
            const next = [...prev, msg.line];
            return next.length > 400 ? next.slice(-400) : next;
          });
        }
      };
      ws.onclose = () => {
        if (!alive) return;
        setWsStatus("closed");
        setTrain(null);
        retryTimer = setTimeout(connect, 2000);
      };
      ws.onerror = () => ws.close();
    }

    connect();
    return () => {
      alive = false;
      clearTimeout(retryTimer);
      wsRef.current?.close();
    };
  }, [url]);

  const send = useCallback((msg) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }, []);

  return { wsStatus, train, logLines, send };
}
