import React from 'react';
import { Link } from 'react-router-dom';  

interface ProviderCardProps {
  title: string;
  description: string;
  linkTo?: string;
  onSelectClick?: () => void;
  disabled?: boolean;
  icon?: string;
  button?: React.ReactNode;
  className?: string;
  cardVariant?: 'primary' | 'secondary';
}

const PrimaryButton = ({ 
  children, 
  onClick, 
  disabled 
}: { 
  children: React.ReactNode, 
  onClick?: () => void, 
  disabled?: boolean 
}) => {
  return (
    <button 
      className={`
        px-6 py-2.5 rounded-lg font-medium transition-all duration-300
        ${disabled 
          ? 'bg-gray-200 text-gray-500 border border-dashed border-gray-300 cursor-not-allowed' 
          : 'bg-gradient-purple text-white shadow-md hover:shadow-lg hover:scale-105 active:scale-100'
        }
      `} 
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

function ProviderCard({ 
  title, 
  description, 
  linkTo, 
  onSelectClick, 
  disabled, 
  icon, 
  button, 
  className, 
  cardVariant = 'primary' 
}: ProviderCardProps) {
  // Render either a link or a button based on props
  const renderSelectButton = () => {
    if (disabled) {
      return (
        <PrimaryButton disabled>
          Coming soon
        </PrimaryButton>
      );
    }
    
    if (onSelectClick) {
      if (button) {
        return button;
      } else {
        return (
          <PrimaryButton onClick={onSelectClick}>
            Verify
          </PrimaryButton>
        );
      }
    }
    
    if (linkTo) {
      return (
        <Link to={linkTo}>
          <PrimaryButton>
            Select
          </PrimaryButton>
        </Link>
      );
    }
    
    return null;
  };


  return (
    <div 
      className={`
        p-8 rounded-xl transition-all duration-300
        bg-white
        ${disabled ? 'opacity-80' : 'hover:shadow-card-hover transform hover:-translate-y-1'}
        shadow-card backdrop-blur-sm
        border border-gray-200
        ${className || ''}
      `}
    >
      {icon && (
        <div className="flex justify-center mb-6">
          <img src={icon} alt={`${title} icon`} className="max-w-[150px] h-auto" />
        </div>
      )}
      <h3 className="text-2xl font-bold mb-3 text-center">{title}</h3>
      <p className="text-gray-600 mb-6 text-center min-h-[4rem] text-base">{description}</p>
      <div className="text-center mt-8">
        {renderSelectButton()}
      </div>
    </div>
  );
}

export default ProviderCard; 
