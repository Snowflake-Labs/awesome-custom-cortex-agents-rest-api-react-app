/**
 * AnnotationsSection Component
 * Displays annotations (citations, sources, references) as numbered items with tooltips
 */

import React from 'react';
import {
  Box,
  Typography,
  Stack,
  Chip,
  Tooltip,
  alpha,
  useTheme
} from '@mui/material';
import {
  Link as LinkIcon,
  Source as SourceIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { TextAnnotation } from '../../types/chat';
import { MESSAGE_LABELS } from '../../constants/textConstants';

interface AnnotationsSectionProps {
  messageId: string;
  annotations: TextAnnotation[];
  collapsed: boolean;
  onToggle: (messageId: string) => void;
}

export const AnnotationsSection: React.FC<AnnotationsSectionProps> = ({
  messageId,
  annotations,
  collapsed,
  onToggle
}) => {
  const theme = useTheme();

  if (!annotations || annotations.length === 0) {
    return null;
  }

  const getAnnotationIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'citation':
      case 'reference':
        return <SourceIcon sx={{ fontSize: 14 }} />;
      case 'link':
      case 'url':
        return <LinkIcon sx={{ fontSize: 14 }} />;
      default:
        return <InfoIcon sx={{ fontSize: 14 }} />;
    }
  };

  const getTooltipContent = (annotation: TextAnnotation) => {
    // Format title
    const title = annotation.title || annotation.doc_title || 'Reference';

    return (
      <Box sx={{ p: 0.5, maxWidth: 400 }}>
        {/* Title with icon */}
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1 }}>
          {getAnnotationIcon(annotation.type)}
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: 'inherit'
            }}
          >
            {title}
          </Typography>
        </Stack>
        
        {/* Excerpt/Description - increased to 400 chars with scrolling */}
        {annotation.text && (
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              color: 'inherit',
              lineHeight: 1.5,
              maxHeight: '200px',
              overflowY: 'auto'
            }}
          >
            {annotation.text.length > 400 
              ? `${annotation.text.substring(0, 400)}...` 
              : annotation.text}
          </Typography>
        )}
      </Box>
    );
  };

  return (
    <Box 
      sx={{ 
        mt: 2,
        pt: 2,
        borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            fontWeight: 600,
            fontSize: '0.75rem'
          }}
        >
          {MESSAGE_LABELS.SOURCES_LABEL}
        </Typography>
        {annotations.map((annotation, index) => {
          const linkUrl = annotation.url || annotation.doc_id;
          const hasValidLink = !!(linkUrl && linkUrl.trim().length > 0);
          
          return (
            <Tooltip
              key={index}
              title={getTooltipContent(annotation)}
              arrow
              placement="top"
              disableInteractive
              enterDelay={300}
              componentsProps={{
                tooltip: {
                  sx: {
                    backgroundColor: theme.palette.mode === 'dark' 
                      ? alpha(theme.palette.grey[900], 0.98)
                      : alpha(theme.palette.background.paper, 0.98),
                    color: theme.palette.mode === 'dark' ? 'white' : 'text.primary',
                    maxWidth: 400,
                    maxHeight: 300,
                    fontSize: '0.875rem',
                    p: 1.5,
                    boxShadow: theme.palette.mode === 'dark'
                      ? `0 8px 24px ${alpha(theme.palette.common.black, 0.4)}`
                      : `0 8px 24px ${alpha(theme.palette.grey[500], 0.25)}`,
                    border: theme.palette.mode === 'dark'
                      ? `1px solid ${alpha(theme.palette.grey[700], 0.5)}`
                      : `1px solid ${alpha(theme.palette.grey[300], 0.5)}`,
                    borderRadius: 1.5,
                    '& .MuiTooltip-arrow': {
                      color: theme.palette.mode === 'dark' 
                        ? alpha(theme.palette.grey[900], 0.98)
                        : alpha(theme.palette.background.paper, 0.98)
                    }
                  }
                }
              }}
            >
              <Chip
                icon={getAnnotationIcon(annotation.type)}
                label={index + 1}
                component={hasValidLink ? "a" : "div"}
                href={hasValidLink ? linkUrl : undefined}
                target={hasValidLink ? "_blank" : undefined}
                rel={hasValidLink ? "noopener noreferrer" : undefined}
                size="small"
                clickable={hasValidLink}
                sx={{
                  height: 24,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  backgroundColor: alpha(theme.palette.info.main, 0.1),
                  color: 'info.main',
                  border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
                  cursor: hasValidLink ? 'pointer' : 'default',
                  textDecoration: 'none',
                  pointerEvents: 'auto',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.info.main, 0.2),
                    borderColor: alpha(theme.palette.info.main, 0.5),
                    transform: hasValidLink ? 'translateY(-2px)' : 'none',
                    boxShadow: hasValidLink ? `0 2px 8px ${alpha(theme.palette.info.main, 0.3)}` : 'none'
                  },
                  '&:active': {
                    transform: hasValidLink ? 'translateY(-1px)' : 'none'
                  },
                  '& .MuiChip-icon': {
                    color: 'info.main',
                    marginLeft: '6px'
                  }
                }}
              />
            </Tooltip>
          );
        })}
      </Stack>
    </Box>
  );
};

