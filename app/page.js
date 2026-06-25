'use client'

import { Box, Stack, TextField, Button, Paper, Typography, Avatar, CircularProgress, createTheme, ThemeProvider, CssBaseline } from "@mui/material";
import { useState, useRef, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { keyframes } from '@emotion/react';

// Colors used across the page
const ACCENT = '#059669';
const ACCENT_DARK = '#047857';
const ACCENT_SOFT = '#d1fae5';
const PAGE_BG = '#d3ebe1';
const TEXT = '#1f2937';
const MUTED = '#6b7280';

const theme = createTheme({
  palette: {
    primary: { main: ACCENT },
    background: { default: PAGE_BG, paper: '#ffffff' },
  },
  typography: {
    fontFamily: "'Poppins', sans-serif",
  },
});

// A few example questions shown before the first message
const STARTERS = [
  'Explain Big-O notation with an example',
  'Reverse a linked list in Python',
  'What are common system design interview questions?',
];

// Keyframe animation for message fade-in
const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// Component for rendering a single message
const Message = ({ msg }) => {
  const isAssistant = msg.role === 'assistant';
  const name = isAssistant ? 'Interview Coach' : 'You';

  const CodeBlock = ({ node, inline, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    const code = String(children).replace(/\n$/, '');
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    };

    return !inline && match ? (
      <Box sx={{ position: 'relative', my: 1, borderRadius: 2, overflow: 'hidden' }}>
        <SyntaxHighlighter
          style={oneDark}
          language={match[1]}
          PreTag="div"
          {...props}
        >
          {code}
        </SyntaxHighlighter>
        <Button
          size="small"
          onClick={handleCopy}
          aria-label="Copy code"
          startIcon={copied ? <CheckRoundedIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            color: 'white',
            textTransform: 'none',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
            },
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </Box>
    ) : (
      <code className={className} {...props}>
        {children}
      </code>
    );
  };

  const renderContent = (content) => {
    return content.split(/(```[\s\S]*?```)/g).map((part, index) => {
      if (part.startsWith('```')) {
        const language = part.match(/```(\w+)/)?.[1] || '';
        const code = part.replace(/```\w+\n|```/g, '');
        return <CodeBlock key={index} className={`language-${language}`}>{code}</CodeBlock>
      }
      return part;
    });
  };

  const avatar = (
    <Avatar
      sx={{
        width: 34,
        height: 34,
        fontSize: 14,
        fontWeight: 700,
        bgcolor: isAssistant ? ACCENT_SOFT : ACCENT,
        color: isAssistant ? ACCENT_DARK : '#fff',
        border: `1.5px solid ${isAssistant ? ACCENT : ACCENT_DARK}`,
      }}
    >
      {isAssistant ? 'IC' : 'Y'}
    </Avatar>
  );

  return (
    <Stack
      direction="row"
      spacing={1.25}
      alignItems="flex-start"
      justifyContent={isAssistant ? 'flex-start' : 'flex-end'}
      sx={{ animation: `${fadeIn} 0.4s ease-in-out` }}
    >
      {isAssistant && avatar}
      <Box sx={{ maxWidth: '82%' }}>
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mb: 0.25,
            color: MUTED,
            fontWeight: 600,
            textAlign: isAssistant ? 'left' : 'right',
          }}
        >
          {name}
        </Typography>
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            borderRadius: isAssistant ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
            bgcolor: isAssistant ? '#ffffff' : ACCENT,
            color: isAssistant ? TEXT : '#ffffff',
            border: isAssistant ? '1px solid #c4ccd4' : 'none',
            boxShadow: '0 1px 3px rgba(16,24,40,0.08)',
            wordWrap: 'break-word',
          }}
        >
          {renderContent(msg.content)}
        </Paper>
      </Box>
      {!isAssistant && avatar}
    </Stack>
  );
};


export default function HomeWrapper() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Home />
    </ThemeProvider>
  )
}

function Home() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hi there! I\'m your AI Interview Prep Coach. How can I help you today?',
    }
  ]);
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const sendMessage = async (textOverride) => {
    // textOverride lets the starter-prompt buttons send a preset question
    const text = (typeof textOverride === 'string' ? textOverride : message).trim();
    if (!text) return;
    setIsTyping(true);
    const newMessages = [
      ...messages,
      { role: 'user', content: text },
    ];

    setMessages(newMessages);
    setMessage('');

    try {
      const response = await fetch('/api/router', {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.body) {
        throw new Error("Response body is null");
      }

      setMessages(prev => [...prev, {role: 'assistant', content: ''}]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        const chunk = decoder.decode(value, { stream: true });

        setMessages(prevMessages => {
          const lastMessage = prevMessages[prevMessages.length - 1];
          const updatedLastMessage = {
            ...lastMessage,
            content: lastMessage.content + chunk,
          };
          return [...prevMessages.slice(0, -1), updatedLastMessage];
        });
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages(prev => [...prev.slice(0, -1), {role: 'assistant', content: 'Oops! Something went a bit sideways. Please try again.'}]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <Box
      sx={{
        height: '100vh',
        bgcolor: PAGE_BG,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 0, sm: 2, md: 3 },
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 880,
          height: { xs: '100%', sm: '92vh' },
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: { xs: 0, sm: '18px' },
          border: '1px solid #c2ccc6',
          boxShadow: { xs: 'none', sm: '0 12px 34px rgba(16,24,40,0.16)' },
          bgcolor: '#ffffff',
        }}
      >
        <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid #c2ccc6', py: 3, px: 2 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700, color: TEXT }}>
              AI Interview Prep Assistant
            </Typography>
            <Typography variant="subtitle1" sx={{ color: '#4b5563', mt: 0.5 }}>
              Practice technical interviews with an AI assistant
            </Typography>
          </Box>
        </Box>

        <Box sx={{ flexGrow: 1, overflowY: 'auto', bgcolor: '#f1faf5', px: { xs: 2, sm: 3 }, py: 3 }}>
          <Stack spacing={2.5}>
            {messages.map((msg, index) => (
              <Message key={index} msg={msg} />
            ))}

            {messages.length === 1 && !isTyping && (
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ pl: '46px' }}>
                {STARTERS.map((s) => (
                  <Button
                    key={s}
                    variant="outlined"
                    size="small"
                    onClick={() => sendMessage(s)}
                    sx={{
                      textTransform: 'none',
                      borderRadius: '16px',
                      px: 1.75,
                      py: 0.6,
                      fontSize: '0.85rem',
                      color: TEXT,
                      borderColor: '#9ca3af',
                      bgcolor: '#ffffff',
                      '&:hover': { borderColor: MUTED, bgcolor: '#f3f4f6' },
                    }}
                  >
                    {s}
                  </Button>
                ))}
              </Stack>
            )}

            {isTyping && (
              <Stack direction="row" spacing={1.25} alignItems="center">
                <Avatar sx={{ bgcolor: ACCENT_SOFT, color: ACCENT_DARK, width: 34, height: 34, fontSize: 14, fontWeight: 700, border: `1.5px solid ${ACCENT}` }}>
                  IC
                </Avatar>
                <CircularProgress size={18} sx={{ color: ACCENT }} />
              </Stack>
            )}
            <div ref={messagesEndRef} />
          </Stack>
        </Box>

        <Box sx={{ bgcolor: '#fff', borderTop: '1px solid #c2ccc6', py: 1.75, px: { xs: 1.5, sm: 2.5 } }}>
          <Stack direction="row" spacing={1.5} alignItems="flex-end">
            <TextField
              placeholder="Ask me anything..."
              fullWidth
              multiline
              maxRows={4}
              autoFocus
              variant="outlined"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              disabled={isTyping}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '24px',
                  bgcolor: '#ffffff',
                  '& fieldset': { borderColor: '#9ca3af' },
                  '&:hover fieldset': { borderColor: '#6b7280' },
                  '&.Mui-focused fieldset': { borderColor: ACCENT },
                },
                '& .MuiOutlinedInput-input::placeholder': { color: '#6b7280', opacity: 1 },
              }}
            />
            <Button
              variant="contained"
              onClick={() => sendMessage()}
              disabled={isTyping || !message.trim()}
              aria-label="Send message"
              sx={{
                borderRadius: '50%',
                width: 52,
                height: 52,
                minWidth: 52,
                boxShadow: 'none',
                bgcolor: ACCENT,
                '&:hover': { bgcolor: ACCENT_DARK, boxShadow: 'none' },
              }}
            >
              <SendRoundedIcon />
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
