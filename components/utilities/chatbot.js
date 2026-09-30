import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
const AURORA_API = 'https://api.aurora-lumen.com';

const welcomeMessage =
  "Hi there! I'm the Eljawad Motors assistant. Ask me anything about our vehicles, services, or tools and I'll guide you.";
const initialMessages = [{ role: 'assistant', content: welcomeMessage }];

const quickReplies = [
  'Browse stock 🚗',
  'Shipping cost 📦',
  'Used tires 🛞',
  'How to order 📋',
  'Contact team ✉️',
];
const stripEmoji = (s) => s.replace(/\p{Emoji_Presentation}/gu, '').trim();

const SESSION_KEY = 'eljawad-chat-session';

const loadSession = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveSession = (msgs) => {
  if (typeof window === 'undefined') return;
  try {
    // Strip the transient pending flag before persisting.
    localStorage.setItem(SESSION_KEY, JSON.stringify(msgs.map(({ pending, ...m }) => m)));
  } catch {}
};

const Chatbot = () => {
  const [messages, setMessages] = useState(() => initialMessages);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const messagesEndRef = useRef(null);

  const defaultSize = { width: 380, height: 540 };
  const getInitialSize = () => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('chatbot-size');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return defaultSize;
  };
  const [chatSize, setChatSize] = useState(getInitialSize);
  const dragRef = useRef(null);

  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = chatSize.width;
    const startHeight = chatSize.height;

    const handleMouseMove = (e) => {
      const newWidth = Math.max(300, Math.min(startWidth + (e.clientX - startX), Math.round(window.innerWidth * 0.4)));
      const newHeight = Math.max(400, Math.min(startHeight + (e.clientY - startY), window.innerHeight - 120));
      const newSize = { width: newWidth, height: newHeight };
      setChatSize(newSize);
      dragRef.current = newSize;
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (dragRef.current) {
        localStorage.setItem('chatbot-size', JSON.stringify(dragRef.current));
        dragRef.current = null;
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [chatSize]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    const seen = sessionStorage.getItem('aurora-notif-seen');
    if (seen) return;
    const t = setTimeout(() => setShowNotif(true), 3500);
    return () => clearTimeout(t);
  }, []);

  // Restore a prior conversation from localStorage on first open.
  useEffect(() => {
    if (!isOpen || sessionLoaded) return;
    setSessionLoaded(true);
    const saved = loadSession();
    if (saved && saved.length > 0) {
      setMessages(saved);
      setShowQuickReplies(false);
    }
  }, [isOpen, sessionLoaded]);

  const openChat = () => {
    setIsOpen(true);
    setShowNotif(false);
    sessionStorage.setItem('aurora-notif-seen', '1');
  };


  const sendMessage = async (overrideText) => {
    const userMessage = (typeof overrideText === 'string' ? overrideText : userInput).trim();
    if (!userMessage || isLoading) return;

    const history = messages
      .filter((msg) => !msg.pending)
      .map((msg) => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      }));

    setUserInput('');
    setShowQuickReplies(false);
    setMessages(prev => {
      const next = [
        ...prev,
        { role: 'user', content: userMessage },
        { role: 'assistant', content: '', pending: true },
      ];
      saveSession(next);
      return next;
    });
    setIsLoading(true);

    // Append a streamed token to the trailing (pending) assistant bubble.
    const appendToken = (token) => {
      setMessages(prev => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last && last.role === 'assistant') {
          copy[copy.length - 1] = { ...last, content: last.content + token, pending: true };
        }
        saveSession(copy);
        return copy;
      });
    };

    try {
      const response = await fetch(`${AURORA_API}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          prompt: userMessage,
          mode: 'aurora_guide_rag',
          chat_title: 'aurora_guide_widget',
          new_session: false,
          incognito: true,
          images: [],
          messages: history,
          page_url: typeof window !== 'undefined' ? window.location.href : '',
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Aurora API request failed with status ${response.status}`);
      }

      // Parse the SSE stream: lines of `data: {"token": "..."}` ending with `data: [DONE]`.
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trimStart();
          if (!line.startsWith('data:')) continue;
          const data = line.replace(/^data:\s*/, '').trim();
          if (!data || data === '[DONE]') continue;
          try {
            const obj = JSON.parse(data);
            if (obj.error) throw new Error(obj.error);
            const token = obj.token ?? obj.text ?? obj.response ?? '';
            if (token) appendToken(token);
          } catch {
            // Non-JSON keep-alive or partial line — ignore.
          }
        }
      }
    } catch (error) {
      console.error('API Error:', error);
      setMessages(prev => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last && last.role === 'assistant') {
          copy[copy.length - 1] = {
            ...last,
            content: last.content || 'Something went wrong. Please try again later.',
            pending: false,
          };
        }
        saveSession(copy);
        return copy;
      });
    } finally {
      // Clear the pending flag on the final assistant bubble.
      setMessages(prev => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last && last.role === 'assistant' && last.pending) {
          copy[copy.length - 1] = {
            ...last,
            content: last.content || "Sorry, I couldn't get an answer.",
            pending: false,
          };
        }
        saveSession(copy);
        return copy;
      });
      setIsLoading(false);
    }
  };



  const components = {
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
    // Tables break the narrow chat view — degrade them to readable plain text.
    table: ({ children }) => <div className="chatbot-md-plaintable">{children}</div>,
    thead: ({ children }) => <>{children}</>,
    tbody: ({ children }) => <>{children}</>,
    tr: ({ children }) => <div className="chatbot-md-plaintable-row">{children}</div>,
    th: ({ children }) => <span className="chatbot-md-plaintable-cell">{children}</span>,
    td: ({ children }) => <span className="chatbot-md-plaintable-cell">{children}</span>,
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') sendMessage();
  };

  const timeStr = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="chatbot-fixed-container">
      {isOpen && (
        <div className="chatbot-window" style={{ width: chatSize.width, height: chatSize.height }}>
          <div className="chatbot-header">
            <div className="chatbot-header-left">
              <div className="chatbot-header-avatar">🤖</div>
              <div className="chatbot-header-info">
                <span className="chatbot-header-name">Eljawad Motors Assistant</span>
                <span className="chatbot-header-status">Online</span>
              </div>
            </div>
            <button className="close-btn" onClick={() => setIsOpen(false)}>✕</button>
          </div>
          <div className="chatbot-messages">
            {messages.map((msg, index) => (
              <div key={index} className={`chatbot-message ${msg.role}`}>
                <div className="chatbot-bubble">
                  {msg.pending && !msg.content ? (
                    <div className="typing-indicator">
                      <span /><span /><span />
                    </div>
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                      {msg.content}
                    </ReactMarkdown>
                  )}
                </div>
                {!msg.pending && <span className="chatbot-meta">{timeStr()}</span>}
              </div>
            ))}
            {showQuickReplies && !isLoading && (
              <div className="chatbot-qr">
                {quickReplies.map((qr) => (
                  <button
                    key={qr}
                    type="button"
                    className="chatbot-qr-btn"
                    onClick={() => sendMessage(stripEmoji(qr))}
                    disabled={isLoading}
                  >
                    {qr}
                  </button>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="chatbot-input">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
            />
            <button onClick={sendMessage} disabled={isLoading}>Send</button>
          </div>
          <div className="chatbot-resize-handle" onMouseDown={handleResizeStart} />
        </div>
      )}

      {!isOpen && showNotif && (
        <div className="chatbot-notif-card">
          <button
            className="chatbot-notif-dismiss"
            aria-label="Dismiss"
            onClick={() => { setShowNotif(false); sessionStorage.setItem('aurora-notif-seen', '1'); }}
          >✕</button>
          <p className="chatbot-notif-text">👋 Hi! Ask Aurora anything about our services.</p>
          <button className="wb pulse" aria-label="Open Aurora chat" onClick={openChat}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>Chat with Aurora</span>
          </button>
        </div>
      )}

      <button className="chatbot-toggle-btn" onClick={() => { isOpen ? setIsOpen(false) : openChat(); }}>
        💬
      </button>
    </div>
  );
};

export default Chatbot;
