'use client';

import LoadingScreen from '@/components/atoms/LoadingScreen/LoadingScreen';

export const dynamic = 'force-dynamic';

export default function Loading() {
  return <LoadingScreen variant="default" />;
}