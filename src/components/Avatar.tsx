"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface AvatarProps {
  imageUrl?: string;
  name?: string;
  size?: 'small' | 'medium' | 'large';
  status?: 'online' | 'offline' | 'away';
  showBadge?: boolean;
  isClickable?: boolean;
  href?: string;
  onClick?: () => void;
}

export default function Avatar({
  imageUrl,
  name,
  size = 'medium',
  status,
  showBadge = false,
  isClickable = false,
  href,
  onClick,
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  
  // Determine size class
  const sizeClass = {
    small: 'h-8 w-8',
    medium: 'h-12 w-12',
    large: 'h-24 w-24',
  }[size];
  
  // Font size for fallback initials
  const fontSizeClass = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-xl',
  }[size];
  
  // Get initials from name
  const getInitials = () => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  // Status badge colors
  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    away: 'bg-yellow-500',
  };
  
  const avatarContent = (
    <div className={`relative ${isClickable ? 'cursor-pointer' : ''}`}>
      <div className={`relative ${sizeClass} overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700`}>
        {imageUrl && !imageError ? (
          <Image
            src={imageUrl}
            alt={name || 'User avatar'}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className={`flex h-full w-full items-center justify-center ${fontSizeClass} font-medium text-gray-600 dark:text-gray-300`}>
            {getInitials()}
          </div>
        )}
      </div>
      
      {showBadge && status && (
        <span 
          className={`absolute bottom-0 right-0 h-3 w-3 rounded-full ring-2 ring-white dark:ring-gray-800 ${statusColors[status]}`}
          aria-hidden="true"
        />
      )}
    </div>
  );
  
  // If onClick handler is provided, use it instead of Link
  if (onClick && isClickable) {
    return (
      <div className="flex flex-col items-center" onClick={onClick}>
        {avatarContent}
      </div>
    );
  }
  
  return isClickable && href ? (
    <Link href={href} className="flex flex-col items-center">
      {avatarContent}
    </Link>
  ) : (
    <div className="flex flex-col items-center">
      {avatarContent}
    </div>
  );
} 