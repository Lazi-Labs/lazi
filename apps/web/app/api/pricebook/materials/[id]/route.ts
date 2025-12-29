import { NextRequest, NextResponse } from 'next/server';

// Mock material data for development
const mockMaterial = {
  id: 'mat-1',
  stId: 'ST-MAT-001',
  code: 'C40-0014',
  name: 'Pipe Conduit Sch40 .75',
  displayName: 'Pipe Conduit Sch40 .75',
  description: 'Sch 40 Conduit Pipe 3/4"',
  cost: 0.26,
  price: 0.87,
  memberPrice: 0.75,
  margin: 70,
  taxPercent: 0,
  skuPercent: 0,
  active: true,
  taxable: true,
  chargeableByDefault: true,
  trackStock: false,
  defaultImageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop',
  category: 'pipe-fittings-34',
  categoryPath: 'Perfect Catch > Pipe & Fittings > 3/4"',
  contact: '',
  phone: '',
  email: '',
  primaryVendor: {
    id: 'vendor-1',
    vendorName: 'City Electric',
    vendorId: 1,
    cost: 0.26,
    vendorPart: 'PVCD75',
    upcCode: '',
    preferred: true,
    active: true,
  },
  vendors: [
    {
      id: 'vendor-1',
      vendorName: 'City Electric',
      vendorId: 1,
      cost: 0.26,
      vendorPart: 'PVCD75',
      upcCode: '',
      preferred: true,
      active: true,
    },
  ],
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  
  // Return mock data with the requested ID
  return NextResponse.json({
    ...mockMaterial,
    id,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const body = await request.json();
  
  // Mock update - return merged data
  return NextResponse.json({
    ...mockMaterial,
    ...body,
    id,
    updatedAt: new Date().toISOString(),
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  
  // Mock delete
  return NextResponse.json({ success: true, id });
}
