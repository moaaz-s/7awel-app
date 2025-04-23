import React from 'react';

export default function SplashScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      {/* You can use a more sophisticated loading spinner or logo here */}
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
    </div>
  );
}
