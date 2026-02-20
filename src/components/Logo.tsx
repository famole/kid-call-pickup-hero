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
        src="/assets/clifton-college-logo.jpg"
        alt="Clifton College"
        className="w-full h-full object-contain"
      />
    </div>
  );
};

export default Logo;
