import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      <img
        src="/assets/8268b74f-a6aa-4f00-ac2b-ce117a9c3706.png"
        alt="College Crest"
        className="w-full h-full object-contain"
      />
    </div>
  );
};

export default Logo;
