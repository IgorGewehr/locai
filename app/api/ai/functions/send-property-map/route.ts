import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import { getFirebaseAdmin } from '@/lib/firebase/admin';
import { MessageSender } from '@/lib/whatsapp/message-sender';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SendPropertyMapRequest {
  tenantId: string;
  propertyName: string;
}

export async function POST(req: NextRequest) {
  try {
    logger.info('🗺️ [Send Property Map] Starting map generation');
    
    const body: SendPropertyMapRequest = await req.json();
    const { tenantId, propertyName } = body;

    if (!tenantId || !propertyName) {
      logger.warn('🗺️ [Send Property Map] Missing required fields');
      return NextResponse.json(
        { error: 'tenantId and propertyName are required' },
        { status: 400 }
      );
    }

    if (!process.env.MAPS_KEY) {
      logger.error('🗺️ [Send Property Map] MAPS_KEY not configured');
      return NextResponse.json(
        { error: 'Maps service not configured' },
        { status: 500 }
      );
    }

    logger.info(`🗺️ [Send Property Map] Fetching property: ${propertyName} for tenant: ${tenantId}`);

    // Get property from Firestore
    const admin = await getFirebaseAdmin();
    const db = admin.firestore();
    
    const propertiesRef = db.collection(`tenants/${tenantId}/properties`);
    const snapshot = await propertiesRef
      .where('name', '==', propertyName)
      .limit(1)
      .get();

    if (snapshot.empty) {
      logger.warn(`🗺️ [Send Property Map] Property not found: ${propertyName}`);
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    const property = snapshot.docs[0].data();
    const location = property.location;

    if (!location) {
      logger.warn(`🗺️ [Send Property Map] Property has no location: ${propertyName}`);
      return NextResponse.json(
        { error: 'Property has no location information' },
        { status: 400 }
      );
    }

    // Step 1: Geocoding - Convert address to coordinates
    logger.info(`🗺️ [Send Property Map] Geocoding address: ${location}`);
    
    const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${process.env.MAPS_KEY}`;
    
    const geocodingResponse = await fetch(geocodingUrl);
    const geocodingData = await geocodingResponse.json();

    if (!geocodingData.results || geocodingData.results.length === 0) {
      logger.error('🗺️ [Send Property Map] Geocoding failed - no results');
      return NextResponse.json(
        { error: 'Could not geocode the address' },
        { status: 400 }
      );
    }

    const { lat, lng } = geocodingData.results[0].geometry.location;
    logger.info(`🗺️ [Send Property Map] Coordinates found: ${lat}, ${lng}`);

    // Step 2: Generate Static Map
    const mapParams = new URLSearchParams({
      center: `${lat},${lng}`,
      zoom: '15',
      size: '600x400',
      maptype: 'roadmap',
      markers: `color:red|label:${propertyName.charAt(0).toUpperCase()}|${lat},${lng}`,
      key: process.env.MAPS_KEY!
    });

    const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?${mapParams.toString()}`;
    
    logger.info('🗺️ [Send Property Map] Fetching static map image');
    
    // Fetch the map image
    const mapResponse = await fetch(staticMapUrl);
    if (!mapResponse.ok) {
      logger.error('🗺️ [Send Property Map] Failed to fetch map image');
      return NextResponse.json(
        { error: 'Failed to generate map image' },
        { status: 500 }
      );
    }

    // Convert to base64 for sending via WhatsApp
    const mapBuffer = await mapResponse.arrayBuffer();
    const base64Image = Buffer.from(mapBuffer).toString('base64');

    // Step 3: Send via WhatsApp (similar to send-property-media)
    logger.info('🗺️ [Send Property Map] Sending map via WhatsApp');

    // Get the latest conversation for this tenant
    const conversationsRef = db.collection(`tenants/${tenantId}/conversations`);
    const conversationSnapshot = await conversationsRef
      .orderBy('lastMessageAt', 'desc')
      .limit(1)
      .get();

    if (conversationSnapshot.empty) {
      logger.warn('🗺️ [Send Property Map] No active conversation found');
      return NextResponse.json(
        { error: 'No active conversation found' },
        { status: 404 }
      );
    }

    const conversation = conversationSnapshot.docs[0].data();
    const clientPhone = conversation.clientPhone;

    if (!clientPhone) {
      logger.error('🗺️ [Send Property Map] No client phone in conversation');
      return NextResponse.json(
        { error: 'No client phone number found' },
        { status: 400 }
      );
    }

    // Send the map image with caption
    const caption = `📍 *Localização de ${propertyName}*\n\n` +
                   `📌 Endereço: ${location}\n` +
                   `🗺️ Coordenadas: ${lat.toFixed(6)}, ${lng.toFixed(6)}\n\n` +
                   `_Clique na imagem para ampliar o mapa_`;

    const messageSender = new MessageSender(tenantId);
    
    // Create a data URI for the image
    const dataUri = `data:image/png;base64,${base64Image}`;
    
    const result = await messageSender.sendMessage(
      clientPhone,
      caption,
      'map',
      {
        imageUrl: dataUri,
        caption: caption
      }
    );

    if (!result.success) {
      logger.error('🗺️ [Send Property Map] Failed to send WhatsApp message', result.error);
      return NextResponse.json(
        { error: 'Failed to send map via WhatsApp' },
        { status: 500 }
      );
    }

    logger.info('🗺️ [Send Property Map] Map sent successfully');

    return NextResponse.json({
      success: true,
      message: 'Map sent successfully',
      coordinates: { lat, lng },
      location: location,
      propertyName: propertyName
    });

  } catch (error) {
    logger.error('🗺️ [Send Property Map] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send property map',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}