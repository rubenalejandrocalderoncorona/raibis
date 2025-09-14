import React from 'react';
import { Card } from '@/components/ui/card';
import { User, Bot } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'jarvis';
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isJarvis = message.sender === 'jarvis';
  
  return (
    <div className={`flex items-start space-x-3 animate-fade-in ${
      isJarvis ? 'flex-row' : 'flex-row-reverse space-x-reverse'
    }`}>
      {/* Avatar */}
      <div className={`
        w-10 h-10 rounded-full flex items-center justify-center border-2 shrink-0
        ${isJarvis 
          ? 'bg-primary/20 border-primary text-primary glow-primary' 
          : 'bg-secondary border-border text-secondary-foreground'
        }
      `}>
        {isJarvis ? (
          <Bot className="w-5 h-5" />
        ) : (
          <User className="w-5 h-5" />
        )}
      </div>

      {/* Message Content */}
      <div className={`flex-1 max-w-[80%] ${isJarvis ? 'text-left' : 'text-right'}`}>
        <Card className={`p-4 ${
          isJarvis 
            ? 'card-gradient border-primary/20' 
            : 'bg-secondary border-border'
        }`}>
          <p className={`text-sm leading-relaxed ${
            isJarvis ? 'text-foreground' : 'text-secondary-foreground'
          }`}>
            {message.content}
          </p>
          
          <div className={`mt-2 text-xs opacity-70 ${
            isJarvis ? 'text-muted-foreground' : 'text-secondary-foreground/70'
          }`}>
            {message.timestamp.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        </Card>
      </div>
    </div>
  );
};