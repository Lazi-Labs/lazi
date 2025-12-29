'use client';

import { useParams, useRouter } from 'next/navigation';
import { MaterialDetailPage } from '@/components/pricebook/material-detail-page';

export default function MaterialPage() {
  const params = useParams();
  const router = useRouter();
  const materialId = params.id as string;

  const handleClose = () => {
    router.push('/pricebook?section=materials');
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    console.log('Navigate:', direction);
  };

  return (
    <MaterialDetailPage
      materialId={materialId}
      onClose={handleClose}
      onNavigate={handleNavigate}
    />
  );
}
