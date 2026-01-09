'use client';

import { useParams, useRouter } from 'next/navigation';
import { EquipmentDetailPage } from '@/components/pricebook/equipment-detail-page';

export default function EquipmentPage() {
  const params = useParams();
  const router = useRouter();
  const equipmentId = params.id as string;

  const handleClose = () => {
    router.push('/pricebook?section=equipment');
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    console.log('Navigate:', direction);
  };

  return (
    <EquipmentDetailPage
      equipmentId={equipmentId}
      onClose={handleClose}
      onNavigate={handleNavigate}
    />
  );
}
