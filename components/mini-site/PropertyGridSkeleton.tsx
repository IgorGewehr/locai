'use client';

import React from 'react';
import { HeroSectionSkeleton, PropertyGridSkeleton } from './SkeletonLoaders';

interface PropertyGridSkeletonProps {
  count?: number;
  variant?: 'default' | 'enhanced';
  showHero?: boolean;
}

export default function PropertyGridSkeletonWrapper({ 
  count = 9, 
  variant = 'enhanced',
  showHero = true 
}: PropertyGridSkeletonProps) {
  return (
    <>
      {showHero && <HeroSectionSkeleton />}
      <PropertyGridSkeleton count={count} variant={variant} />
    </>
  );
}