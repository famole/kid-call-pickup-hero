import React from 'react';

const UpsyDefaultScreen: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center max-w-md">
        {/* Upsy Logo */}
        <div className="flex justify-center">
          <img 
            src="/assets/upsy_logo.png" 
            alt="Upsy Logo" 
            className="w-56 h-56"
          />
        </div>
        
        {/* Motivational Message */}
        <div className="px-6 py-3 rounded-lg" style={{ backgroundColor: '#33B7FF' }}>
          <p className="text-xl font-medium text-white">
            Don't worry, we're getting stronger ;)
          </p>
        </div>
        
        {/* Loading indicator */}
        <div className="flex justify-center space-x-2 mt-8">
          <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: '#33B7FF' }}></div>
          <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: '#33B7FF', animationDelay: '0.1s' }}></div>
          <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: '#33B7FF', animationDelay: '0.2s' }}></div>
        </div>
        <div className="flex justify-center mt-8 h-32">
      </div>
      </div>
    </div>
  );
};

export default UpsyDefaultScreen;
