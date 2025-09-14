import React from 'react';
import { VoiceAgent } from '@/components/VoiceAgent';

const Index = () => {
  // You can customize the webhook URL here
  const webhookUrl = 'https://your-webhook-endpoint.com/api/voice';
  
  const handleMessage = (message: any) => {
    // Optional: Handle messages for analytics, logging, etc.
    console.log('New message:', message);
  };

  return (
    <main className="min-h-screen">
      <VoiceAgent 
        webhookUrl={webhookUrl}
        onMessage={handleMessage}
      />
    </main>
  );
};

export default Index;