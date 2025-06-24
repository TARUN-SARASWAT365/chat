import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import './Chat.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const socket = io(BACKEND_URL);

const reactionsList = ['👍', '❤️', '😂', '😮', '😢', '👏'];

const Chat = ({ currentUser }) => {
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showReactionsFor, setShowReactionsFor] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const messagesEndRef = useRef(null);

  useEffect(() => {
    socket.emit('user_connected', currentUser);

    socket.on('online_users', users => setOnlineUsers(users));

    socket.on('receive_message', msg => {
      if (
        (msg.sender === currentUser && msg.receiver === selectedUser) ||
        (msg.sender === selectedUser && msg.receiver === currentUser)
      ) {
        setMessages(prev => [...prev, msg]);

        // Emit delivered event if message received is from other user
        if (msg.sender === selectedUser) {
          socket.emit('message_delivered', { messageId: msg._id });
        }
      }
    });

    socket.on('message_status_updated', ({ messageId, status }) => {
      setMessages(prev =>
        prev.map(m => (m._id === messageId ? { ...m, status } : m))
      );
    });

    socket.on('reaction_updated', ({ messageId, reactions }) => {
      setMessages(prev =>
        prev.map(m => (m._id === messageId ? { ...m, reactions } : m))
      );
    });

    socket.on('typing', ({ sender, isTyping }) => {
      setTypingUsers(prev => ({
        ...prev,
        [sender]: isTyping,
      }));
    });

    return () => {
      socket.off('receive_message');
      socket.off('message_status_updated');
      socket.off('reaction_updated');
      socket.off('typing');
    };
  }, [currentUser, selectedUser]);

  useEffect(() => {
    axios.get(`${BACKEND_URL}/api/users`)
      .then(res => setUsers(res.data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedUser) return;

    axios.get(`${BACKEND_URL}/api/messages?sender=${currentUser}&receiver=${selectedUser}`)
      .then(res => {
        setMessages(res.data);

        // Mark all received messages as read
        res.data.forEach(msg => {
          if (msg.receiver === currentUser && msg.status !== 'read') {
            socket.emit('message_read', { messageId: msg._id });
          }
        });
      })
      .catch(console.error);
  }, [selectedUser, currentUser]);

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    const msg = {
      sender: currentUser,
      receiver: selectedUser,
      content: newMessage.trim(),
      timestamp: new Date(),
    };
    socket.emit('send_message', msg);
    setMessages(prev => [...prev, { ...msg, status: 'sent', reactions: [] }]);
    setNewMessage('');
  };

  const toggleReaction = (messageId, reaction) => {
    setShowReactionsFor(null);
    socket.emit('toggle_reaction', { messageId, user: currentUser, reaction });
  };

  const userHasReacted = (message, reaction) =>
    message.reactions?.some(r => r.user === currentUser && r.reaction === reaction);

  // Typing handling
  const typingTimeoutRef = useRef(null);
  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    socket.emit('typing', { sender: currentUser, receiver: selectedUser, isTyping: true });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', { sender: currentUser, receiver: selectedUser, isTyping: false });
    }, 1500);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isOnline = user => onlineUsers.includes(user.username);

  return (
    <div className="chat-container">
      <aside className="users-list">
        <h3>Users</h3>
        {users.filter(u => u.username !== currentUser).map(user => (
          <div
            key={user._id}
            className={`user-item ${selectedUser === user.username ? 'selected' : ''}`}
            onClick={() => setSelectedUser(user.username)}
          >
            <span className={`status-dot ${isOnline(user) ? 'online' : 'offline'}`}></span>
            <span>{user.username}</span>
            {!isOnline(user) && user.lastSeen && (
              <small>Last seen: {new Date(user.lastSeen).toLocaleString()}</small>
            )}
          </div>
        ))}
      </aside>

      <section className="chat-box">
        {selectedUser ? (
          <>
            <header>
              <h3>{selectedUser}</h3>
              <span className="status-text">
                {isOnline(users.find(u => u.username === selectedUser))
                  ? 'Online'
                  : `Last seen: ${users.find(u => u.username === selectedUser)?.lastSeen ? new Date(users.find(u => u.username === selectedUser).lastSeen).toLocaleString() : 'N/A'}`}
              </span>
            </header>

            <div className="messages">
              {messages.map(msg => {
                const isSender = msg.sender === currentUser;
                const reacted = reactionsList.some(r => userHasReacted(msg, r));

                return (
                  <div
                    key={msg._id || Math.random()}
                    className={`message ${isSender ? 'sent' : 'received'}`}
                    onMouseEnter={() => setShowReactionsFor(msg._id)}
                    onMouseLeave={() => setShowReactionsFor(null)}
                  >
                    <p>{msg.content}</p>

                    <div className="message-footer">
                      <small className="timestamp">{new Date(msg.timestamp).toLocaleTimeString()}</small>

                      {isSender && (
                        <small className={`status ${msg.status}`}>
                          {msg.status === 'sent' && '✓'}
                          {msg.status === 'delivered' && '✓✓'}
                          {msg.status === 'read' && '✓✓ (Read)'}
                        </small>
                      )}
                    </div>

                    {/* Reactions */}
                    {showReactionsFor === msg._id && (
                      <div className="reactions-popup">
                        {reactionsList.map(r => (
                          <span
                            key={r}
                            className={`reaction-btn ${userHasReacted(msg, r) ? 'reacted' : ''}`}
                            onClick={() => toggleReaction(msg._id, r)}
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Show reactions below message */}
                    <div className="message-reactions">
                      {msg.reactions && msg.reactions.length > 0 && msg.reactions.map((r, i) => (
                        <span key={i} className="reaction-display">{r.reaction}</span>
                      ))}
                    </div>
                  </div>
                );
              })}

              {typingUsers[selectedUser] && (
                <div className="typing-indicator">{selectedUser} is typing...</div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <footer>
              <input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={handleTyping}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
              />
              <button onClick={sendMessage}>Send</button>
            </footer>
          </>
        ) : (
          <div className="no-chat-selected">Select a user to start chatting</div>
        )}
      </section>
    </div>
  );
};

export default Chat;
