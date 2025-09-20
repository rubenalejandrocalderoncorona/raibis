import React, { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Volume2, Loader2, MessageSquare, Send, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { ChatMessage } from './ChatMessage';
import { RaibisAvatar } from './RaibisAvatar';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'raibis';
  timestamp: Date;
}

interface VoiceAgentProps {
  webhookUrl?: string;
  onMessage?: (message: Message) => void;
}

export const VoiceAgent: React.FC<VoiceAgentProps> = ({ 
  webhookUrl = 'https://your-webhook-endpoint.com/api/voice',
  onMessage 
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hello, I'm Raibis. How can I assist you today?",
      sender: 'raibis',
      timestamp: new Date()
    }
  ]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice');
  const [responseMode, setResponseMode] = useState<'audio' | 'text'>('audio');
  const [textInput, setTextInput] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Initialize speech recognition
  const initializeSpeechRecognition = useCallback(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognitionClass();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        setIsListening(true);
      };

      recognitionRef.current.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        
        // Add user message
        const userMessage: Message = {
          id: Date.now().toString(),
          content: transcript,
          sender: 'user',
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, userMessage]);
        onMessage?.(userMessage);
        
        // Send to webhook and get response
        await sendToWebhook(transcript, 'voice');
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        toast({
          title: "Speech Recognition Error",
          description: "There was an issue with speech recognition. Please try again.",
          variant: "destructive"
        });
        setIsListening(false);
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        setIsRecording(false);
      };
    }
  }, [onMessage]);

  // Send message to webhook (works for both voice and text)
  const sendToWebhook = async (message: string, source: 'voice' | 'text' = 'voice') => {
    setIsProcessing(true);
    
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          source: source,
          timestamp: new Date().toISOString(),
          user_id: 'user_' + Date.now()
        })
      });

      if (!response.ok) {
        throw new Error('Webhook request failed');
      }

      const data = await response.json();
      
      // Add Raibis response
      const raibisMessage: Message = {
        id: Date.now().toString(),
        content: data.response || "I'm processing your request. Please wait a moment.",
        sender: 'raibis',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, raibisMessage]);
      onMessage?.(raibisMessage);

      // Optional: Use text-to-speech for Raibis response (only when audio response mode is enabled)
      if (responseMode === 'audio' && 'speechSynthesis' in window && data.response) {
        const utterance = new SpeechSynthesisUtterance(data.response);
        utterance.voice = speechSynthesis.getVoices().find(voice => 
          voice.name.includes('Google') || voice.name.includes('Microsoft')
        ) || speechSynthesis.getVoices()[0];
        utterance.rate = 0.9;
        utterance.pitch = 0.8;
        speechSynthesis.speak(utterance);
      }

    } catch (error) {
      console.error('Webhook error:', error);
      
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: "I'm experiencing some technical difficulties. Please check your connection and try again.",
        sender: 'raibis',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Connection Error",
        description: "Unable to process your request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Start voice recording
  const startRecording = useCallback(async () => {
    try {
      if (!recognitionRef.current) {
        initializeSpeechRecognition();
      }

      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      setIsRecording(true);
      recognitionRef.current?.start();
      
      toast({
        title: "Listening...",
        description: "Speak now. I'm listening to your request.",
      });

    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Microphone Error",
        description: "Unable to access microphone. Please check permissions.",
        variant: "destructive"
      });
    }
  }, [initializeSpeechRecognition]);

  // Stop voice recording
  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    setIsListening(false);
  }, []);

  // Toggle recording
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // Send text message
  const sendTextMessage = useCallback(async () => {
    if (!textInput.trim() || isProcessing) return;

    const message = textInput.trim();
    setTextInput('');

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: message,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    onMessage?.(userMessage);
    
    // Send to webhook and get response
    await sendToWebhook(message, 'text');
  }, [textInput, isProcessing, onMessage]);

  // Handle Enter key in text input
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendTextMessage();
    }
  }, [sendTextMessage]);

  // Toggle input mode
  const toggleInputMode = useCallback(() => {
    setInputMode(prev => prev === 'voice' ? 'text' : 'voice');
    // Stop recording if switching away from voice mode
    if (inputMode === 'voice' && isRecording) {
      stopRecording();
    }
  }, [inputMode, isRecording, stopRecording]);

  // Toggle response mode
  const toggleResponseMode = useCallback(() => {
    setResponseMode(prev => prev === 'audio' ? 'text' : 'audio');
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background grid effect */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10" />
      <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent" />
      
      <div className="w-full max-w-2xl space-y-6 relative z-10">
        
        {/* Raibis Avatar and Title */}
        <div className="text-center space-y-4">
          <RaibisAvatar isProcessing={isProcessing} isListening={isListening} />
          <div>
            <h1 className="text-4xl font-bold text-glow mb-2 animate-fade-in">RAIBIS</h1>
            <p className="text-muted-foreground animate-slide-up">
              Your AI {inputMode === 'voice' ? 'Voice' : 'Text'} Assistant
            </p>
          </div>
        </div>

        {/* Control Toggles */}
        <div className="flex justify-center space-x-4">
          {/* Input Mode Toggle */}
          <Card className="card-gradient p-3">
            <Button
              onClick={toggleInputMode}
              variant="ghost"
              className="flex items-center space-x-2 text-sm hover:bg-primary/10 transition-all duration-300"
            >
              {inputMode === 'voice' ? (
                <>
                  <Mic className="w-4 h-4" />
                  <span>Voice Mode</span>
                  <ToggleRight className="w-5 h-5 text-primary" />
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4" />
                  <span>Text Mode</span>
                  <ToggleLeft className="w-5 h-5 text-primary" />
                </>
              )}
            </Button>
          </Card>

          {/* Response Mode Toggle */}
          <Card className="card-gradient p-3">
            <Button
              onClick={toggleResponseMode}
              variant="ghost"
              className="flex items-center space-x-2 text-sm hover:bg-primary/10 transition-all duration-300"
            >
              {responseMode === 'audio' ? (
                <>
                  <Volume2 className="w-4 h-4" />
                  <span>Audio Response</span>
                  <ToggleRight className="w-5 h-5 text-primary" />
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4" />
                  <span>Text Response</span>
                  <ToggleLeft className="w-5 h-5 text-primary" />
                </>
              )}
            </Button>
          </Card>
        </div>

        {/* Chat Messages */}
        <Card className="card-gradient p-6 min-h-[400px] max-h-[500px] overflow-y-auto border-2 border-primary/20 shadow-2xl backdrop-blur-xl">
          <div className="space-y-4">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            
            {isProcessing && (
              <div className="flex items-center justify-center py-4 animate-fade-in">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <div className="absolute inset-0 w-6 h-6 border-2 border-primary/30 rounded-full animate-ping" />
                  </div>
                  <span className="text-muted-foreground">Processing your request...</span>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Voice/Text Controls */}
        <div className="flex flex-col items-center space-y-4">
          {inputMode === 'voice' ? (
            // Voice Controls
            <>
              <Button
                onClick={toggleRecording}
                disabled={isProcessing}
                className={`
                  w-20 h-20 rounded-full transition-all duration-300 border-2 relative overflow-hidden
                  ${isRecording 
                    ? 'bg-destructive hover:bg-destructive/90 border-destructive animate-pulse-glow shadow-lg shadow-destructive/50' 
                    : 'bg-primary hover:bg-primary/90 border-primary glow-primary hover:glow-secondary shadow-lg shadow-primary/30'
                  }
                `}
              >
                {/* Button background effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                
                {isRecording ? (
                  <MicOff className="w-8 h-8 relative z-10" />
                ) : (
                  <Mic className="w-8 h-8 relative z-10" />
                )}
              </Button>
              
              <div className="text-center space-y-1">
                <p className="text-sm text-muted-foreground">
                  {isRecording ? 'Recording... Click to stop' : 'Click to start speaking'}
                </p>
                {isListening && (
                  <p className="text-xs text-primary animate-pulse">
                    Listening for your voice...
                  </p>
                )}
              </div>
            </>
          ) : (
            // Text Controls
            <div className="w-full max-w-lg space-y-3">
              <div className="relative">
                <Input
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Type your message to Jarvis..."
                  disabled={isProcessing}
                  className="pr-12 py-3 text-base bg-card/50 border-primary/30 focus:border-primary/60 focus:ring-primary/20 backdrop-blur-sm"
                />
                <Button
                  onClick={sendTextMessage}
                  disabled={!textInput.trim() || isProcessing}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 bg-primary hover:bg-primary/90 disabled:bg-muted"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Type your message and press Enter or click send
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Status Indicators */}
        <Card className="card-gradient p-4">
          <div className="flex justify-center space-x-6 text-sm">
            <div className={`flex items-center space-x-2 transition-colors duration-300 ${
              inputMode === 'voice' && isRecording ? 'text-destructive' : 'text-muted-foreground'
            }`}>
              <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                inputMode === 'voice' && isRecording ? 'bg-destructive animate-pulse shadow-sm shadow-destructive' : 'bg-muted-foreground'
              }`} />
              <span>{inputMode === 'voice' ? 'Recording' : 'Text Mode'}</span>
            </div>
            
            <div className={`flex items-center space-x-2 transition-colors duration-300 ${
              isProcessing ? 'text-primary' : 'text-muted-foreground'
            }`}>
              <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                isProcessing ? 'bg-primary animate-pulse shadow-sm shadow-primary' : 'bg-muted-foreground'
              }`} />
              <span>Processing</span>
            </div>
            
            <div className="flex items-center space-x-2 text-muted-foreground">
              {inputMode === 'voice' ? (
                <>
                  <Volume2 className="w-3 h-3" />
                  <span>Audio Ready</span>
                </>
              ) : (
                <>
                  <MessageSquare className="w-3 h-3" />
                  <span>Text Ready</span>
                </>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};