'use client';

import { useParams, useRouter } from 'next/navigation';
import { ServiceDetailPage } from '@/components/pricebook/service-detail-page';

export default function ServicePage() {
  const params = useParams();
  const router = useRouter();
  const serviceId = params.id as string;

  const handleClose = () => {
    router.push('/pricebook?section=services');
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    // Navigation between services would require fetching the list
    // For now, just close and let user select from list
    console.log('Navigate:', direction);
  };

  return (
    <ServiceDetailPage
      serviceId={serviceId}
      onClose={handleClose}
      onNavigate={handleNavigate}
    />
  );
}
