import { useState, useRef, useEffect } from 'react';
import { Send, X, Minimize2, Maximize2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import '@/styles/markdown.css'

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const AdminChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I am your SafeDrive admin assistant. How can I help you today?',
      timestamp: new Date()
    }
  ]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (input.trim() === '') return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      // Create the payload exactly as expected by the backend
      const requestPayload = {
        message: input,
        conversation_id: conversationId || undefined
      };
      
      console.log("Sending request:", requestPayload);
      
      // Send to the FastAPI endpoint using axios directly
      const response = await axios.post('https://safedrive-chatbot.onrender.com/chatbot', requestPayload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log("Response received:", response.data);
      
      // Get the response
      const { response: botMessage, conversation_id } = response.data;
      
      // Save the conversation ID for continuing the chat
      setConversationId(conversation_id);
      
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: botMessage,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botResponse]);
    } catch (error: any) {
      console.error('Error sending message to chatbot:', error);
      
      let errorMessage = "Sorry, I encountered an error. Please try again later.";
      if (error.response) {
        console.error("Response error:", error.response.data);
        errorMessage = `Error: ${error.response.status} - ${error.response.data.detail || "Unknown error"}`;
      }
      
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorResponse]);
      toast.error('Failed to get response from assistant');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleChat = () => {
    setIsOpen(prev => !prev);
    setIsMinimized(false);
  };

  const toggleMinimize = () => {
    setIsMinimized(prev => !prev);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  // Helper function to determine if the content contains markdown
  const containsMarkdown = (content: string) => {
    // Check for common markdown patterns
    const markdownPatterns = [
      /^#+\s/m,                 // Headers
      /\*\*.*?\*\*/,            // Bold
      /\*.*?\*/,                // Italic
      /`.*?`/,                  // Inline code
      /```[\s\S]*?```/,         // Code blocks
      /\[.*?\]\(.*?\)/,         // Links
      /^\s*[-*+]\s/m,           // List items
      /^\s*\d+\.\s/m,           // Numbered lists
      /^\s*>/m,                 // Blockquotes
      /\|\s*[-:]+\s*\|/         // Tables
    ];
    
    return markdownPatterns.some(pattern => pattern.test(content));
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {/* Chat toggle button */}
      {!isOpen && (
        <Button 
          onClick={toggleChat} 
          className="h-14 w-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 transition-all"
        >
          <MessageSquare className="h-6 w-6 text-white" />
        </Button>
      )}

      {/* Chat window */}
      {isOpen && (
        <Card className={`w-80 transition-all duration-300 shadow-xl border-blue-200 ${isMinimized ? 'h-16' : 'h-[500px]'}`}>
          <CardHeader className="p-3 border-b flex flex-row items-center justify-between bg-blue-600 text-white rounded-t-lg">
            <div className="flex items-center">
              <Avatar className="h-8 w-8 mr-2">
                <AvatarImage src="/chatbot-avatar.png" alt="ChatBot" />
                <AvatarFallback className="bg-blue-700">SD</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">SafeDrive Assistant</p>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <Button variant="ghost" size="icon" onClick={toggleMinimize} className="h-7 w-7 text-white hover:bg-blue-700">
                {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={toggleChat} className="h-7 w-7 text-white hover:bg-blue-700">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          {!isMinimized && (
            <>
              <CardContent className="p-0 overflow-y-auto h-[calc(100%-110px)]">
                <div className="p-4 space-y-4">
                  {messages.map(message => (
                    <div 
                      key={message.id} 
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[75%] rounded-lg p-3 ${
                          message.role === 'user' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        {message.role === 'assistant' && containsMarkdown(message.content) ? (
                          <div className="text-sm markdown-content">
                            <ReactMarkdown>
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-sm">{message.content}</p>
                        )}
                        <p className="text-xs mt-1 opacity-70">
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </CardContent>

              <CardFooter className="p-3 border-t">
                <div className="flex w-full items-center space-x-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button 
                    size="icon" 
                    onClick={handleSendMessage} 
                    disabled={isLoading || input.trim() === ''}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardFooter>
            </>
          )}
        </Card>
      )}
    </div>
  );
};

export default AdminChatBot;