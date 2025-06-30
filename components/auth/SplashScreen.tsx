import { Loader2 } from 'lucide-react';
import React from 'react';

export default function SplashScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      {/* You can use a more sophisticated loading spinner or logo here */}
      <Loader2 className="h-8 w-8 animate-spin  text-primary" />  
    </div>
  );
}
