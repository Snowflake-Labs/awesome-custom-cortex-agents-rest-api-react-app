import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  Box,
  Container,
  Stack,
  CircularProgress,
  Typography,
  Button,
  alpha,
  useTheme
} from '@mui/material';
import { useAgentConfig } from '../hooks/useAgentConfig';
import { useChatMessages } from '../hooks/useChatMessages';
import { useAccordionState } from '../hooks/useAccordionState';
import { ChatHeader } from './chat/ChatHeader';
import { EmptyState } from './chat/EmptyState';
import { StarterQuestions } from './chat/StarterQuestions';
import { ChatMessage } from './chat/ChatMessage';
import { ChatInput } from './chat/ChatInput';
import { STATUS_TEXT, ERROR_TEXT } from '../constants/textConstants';

const SimpleChatInterface: React.FC = () => {
  const theme = useTheme();
  
  // Agent configuration
  const { 
    config: agentConfig, 
    loading: configLoading, 
    error: configError, 
    getVisibleAgents, 
    refreshAgents 
  } = useAgentConfig();

  // Selected agent state
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  
  // Chat messages and streaming
  const { messages, isLoading, sendMessage, cancelRequest, clearMessages } = useChatMessages(selectedAgent);
  
  // Accordion states for different sections
  const thinkingAccordion = useAccordionState();
  const sqlQueriesAccordion = useAccordionState();
  const chartsAccordion = useAccordionState();
  const annotationsAccordion = useAccordionState();
  
  // Input state
  const [inputText, setInputText] = useState('');
  
  // Starter questions state
  const [starterQuestionsExpanded, setStarterQuestionsExpanded] = useState(true);
  
  // Track manually toggled charts (to prevent auto-expansion after manual interaction)
  const [manuallyToggledCharts, setManuallyToggledCharts] = useState<Set<string>>(new Set());
  
  // Ref for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize selectedAgent when config loads - only set default if no agent is selected
  useEffect(() => {
    if (agentConfig && !selectedAgent) {
      const visibleAgents = getVisibleAgents();
      
      if (Object.keys(visibleAgents).length > 0) {
        // Sort agents alphabetically and select the first one
        const sortedAgentEntries = Object.entries(visibleAgents)
          .sort(([, a], [, b]) => 
            a.displayName.toLowerCase().localeCompare(b.displayName.toLowerCase())
          );
        
        const firstAgent = sortedAgentEntries[0][0];
        setSelectedAgent(firstAgent);
      }
    }
  }, [agentConfig, getVisibleAgents, selectedAgent]);

  // Handle case where selected agent becomes invisible
  useEffect(() => {
    if (agentConfig && selectedAgent) {
      const visibleAgents = getVisibleAgents();
      const visibleAgentKeys = Object.keys(visibleAgents);
      
      // If currently selected agent is not visible, switch to first alphabetical one
      if (!visibleAgentKeys.includes(selectedAgent) && visibleAgentKeys.length > 0) {
        const sortedAgentEntries = Object.entries(visibleAgents)
          .sort(([, a], [, b]) => 
            a.displayName.toLowerCase().localeCompare(b.displayName.toLowerCase())
          );
        const fallbackAgent = sortedAgentEntries[0][0];
        setSelectedAgent(fallbackAgent);
      }
    }
  }, [agentConfig, selectedAgent, getVisibleAgents]);

  // Clear chat when agent selection changes
  useEffect(() => {
    clearMessages();
    setInputText('');
    thinkingAccordion.reset();
    sqlQueriesAccordion.reset();
    chartsAccordion.reset();
    annotationsAccordion.reset();
    setManuallyToggledCharts(new Set());
  }, [selectedAgent]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Auto-collapse thinking steps and SQL queries when response is complete
  useEffect(() => {
    messages.forEach(message => {
      if (message.sender === 'assistant' && 
          message.status === 'sent' && 
          !message.isStreaming) {
        thinkingAccordion.collapse(message.id);
        sqlQueriesAccordion.collapse(message.id);
      }
    });
  }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-expand charts after final response text is displayed
  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];
    
    messages.forEach(message => {
      if (message.sender === 'assistant' && 
          message.charts && 
          message.charts.length > 0 && 
          message.status === 'sent' && 
          !message.isStreaming &&
          message.text && 
          message.text.trim().length > 0 &&
          !manuallyToggledCharts.has(message.id)) {
        // Auto-expand charts accordion only after final response text is displayed
        const timeoutId = setTimeout(() => {
          chartsAccordion.expand(message.id);
        }, 300);
        timeouts.push(timeoutId);
      }
    });

    return () => {
      timeouts.forEach(timeoutId => clearTimeout(timeoutId));
    };
  }, [messages, manuallyToggledCharts]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle form submit
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) {
      cancelRequest();
    } else if (inputText.trim()) {
      setStarterQuestionsExpanded(false);
      sendMessage(inputText.trim());
      setInputText('');
    }
  }, [inputText, sendMessage, isLoading, cancelRequest]);

  // Handle starter question click
  const handleStarterQuestionClick = useCallback((question: string) => {
    if (question.trim()) {
      setStarterQuestionsExpanded(false);
      sendMessage(question);
    }
  }, [sendMessage]);

  // Handle re-send message
  const handleResendMessage = useCallback((text: string) => {
    if (text.trim()) {
      setStarterQuestionsExpanded(false);
      sendMessage(text);
    }
  }, [sendMessage]);

  // Handle agent change
  const handleAgentChange = useCallback((agent: string) => {
    setSelectedAgent(agent);
    setInputText('');
    setStarterQuestionsExpanded(true);
  }, []);

  // Handle new chat
  const handleNewChat = useCallback(() => {
    clearMessages();
    setInputText('');
    thinkingAccordion.reset();
    sqlQueriesAccordion.reset();
    chartsAccordion.reset();
    annotationsAccordion.reset();
    setManuallyToggledCharts(new Set());
    setStarterQuestionsExpanded(true);
    refreshAgents();
  }, [clearMessages, thinkingAccordion, sqlQueriesAccordion, chartsAccordion, annotationsAccordion, refreshAgents]);

  // Handle chart toggle with manual tracking
  const handleChartToggle = useCallback((messageId: string) => {
    setManuallyToggledCharts(prev => {
      const newSet = new Set(prev);
      newSet.add(messageId);
      return newSet;
    });
    chartsAccordion.toggle(messageId);
  }, [chartsAccordion]);

  // Memoize visible messages for performance
  const visibleMessages = useMemo(() => {
    return messages.filter((message) => {
      const willShowThinking = message.sender === 'assistant' && (
        (message.thinkingTexts && message.thinkingTexts.length > 0 && message.thinkingTexts.some(text => text.trim().length > 0)) ||
        (message.sqlQueries && message.sqlQueries.length > 0)
      );
      const willShowText = message.text && message.text.trim().length > 0;
      const willShowStatus = message.status === 'thinking' && message.isStreaming && (
        (message.thinkingTexts && message.thinkingTexts.length > 0) ||
        (message.sqlQueries && message.sqlQueries.length > 0) ||
        (message.text && message.text.trim().length > 0)
      );
      const willShowError = message.status === 'error' && message.error && message.error.trim().length > 0;
      
      return willShowThinking || willShowText || willShowStatus || willShowError;
    });
  }, [messages]);

  // Get current agent's starter questions
  const currentAgentQuestions = useMemo(() => {
    if (!agentConfig || !selectedAgent) return [];
    return agentConfig.agents[selectedAgent]?.starterQuestions || [];
  }, [agentConfig, selectedAgent]);

  // Get current agent's display name
  const currentAgentName = useMemo(() => {
    if (!agentConfig || !selectedAgent) return '';
    return agentConfig.agents[selectedAgent]?.displayName || selectedAgent;
  }, [agentConfig, selectedAgent]);

  // Show loading state while config is loading
  if (configLoading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        {/* Header */}
        <ChatHeader />
        
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          minHeight: 'calc(100vh - 80px)'
        }}>
          <Stack spacing={2} alignItems="center">
            <CircularProgress size={40} />
            <Typography variant="body1" color="text.secondary">
              {STATUS_TEXT.LOADING_CONFIG}
            </Typography>
          </Stack>
        </Box>
      </Box>
    );
  }

  // Show error state if config failed to load
  if (configError || !agentConfig) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        {/* Header */}
        <ChatHeader />
        
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          minHeight: 'calc(100vh - 80px)'
        }}>
          <Stack spacing={3} alignItems="center" sx={{ px: 3, width: { xs: '100%', sm: '98%' }, maxWidth: 1200 }}>
             {(() => {
                // configError is already a string from the hook
                const errorString = configError || 'An error occurred';
                
                // Split error message: first line is the header, rest goes in the box
                const errorParts = errorString.split('\n\n');
                const errorHeader = errorParts[0] || 'An error occurred';
                const detailsSection = errorParts.slice(1).join('\n\n');
                
                return (
                <Box
                  sx={{
                    mt: 2,
                    py: 1.5,
                    px: 2,
                    backgroundColor: alpha('#ffc107', 0.08),
                    border: `1px solid ${alpha('#ffc107', 0.3)}`,
                    borderRadius: 1.5,
                    borderLeft: `4px solid ${alpha('#ffc107', 0.7)}`,
                  }}
                >
                  {/* Error Header - Bigger and Centered, smaller on mobile */}
                  <Typography 
                    sx={{ 
                      fontSize: { xs: '1.1rem', sm: '1.3rem', md: '1.5rem' },
                      fontWeight: 700,
                      color: theme.palette.mode === 'dark' ? '#fff' : '#000',
                      textAlign: 'center',
                      mb: detailsSection ? 2 : 0
                    }}
                  >
                    {errorHeader}
                  </Typography>
                  
                  {/* Rest of the error message - smaller on mobile */}
                  {detailsSection && (
                    <Typography 
                      sx={{ 
                        fontSize: { xs: '0.9rem', sm: '0.95rem', md: '1rem' },
                        fontWeight: 500,
                        color: theme.palette.mode === 'dark' ? '#fff' : '#000',
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.6
                      }}
                    >
                      {detailsSection}
                    </Typography>
                  )}
                </Box>
              );
            })()}
          </Stack>
        </Box>
      </Box>
    );
  }
  
  // Check if we have no agents after successful API call
  const visibleAgents = getVisibleAgents();
  const hasNoAgents = Object.keys(visibleAgents).length === 0;
  
  if (hasNoAgents) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        {/* Header */}
        <ChatHeader />
        
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          minHeight: 'calc(100vh - 80px)'
        }}>
          <Stack spacing={3} alignItems="center" maxWidth={600} sx={{ px: 3 }}>
            <Typography variant="h5" color="text.primary" fontWeight={600}>
              {ERROR_TEXT.NO_AGENTS_TITLE}
            </Typography>
            <Typography variant="body1" color="text.secondary" textAlign="center">
              {ERROR_TEXT.NO_AGENTS_MESSAGE}
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              {ERROR_TEXT.NO_AGENTS_HELP}
            </Typography>
            <Button 
              variant="contained" 
              onClick={refreshAgents}
              size="large"
              sx={{ mt: 2 }}
            >
              {ERROR_TEXT.REFRESH_AGENTS}
            </Button>
          </Stack>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh', 
      bgcolor: 'background.default', 
      color: 'text.primary' 
    }}>
      {/* Header */}
      <ChatHeader />

      {/* Chat Area - flex grow to fill space */}
      <Container maxWidth="lg" sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        py: 3, 
        pb: 2 
      }}>
        {messages.length === 0 ? (
          <Stack spacing={3} sx={{ pt: 2 }}>
            {/* Empty State Greeting */}
            <EmptyState />

            {/* Starter Questions */}
            {currentAgentQuestions.length > 0 && (
              <StarterQuestions
                expanded={starterQuestionsExpanded}
                onToggle={setStarterQuestionsExpanded}
                agentName={currentAgentName}
                questions={currentAgentQuestions}
                onQuestionClick={handleStarterQuestionClick}
              />
            )}
          </Stack>
        ) : (
          <Box sx={{ width: '100%' }}>
            {/* Starter Questions Accordion (shown in chat) */}
            {currentAgentQuestions.length > 0 && (
              <Box sx={{ width: '100%', mb: 3 }}>
                <StarterQuestions
                  expanded={starterQuestionsExpanded}
                  onToggle={setStarterQuestionsExpanded}
                  agentName={currentAgentName}
                  questions={currentAgentQuestions}
                  onQuestionClick={handleStarterQuestionClick}
                />
              </Box>
            )}
            
            {/* Messages */}
            <Stack spacing={3}>
              {visibleMessages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  collapsedThinking={thinkingAccordion.isCollapsed(message.id)}
                  collapsedSqlQueries={sqlQueriesAccordion.isCollapsed(message.id)}
                  collapsedCharts={chartsAccordion.isCollapsed(message.id)}
                  collapsedAnnotations={annotationsAccordion.isCollapsed(message.id)}
                  onToggleThinking={thinkingAccordion.toggle}
                  onToggleSqlQueries={sqlQueriesAccordion.toggle}
                  onToggleCharts={handleChartToggle}
                  onToggleAnnotations={annotationsAccordion.toggle}
                  onResendMessage={handleResendMessage}
                />
              ))}
            </Stack>
            <div ref={messagesEndRef} />
          </Box>
        )}
      </Container>

      {/* Input Area */}
      <ChatInput
        inputText={inputText}
        onInputChange={setInputText}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        selectedAgent={selectedAgent}
        agents={agentConfig ? getVisibleAgents() : {}}
        onAgentChange={handleAgentChange}
        onNewChat={handleNewChat}
      />
    </Box>
  );
};

export default SimpleChatInterface;

