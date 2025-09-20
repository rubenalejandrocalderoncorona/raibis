import React from 'react';
import { Bot, Waves, Loader2 } from 'lucide-react';

interface RaibisAvatarProps {
  isProcessing?: boolean;
  isListening?: boolean;
}

export const RaibisAvatar: React.FC<RaibisAvatarProps> = ({ 
  isProcessing = false, 
  isListening = false 
}) => {
  return (
    <div className="relative flex items-center justify-center">
      {/* Outer glow ring */}
      <div className={`
        absolute w-32 h-32 rounded-full border-2 transition-all duration-500
        ${isListening 
          ? 'border-primary animate-pulse-glow scale-110' 
          : isProcessing 
            ? 'border-primary/50 animate-spin-slow' 
            : 'border-primary/30'
        }
      `} />
      
      {/* Middle ring */}
      <div className={`
        absolute w-24 h-24 rounded-full border transition-all duration-300
        ${isListening 
          ? 'border-primary/70 animate-pulse' 
          : 'border-primary/20'
        }
      `} />
      
      {/* Inner avatar */}
      <div className={`
        relative w-16 h-16 rounded-full flex items-center justify-center
        transition-all duration-300 bg-primary/10 border-2 border-primary/50
        ${isListening ? 'glow-secondary scale-110' : 'glow-primary'}
      `}>
        {isProcessing ? (
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        ) : isListening ? (
          <Waves className="w-8 h-8 text-primary animate-pulse" />
        ) : (
          <Bot className="w-8 h-8 text-primary" />
        )}
      </div>
      
      {/* Audio waves animation when listening */}
      {isListening && (
        <>
          <div className="absolute w-40 h-40 rounded-full border border-primary/20 animate-ping" />
          <div className="absolute w-48 h-48 rounded-full border border-primary/10 animate-ping" style={{ animationDelay: '0.5s' }} />
        </>
      )}
    </div>
  );
};