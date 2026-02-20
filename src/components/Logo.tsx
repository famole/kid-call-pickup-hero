import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-10 w-10',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };

  return (
    <div className={`relative ${sizeClasses[size]} rounded-full overflow-hidden border-2 border-muted ${className}`}>
      <img
        src="/assets/clifton-college-logo.jpg"
        alt="Clifton College"
        className="w-full h-full object-cover"
      />
    </div>
  );
};

export default Logo;
