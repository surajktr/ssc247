
import React from 'react';
import { Globe, BookOpen, HelpCircle, FileText } from 'lucide-react';
import { Category } from '../types';

interface CategoryCardProps {
  category: Category;
  isSelected?: boolean;
  onClick?: () => void;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category, isSelected, onClick }) => {
  
  // Helper to determine which icon to render
  const renderIcon = () => {
    const iconClass = "w-6 h-6 text-white";

    if (category.iconType === 'text') {
      return <span className="text-xl font-bold select-none text-white">{category.iconContent}</span>;
    }

    switch (category.iconContent) {
      case 'book':
      case 'vocab':
        return <BookOpen className={iconClass} strokeWidth={2.5} />;
      case 'globe':
      case 'news':
        return <Globe className={iconClass} strokeWidth={2.5} />;
      case 'editorial':
        return <FileText className={iconClass} strokeWidth={2.5} />;
      default:
        return <HelpCircle className={iconClass} strokeWidth={2.5} />;
    }
  };

  return (
    <button
      onClick={onClick}
      className={`
        relative w-full text-left group
        flex items-center p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 ease-out
        ${isSelected 
          ? 'border-emerald-500 bg-emerald-50/50 shadow-sm ring-1 ring-emerald-500' 
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
        }
      `}
    >
      <div 
        className={`
          flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center 
          shadow-sm transition-transform group-hover:scale-105
          ${category.gradientClass}
        `}
      >
        {renderIcon()}
      </div>
      
      <div className="ml-4 flex-1">
        <p className={`text-base font-bold transition-colors ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
          {category.label}
        </p>
      </div>
      
      {isSelected && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:block">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
        </div>
      )}
    </button>
  );
};

export default CategoryCard;
