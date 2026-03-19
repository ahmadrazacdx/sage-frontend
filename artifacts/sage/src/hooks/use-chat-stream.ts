import { useState, useCallback, useRef } from "react";
import { mockStream } from "@/api/mock";
import { useQueryClient } from "@tanstack/react-query";
import { getListSessionsQueryKey } from "@workspace/api-client-react";

export interface StreamState {
  isStreaming: boolean;
  content: string;
  thinking: string;
  activeTool: string | null;
  error: string | null;
}

export function useChatStream() {
  const [streamState, setStreamState] = useState<StreamState>({
    isStreaming: false,
    content: "",
    thinking: "",
    activeTool: null,
    error: null,
  });
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const queryClient = useQueryClient();

  const startStream = useCallback((threadId: string, onComplete?: () => void) => {
    setStreamState({
      isStreaming: true,
      content: "",
      thinking: "",
      activeTool: null,
      error: null,
    });

    if (import.meta.env.VITE_USE_MOCK !== 'false') {
      mockStream((data) => {
        setStreamState(prev => {
          if (data.type === 'chunk') return { ...prev, content: prev.content + data.text };
          if (data.type === 'thinking') return { ...prev, thinking: prev.thinking + data.text + "\n" };
          if (data.type === 'tool_call') return { ...prev, activeTool: data.tool_name };
          if (data.type === 'error') return { ...prev, error: data.text, isStreaming: false };
          return prev;
        });
      }, () => {
        setStreamState(prev => ({ ...prev, isStreaming: false, activeTool: null }));
        queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
        onComplete?.();
      });
      return;
    }

    const es = new EventSource(`/api/stream/${threadId}`);
    eventSourceRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setStreamState(prev => {
          if (data.type === 'chunk') return { ...prev, content: prev.content + data.text };
          if (data.type === 'thinking') return { ...prev, thinking: prev.thinking + data.text + "\n" };
          if (data.type === 'tool_call') return { ...prev, activeTool: data.tool_name };
          if (data.type === 'error') {
            es.close();
            return { ...prev, error: data.text, isStreaming: false };
          }
          if (data.type === 'done') {
            es.close();
            queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
            onComplete?.();
            return { ...prev, isStreaming: false, activeTool: null };
          }
          return prev;
        });
      } catch (err) {
        console.error("Failed to parse SSE message", err);
      }
    };

    es.onerror = () => {
      es.close();
      setStreamState(prev => ({ ...prev, error: "Connection lost.", isStreaming: false }));
      onComplete?.();
    };
  }, [queryClient]);

  const stopStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      setStreamState(prev => ({ ...prev, isStreaming: false, activeTool: null }));
    }
  }, []);

  return { streamState, startStream, stopStream };
}
