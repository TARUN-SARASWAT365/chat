import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { ArrowLeft } from 'lucide-react';
import './Chat.css';

const socket = io('https://chatback-7.onrender.com');
const reactionsList = ['👍', '❤️', '😂', '😮', '😢', '👏'];

const Chat = ({ currentUser }) => {
  const [darkMode, setDarkMode] = useState(false);   // Added this
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [file, setFile] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeout = useRef(null);

  useEffect(() => {
    socket.emit('user_connected', currentUser);
    socket.on('online_users', setOnlineUsers);
    socket.on('receive_message', msg => setMessages(prev => [...prev, msg]));
    socket.on('reaction_updated', ({ messageId, reactions }) =>
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, reactions } : m))
    );
    socket.on('messages_seen', ({ receiver, updatedMessages }) => {
      if (receiver === currentUser) setMessages(updatedMessages);
    });
    socket.on('typing', user => {
      if (user === selectedUser) {
        setIsTyping(true);
        clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => setIsTyping(false), 1500);
      }
    });

    return () => {
      socket.off('online_users');
      socket.off('receive_message');
      socket.off('reaction_updated');
      socket.off('messages_seen');
      socket.off('typing');
    };
  }, [currentUser, selectedUser]);

  // rest of your code unchanged...

  return (
    <div className={`chat-container ${darkMode ? 'dark' : ''}`}>
      {/* ...sidebar and chat UI code */}
      <button onClick={() => setDarkMode(!darkMode)}>Toggle Dark Mode</button>
      {/* ... */}
    </div>
  );
};

export default Chat;
