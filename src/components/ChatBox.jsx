// src/components/ChatBox.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, X, Image, File } from 'lucide-react';

export default function ChatBox({ isOpen, onClose, conversation = null }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! How can I help you today?",
      sender: 'support',
      timestamp: new Date(Date.now() - 300000),
      read: true
    },
    {
      id: 2,
      text: "I have a question about my rent payment.",
      sender: 'user',
      timestamp: new Date(Date.now() - 120000),
      read: true
    },
    {
      id: 3,
      text: "Sure! I'd be happy to help with your rent payment question. What would you like to know?",
      sender: 'support',
      timestamp: new Date(),
      read: false
    }
  ]);
  
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const newMessage = {
      id: messages.length + 1,
      text: message,
      sender: 'user',
      timestamp: new Date(),
      read: false
    };

    setMessages(prev => [...prev, newMessage]);
    setMessage('');

    // Simulate auto-reply after 2 seconds
    setTimeout(() => {
      const autoReply = {
        id: messages.length + 2,
        text: "Thanks for your message! Our support team will get back to you shortly.",
        sender: 'support',
        timestamp: new Date(),
        read: false
      };
      setMessages(prev => [...prev, autoReply]);
    }, 2000);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-blue-600 text-white rounded-t-2xl">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center">
            <span className="text-sm font-semibold">S</span>
          </div>
          <div>
            <h3 className="font-semibold">Support Team</h3>
            <p className="text-blue-100 text-sm">Online • Responds quickly</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-blue-500 rounded-lg transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className="flex max-w-[80%]">
              {msg.sender === 'support' && (
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                  <span className="text-xs text-white font-semibold">S</span>
                </div>
              )}
              <div
                className={`px-4 py-2 rounded-2xl ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-white text-gray-900 border border-gray-200 rounded-bl-none'
                }`}
              >
                <p className="text-sm">{msg.text}</p>
                <p
                  className={`text-xs mt-1 ${
                    msg.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}
                >
                  {formatTime(msg.timestamp)}
                </p>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white">
        <div className="flex space-x-2 mb-2">
          <button
            type="button"
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Image className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Smile className="h-4 w-4" />
          </button>
        </div>
        
        <div className="flex space-x-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          <button
            type="submit"
            disabled={!message.trim()}
            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}