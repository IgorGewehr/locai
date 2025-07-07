import { NextRequest, NextResponse } from 'next/server';
import { propertyService } from '@/lib/firebase/firestore';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const property = await propertyService.getById(params.id);

    if (!property) {
      return NextResponse.json(
        { success: false, error: 'Propriedade não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: property,
    });

  } catch (error) {
    console.error('Get property error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const propertyData = await request.json();

    // Check if property exists
    const existingProperty = await propertyService.getById(params.id);
    if (!existingProperty) {
      return NextResponse.json(
        { success: false, error: 'Propriedade não encontrada' },
        { status: 404 }
      );
    }

    // Update property
    await propertyService.update(params.id, {
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if property exists
    const existingProperty = await propertyService.getById(params.id);
    if (!existingProperty) {
      return NextResponse.json(
        { success: false, error: 'Propriedade não encontrada' },
        { status: 404 }
      );
    }

    // Soft delete by marking as inactive
    await propertyService.update(params.id, {
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