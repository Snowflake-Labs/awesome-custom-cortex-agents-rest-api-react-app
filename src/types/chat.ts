/**
 * Chat-related type definitions
 * Centralized types for the chat interface
 */

export interface SqlQueryWithVerification {
  sql: string;
  verification?: {
    verified_query_used?: boolean;
    query_verified?: boolean;
    validated?: boolean;
    verification?: any;
  };
}

export interface TextAnnotation {
  type: string;
  start_index?: number;
  end_index?: number;
  annotation_index?: number;
  content_index?: number;
  text?: string;
  url?: string;
  title?: string;
  source?: string;
  doc_id?: string;
  doc_title?: string;
  search_result_id?: string;
  index?: number;
  [key: string]: any; // Allow additional properties
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error' | 'thinking';
  error?: string;
  isStreaming?: boolean;
  streamingStatus?: string;
  thinkingSteps?: string[];
  thinkingTexts?: string[];
  sqlQueries?: SqlQueryWithVerification[];
  charts?: any[]; // Using any[] for now, can be refined based on chart types
  annotations?: TextAnnotation[]; // Metadata about the response text (citations, sources, etc.)
  timeline?: Array<{
    type: 'status' | 'thinking' | 'tool' | 'sql' | 'chart' | 'annotation';
    content: string;
    timestamp?: Date;
    contentIndex?: number;
  }>;
  toolsUsed?: string[];
}

export interface AccordionState {
  collapsed: Set<string>;
  toggle: (id: string) => void;
}


