// lib/utils/fix-property-images.ts
import { logger } from './logger';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';

interface PropertyPhoto {
  id: string;
  url: string;
  filename: string;
  order: number;
  isMain: boolean;
  caption?: string;
}

interface LegacyProperty {
  id: string;
  photos?: PropertyPhoto[] | string[] | any;
  images?: string[]; // Old field name
  image?: string; // Single image field
  [key: string]: any;
}

export async function fixPropertyImages(tenantId: string): Promise<{
  totalProperties: number;
  fixedProperties: number;
  errors: number;
}> {
  const factory = new TenantServiceFactory(tenantId);
  const propertiesService = factory.createService<LegacyProperty>('properties');
  
  let totalProperties = 0;
  let fixedProperties = 0;
  let errors = 0;

  try {
    logger.info('🔧 Starting property images fix', { tenantId });
    
    // Get all properties
    const properties = await propertiesService.getAll();
    totalProperties = properties.length;
    
    logger.info(`Found ${totalProperties} properties to check`, { tenantId });
    
    for (const property of properties) {
      try {
        let needsUpdate = false;
        let updatedPhotos: PropertyPhoto[] = [];
        
        // Check current photos structure
        if (!property.photos || !Array.isArray(property.photos)) {
          needsUpdate = true;
          
          // Try to migrate from legacy fields
          if (property.images && Array.isArray(property.images)) {
            // Migrate from 'images' array
            updatedPhotos = property.images.map((url: string, index: number) => ({
              id: `migrated-${Date.now()}-${index}`,
              url: url && url.startsWith('http') ? url : '',
              filename: `image-${index + 1}.jpg`,
              order: index,
              isMain: index === 0,
              caption: ''
            }));
            logger.info(`Migrated from 'images' array for property ${property.id}`);
          } else if (property.image && typeof property.image === 'string') {
            // Migrate from single 'image' field
            updatedPhotos = [{
              id: `migrated-${Date.now()}`,
              url: property.image.startsWith('http') ? property.image : '',
              filename: 'main-image.jpg',
              order: 0,
              isMain: true,
              caption: ''
            }];
            logger.info(`Migrated from 'image' field for property ${property.id}`);
          } else {
            // No images found, set empty array
            updatedPhotos = [];
            logger.info(`No images found for property ${property.id}, setting empty array`);
          }
        } else {
          // Check if existing photos have proper structure
          const photos = property.photos as any[];
          
          for (let i = 0; i < photos.length; i++) {
            const photo = photos[i];
            
            // If photo is just a string (URL), convert to proper structure
            if (typeof photo === 'string') {
              needsUpdate = true;
              updatedPhotos.push({
                id: `fixed-${Date.now()}-${i}`,
                url: photo.startsWith('http') ? photo : '',
                filename: `photo-${i + 1}.jpg`,
                order: i,
                isMain: i === 0,
                caption: ''
              });
            } else if (photo && typeof photo === 'object') {
              // Check if photo object has required fields
              const fixedPhoto: PropertyPhoto = {
                id: photo.id || `fixed-${Date.now()}-${i}`,
                url: photo.url && photo.url.startsWith('http') ? photo.url : '',
                filename: photo.filename || `photo-${i + 1}.jpg`,
                order: photo.order ?? i,
                isMain: photo.isMain ?? (i === 0),
                caption: photo.caption || ''
              };
              
              // Check if we need to update this photo
              if (JSON.stringify(photo) !== JSON.stringify(fixedPhoto)) {
                needsUpdate = true;
              }
              
              updatedPhotos.push(fixedPhoto);
            }
          }
        }
        
        if (needsUpdate) {
          // Update the property with fixed photos structure
          await propertiesService.update(property.id, {
            photos: updatedPhotos,
            // Clean up legacy fields
            images: null,
            image: null
          });
          
          fixedProperties++;
          logger.info(`Fixed property ${property.id} - ${updatedPhotos.length} photos`, { 
            tenantId,
            propertyId: property.id,
            photoCount: updatedPhotos.length
          });
        }
        
      } catch (error) {
        errors++;
        logger.error(`Error fixing property ${property.id}`, {
          tenantId,
          propertyId: property.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    logger.info('✅ Property images fix completed', {
      tenantId,
      totalProperties,
      fixedProperties,
      errors
    });
    
    return { totalProperties, fixedProperties, errors };
    
  } catch (error) {
    logger.error('❌ Property images fix failed', {
      tenantId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    throw error;
  }
}

// Function to fix missing capacity fields
export async function fixPropertyCapacity(tenantId: string): Promise<{
  totalProperties: number;
  fixedProperties: number;
  errors: number;
}> {
  const factory = new TenantServiceFactory(tenantId);
  const propertiesService = factory.createService<any>('properties');
  
  let totalProperties = 0;
  let fixedProperties = 0;
  let errors = 0;

  try {
    logger.info('🔧 Starting property capacity fix', { tenantId });
    
    // Get all properties
    const properties = await propertiesService.getAll();
    totalProperties = properties.length;
    
    logger.info(`Found ${totalProperties} properties to check capacity`, { tenantId });
    
    for (const property of properties) {
      try {
        let needsUpdate = false;
        const updates: any = {};
        
        // Ensure capacity field exists
        if (typeof property.capacity !== 'number' || property.capacity <= 0) {
          // Use maxGuests as fallback, or default to 2
          updates.capacity = property.maxGuests || 2;
          needsUpdate = true;
          logger.info(`Setting capacity=${updates.capacity} for property ${property.id}`);
        }
        
        // Ensure maxGuests exists if capacity exists
        if (typeof property.maxGuests !== 'number' || property.maxGuests <= 0) {
          updates.maxGuests = property.capacity || updates.capacity || 2;
          needsUpdate = true;
          logger.info(`Setting maxGuests=${updates.maxGuests} for property ${property.id}`);
        }
        
        // Ensure pricePerExtraGuest field exists (default to 0)
        if (typeof property.pricePerExtraGuest !== 'number') {
          updates.pricePerExtraGuest = 0; // Default to no extra cost
          needsUpdate = true;
          logger.info(`Setting pricePerExtraGuest=${updates.pricePerExtraGuest} for property ${property.id}`);
        }
        
        if (needsUpdate) {
          await propertiesService.update(property.id, updates);
          fixedProperties++;
          logger.info(`Fixed capacity for property ${property.id}`, { 
            tenantId,
            propertyId: property.id,
            updates
          });
        }
        
      } catch (error) {
        errors++;
        logger.error(`Error fixing capacity for property ${property.id}`, {
          tenantId,
          propertyId: property.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    logger.info('✅ Property capacity fix completed', {
      tenantId,
      totalProperties,
      fixedProperties,
      errors
    });
    
    return { totalProperties, fixedProperties, errors };
    
  } catch (error) {
    logger.error('❌ Property capacity fix failed', {
      tenantId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    throw error;
  }
}

// Function to validate property images
export async function validatePropertyImages(tenantId: string): Promise<{
  totalProperties: number;
  propertiesWithValidImages: number;
  propertiesWithInvalidImages: number;
  propertiesWithoutImages: number;
}> {
  const factory = new TenantServiceFactory(tenantId);
  const propertiesService = factory.createService<any>('properties');
  
  try {
    const properties = await propertiesService.getAll();
    
    let propertiesWithValidImages = 0;
    let propertiesWithInvalidImages = 0;
    let propertiesWithoutImages = 0;
    
    for (const property of properties) {
      if (!property.photos || !Array.isArray(property.photos) || property.photos.length === 0) {
        propertiesWithoutImages++;
      } else {
        let hasValidImage = false;
        let hasInvalidImage = false;
        
        for (const photo of property.photos) {
          if (photo && photo.url && photo.url.startsWith('http')) {
            hasValidImage = true;
          } else {
            hasInvalidImage = true;
          }
        }
        
        if (hasValidImage && !hasInvalidImage) {
          propertiesWithValidImages++;
        } else {
          propertiesWithInvalidImages++;
        }
      }
    }
    
    logger.info('📊 Property images validation completed', {
      tenantId,
      totalProperties: properties.length,
      propertiesWithValidImages,
      propertiesWithInvalidImages,
      propertiesWithoutImages
    });
    
    return {
      totalProperties: properties.length,
      propertiesWithValidImages,
      propertiesWithInvalidImages,
      propertiesWithoutImages
    };
    
  } catch (error) {
    logger.error('❌ Property images validation failed', {
      tenantId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    throw error;
  }
}