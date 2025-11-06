/**
 * useChatMessages Hook
 * Manages chat message state and streaming logic
 */

import { useState, useCallback, useRef } from 'react';
import { ChatMessage } from '../types/chat';
import { ChartContent } from '../types/chart';
import { config } from '../config/env';
import { extractSqlQuery, extractVerificationInfo } from '../utils/chatUtils';
import { ERROR_TEXT, API_DEFAULTS, getApiStatusMessage } from '../constants/textConstants';

const MAX_MESSAGES = 100;

export const useChatMessages = (selectedAgent: string) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || isLoading) return;

    const messageId = Date.now().toString();
    const userMessage: ChatMessage = {
      id: messageId + '_user',
      text: message.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    const assistantMessageId = messageId + '_assistant';
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      text: '',
      sender: 'assistant',
      timestamp: new Date(),
      status: 'thinking',
      isStreaming: true,
      streamingStatus: undefined,
      thinkingSteps: [],
      sqlQueries: [],
      timeline: [],
      toolsUsed: []
    };

    setMessages(prev => {
      const newMessages = [...prev, userMessage, assistantMessage];
      // Trim to max messages to prevent memory issues
      return newMessages.length > MAX_MESSAGES 
        ? newMessages.slice(-MAX_MESSAGES) 
        : newMessages;
    });
    setIsLoading(true);

    // Create AbortController for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const requestBody = {
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: message.trim()
              }
            ]
          }
        ],
        tool_choice: {
          type: "auto"
        },
        stream: true
      };

      // Call backend proxy instead of Snowflake directly (secure: PAT never exposed to browser)
      const backendEndpoint = `${config.backendUrl}/api/agents/${encodeURIComponent(selectedAgent)}/messages`;
      
      const response = await fetch(backendEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify(requestBody),
        signal: abortController.signal
      });

      if (!response.ok) {
        // Try to get JSON error message from backend
        let errorMessage = `${ERROR_TEXT.API_ERROR}: ${response.status} ${response.statusText}`;
        try {
          const contentType = response.headers.get('content-type');
          if (contentType?.includes('application/json')) {
            const errorData = await response.json();
            // Backend now sends errorParts as an array to preserve structure
            errorMessage = errorData.errorParts 
              ? errorData.errorParts.join('\n\n')  // Join array with double newlines
              : (errorData.error || errorData.message || errorMessage);
          }
        } catch {
          // If parsing fails, use default message
        }
        // Attach fullMessage to preserve \n\n (Error.message normalizes newlines)
        const error = new Error(errorMessage);
        (error as any).fullMessage = errorMessage;
        throw error;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        const errorMessage = ERROR_TEXT.NO_READABLE_STREAM;
        const error = new Error(errorMessage);
        (error as any).fullMessage = errorMessage;
        throw error;
      }

      const decoder = new TextDecoder();
      let assistantText = '';
      let currentEvent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (!dataStr || dataStr === '[DONE]') continue;

            try {
              const data = JSON.parse(dataStr);

              if (currentEvent === 'response.text.delta' && data.text) {
                assistantText += data.text;
                const currentText = assistantText;
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessageId 
                    ? { 
                        ...msg, 
                        text: currentText,
                        status: 'thinking' as const,
                        isStreaming: true
                      }
                    : msg
                ));
              } else if (currentEvent === 'response.status' && data.message) {
                const statusMessage = getApiStatusMessage(data.message);
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessageId 
                    ? { 
                        ...msg, 
                        status: 'thinking' as const,
                        streamingStatus: statusMessage,
                        thinkingSteps: (msg.thinkingSteps || []).includes(statusMessage) 
                          ? msg.thinkingSteps 
                          : [...(msg.thinkingSteps || []), statusMessage],
                        timeline: [
                          ...(msg.timeline || []),
                          { type: 'status', content: statusMessage, timestamp: new Date() }
                        ]
                      }
                    : msg
                ));
              } else if (currentEvent === 'response.tool_result') {
                const toolStatus = API_DEFAULTS.PROCESSING_RESULTS;
                const sqlQuery = extractSqlQuery(data);
                const verificationInfo = extractVerificationInfo(data);
                
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessageId 
                    ? { 
                        ...msg, 
                        status: 'thinking' as const,
                        streamingStatus: toolStatus,
                        thinkingSteps: (msg.thinkingSteps || []).includes(toolStatus) 
                          ? msg.thinkingSteps 
                          : [...(msg.thinkingSteps || []), toolStatus],
                        sqlQueries: sqlQuery 
                          ? [...(msg.sqlQueries || []), { 
                              sql: sqlQuery, 
                              verification: verificationInfo || undefined 
                            }]
                          : msg.sqlQueries,
                        timeline: [
                          ...(msg.timeline || []),
                          { type: 'tool', content: toolStatus, timestamp: new Date() },
                          ...(sqlQuery ? [{ type: 'sql' as const, content: sqlQuery, timestamp: new Date() }] : [])
                        ]
                      }
                    : msg
                ));
              } else if (currentEvent === 'response.thinking' && data.thinking && data.thinking.text) {
                const thinkingText = data.thinking.text.trim();
                if (thinkingText) {
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessageId 
                      ? { 
                          ...msg, 
                          status: 'thinking' as const,
                          thinkingTexts: [...(msg.thinkingTexts || []), thinkingText],
                          timeline: [
                            ...(msg.timeline || []),
                            { type: 'thinking', content: thinkingText, timestamp: new Date() }
                          ]
                        }
                      : msg
                  ));
                }
              } else if (currentEvent === 'response.thinking.delta' && data.text) {
                const deltaText = data.text;
                if (deltaText) {
                  setMessages(prev => prev.map(msg => {
                    if (msg.id === assistantMessageId) {
                      const currentThinkingTexts = msg.thinkingTexts || [];
                      const lastIndex = currentThinkingTexts.length - 1;
                      
                      if (lastIndex >= 0) {
                        const updatedThinkingTexts = [...currentThinkingTexts];
                        updatedThinkingTexts[lastIndex] = updatedThinkingTexts[lastIndex] + deltaText;
                        
                        return {
                          ...msg,
                          status: 'thinking' as const,
                          thinkingTexts: updatedThinkingTexts
                        };
                      } else {
                        return {
                          ...msg,
                          status: 'thinking' as const,
                          thinkingTexts: [deltaText],
                          timeline: [
                            ...(msg.timeline || []),
                            { type: 'thinking', content: 'Processing thinking...', timestamp: new Date() }
                          ]
                        };
                      }
                    }
                    return msg;
                  }));
                }
              } else if (currentEvent === 'response.chart') {
                if (data.chart_spec) {
                  try {
                    const chartSpec = JSON.parse(data.chart_spec);
                    const chartContent: ChartContent = {
                      type: 'vega-lite' as const,
                      chart_spec: chartSpec
                    };
                    
                    setMessages(prev => prev.map(msg => 
                      msg.id === assistantMessageId
                        ? {
                            ...msg,
                            charts: [...(msg.charts || []), chartContent],
                            timeline: [
                              ...(msg.timeline || []),
                              { type: 'chart', content: 'Chart visualization added', timestamp: new Date() }
                            ]
                          }
                        : msg
                    ));
                  } catch (parseError) {
                    // Skip malformed chart data
                  }
                }
              } else if (currentEvent === 'response.text.annotation') {
                // Handle annotations (citations, sources, references, etc.)
                if (data) {
                  try {
                    // Extract annotation from nested structure
                    const annotationData = data.annotation || data;
                    
                    const annotation = {
                      type: annotationData.type || 'citation',
                      start_index: data.start_index,
                      end_index: data.end_index,
                      annotation_index: data.annotation_index,
                      content_index: data.content_index,
                      text: annotationData.text,
                      url: annotationData.doc_id, // Use doc_id as URL
                      title: annotationData.doc_title,
                      source: annotationData.source,
                      doc_id: annotationData.doc_id,
                      search_result_id: annotationData.search_result_id,
                      index: annotationData.index
                    };
                    
                    setMessages(prev => prev.map(msg => 
                      msg.id === assistantMessageId
                        ? {
                            ...msg,
                            annotations: [...(msg.annotations || []), annotation],
                            timeline: [
                              ...(msg.timeline || []),
                              { 
                                type: 'annotation', 
                                content: `Citation: ${annotation.title || 'Reference'}`, 
                                timestamp: new Date() 
                              }
                            ]
                          }
                        : msg
                    ));
                  } catch (annotationError) {
                    // Skip malformed annotation data
                    console.warn('Failed to process annotation:', annotationError);
                  }
                }
              }
            } catch (parseError) {
              // Skip malformed streaming data
            }
          }
        }
      }

      // Mark message as complete
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? { 
              ...msg, 
              text: assistantText || ERROR_TEXT.RESPONSE_COMPLETED, 
              status: 'sent' as const,
              isStreaming: false,
              streamingStatus: undefined,
            }
          : msg
      ));

      return { success: true, assistantMessageId };

    } catch (error) {
      // Handle abort error specifically
      if (error instanceof Error && error.name === 'AbortError') {
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId 
            ? { 
                ...msg, 
                text: '', 
                status: 'error' as const, 
                error: `${ERROR_TEXT.ERROR_PREFIX}\n\n${ERROR_TEXT.USER_CANCELED}`,
                isStreaming: false,
                streamingStatus: undefined
              }
            : msg
        ));
      } else {
        // Check if this is a network error (connection lost during streaming)
        let errorMessage: string;
        if (error instanceof TypeError && 
            (error.message.includes('network') || 
             error.message.includes('fetch') || 
             error.message.includes('Failed to fetch'))) {
          // Network error during streaming - format with ERROR_PREFIX and tips
          errorMessage = `${ERROR_TEXT.ERROR_PREFIX}\n\nConnection lost during streaming.\n\n💡 Tip: The backend server at ${config.backendUrl} stopped or crashed, network connection was interrupted, or the backend server is no longer running.`;
        } else {
          // Use fullMessage property to preserve \n\n (Error.message normalizes newlines)
          errorMessage = error instanceof Error ? ((error as any).fullMessage || error.message) : ERROR_TEXT.UNKNOWN_ERROR;
        }
        
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId 
          ? { 
              ...msg, 
              text: '', 
              status: 'error' as const, 
              error: errorMessage,
              isStreaming: false,
              streamingStatus: undefined
            }
          : msg
        ));
      }
      return { success: false, error };
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [isLoading, selectedAgent]);

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current && isLoading) {
      abortControllerRef.current.abort();
    }
  }, [isLoading]);

  const clearMessages = useCallback(() => {
    // Cancel any ongoing request
    if (abortControllerRef.current && isLoading) {
      abortControllerRef.current.abort();
    }
    
    setMessages([]);
    setIsLoading(false);
    abortControllerRef.current = null;
  }, [isLoading]);

  return {
    messages,
    isLoading,
    sendMessage,
    cancelRequest,
    clearMessages
  };
};


