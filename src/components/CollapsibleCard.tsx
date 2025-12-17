/**
 * CollapsibleCard Component
 * A Card with a clickable header that collapses/expands content.
 * Shows a summary view when collapsed, full controls when expanded.
 */

import React, { ReactNode } from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Collapse,
  IconButton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

interface CollapsibleCardProps {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  summary: ReactNode;
  children: ReactNode;
  compactMode?: boolean;
}

export const CollapsibleCard: React.FC<CollapsibleCardProps> = ({
  title,
  expanded,
  onToggle,
  summary,
  children,
  compactMode = false,
}) => {
  return (
    <Card>
      <CardContent sx={{ py: compactMode ? 1.5 : 2, '&:last-child': { pb: compactMode ? 2 : 3 } }}>
        {/* Clickable Header */}
        <Box
          onClick={onToggle}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            userSelect: 'none',
            mb: expanded ? 2 : 0,
            '&:hover': {
              opacity: 0.8,
            },
          }}
        >
          <Typography variant="h6" component="div">
            {title}
          </Typography>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            sx={{ ml: 1 }}
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>

        {/* Collapsed Summary View */}
        <Collapse in={!expanded} timeout="auto">
          <Box sx={{ pt: 1 }}>
            {summary}
          </Box>
        </Collapse>

        {/* Expanded Full Content */}
        <Collapse in={expanded} timeout="auto">
          {children}
        </Collapse>
      </CardContent>
    </Card>
  );
};
