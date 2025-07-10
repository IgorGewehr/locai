import { NextRequest, NextResponse } from 'next/server';
import { propertyService, propertyQueries } from '@/lib/firebase/firestore';
import type { Property } from '@/lib/types/property';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search');
    const location = searchParams.get('location');
    const bedrooms = searchParams.get('bedrooms');
    const maxGuests = searchParams.get('maxGuests');
    const isActive = searchParams.get('isActive');
    const amenities = searchParams.get('amenities')?.split(',').filter(Boolean);

    let properties: Property[];

    if (search || location || bedrooms || maxGuests || amenities) {
      // Use search/filter functionality
      const filters = {
        location: location || undefined,
        bedrooms: bedrooms ? parseInt(bedrooms) : undefined,
        maxGuests: maxGuests ? parseInt(maxGuests) : undefined,
        amenities: amenities || undefined,
      };

      properties = await propertyQueries.searchProperties(filters);
    } else if (isActive === 'true') {
      properties = await propertyQueries.getActiveProperties();
    } else {
      properties = await propertyService.getAll();
    }

    // Apply text search if provided
    if (search) {
      const searchLower = search.toLowerCase();
      properties = properties.filter(property =>
        property.title.toLowerCase().includes(searchLower) ||
        property.description.toLowerCase().includes(searchLower) ||
        property.address.toLowerCase().includes(searchLower)
      );
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedProperties = properties.slice(startIndex, endIndex);

    return NextResponse.json({
      success: true,
      data: {
        properties: paginatedProperties,
        pagination: {
          page,
          limit,
          total: properties.length,
          totalPages: Math.ceil(properties.length / limit),
          hasNext: endIndex < properties.length,
          hasPrev: page > 1,
        },
      },
    });

  } catch (error) {
    console.error('Get properties error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const propertyData = await request.json();

    // Validate required fields
    const requiredFields = [
      'title', 'description', 'address', 'category',
      'bedrooms', 'bathrooms', 'maxGuests', 'minimumNights'
    ];

    for (const field of requiredFields) {
      if (!propertyData[field]) {
        return NextResponse.json(
          { success: false, error: `Campo obrigatório: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate pricing
    if (!propertyData.basePrice) {
      return NextResponse.json(
        { success: false, error: 'Preço base é obrigatório' },
        { status: 400 }
      );
    }

    // Set default values and add required fields
    const property: Omit<Property, 'id'> = {
      title: propertyData.title,
      description: propertyData.description,
      address: propertyData.address,
      category: propertyData.category,
      bedrooms: parseInt(propertyData.bedrooms),
      bathrooms: parseInt(propertyData.bathrooms),
      maxGuests: parseInt(propertyData.maxGuests),
      basePrice: parseFloat(propertyData.basePrice),
      pricePerExtraGuest: parseFloat(propertyData.pricePerExtraGuest) || 0,
      minimumNights: parseInt(propertyData.minimumNights) || 1,
      cleaningFee: parseFloat(propertyData.cleaningFee) || 0,
      amenities: propertyData.amenities || [],
      isFeatured: propertyData.isFeatured || false,
      allowsPets: propertyData.allowsPets || false,
      paymentMethodSurcharges: propertyData.paymentMethodSurcharges || {},
      photos: propertyData.photos || [],
      videos: propertyData.videos || [],
      unavailableDates: propertyData.unavailableDates || [],
      customPricing: propertyData.customPricing || {},
      isActive: propertyData.isActive !== false,
      createdAt: new Date(),
      updatedAt: new Date(),
      tenantId: 'default', // TODO: Get from auth context
    };

    const propertyId = await propertyService.create(property);

    return NextResponse.json({
      success: true,
      data: { id: propertyId },
      message: 'Propriedade criada com sucesso',
    });

  } catch (error) {
    console.error('Create property error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, ...propertyData } = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID da propriedade é obrigatório' },
        { status: 400 }
      );
    }

    // Check if property exists
    const existingProperty = await propertyService.getById(id);
    if (!existingProperty) {
      return NextResponse.json(
        { success: false, error: 'Propriedade não encontrada' },
        { status: 404 }
      );
    }

    // Update property
    await propertyService.update(id, {
      ...propertyData,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Propriedade atualizada com sucesso',
    });

  } catch (error) {
    console.error('Update property error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID da propriedade é obrigatório' },
        { status: 400 }
      );
    }

    // Check if property exists
    const existingProperty = await propertyService.getById(id);
    if (!existingProperty) {
      return NextResponse.json(
        { success: false, error: 'Propriedade não encontrada' },
        { status: 404 }
      );
    }

    // Soft delete by marking as inactive
    await propertyService.update(id, {
      isActive: false,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Propriedade removida com sucesso',
    });

  } catch (error) {
    console.error('Delete property error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}