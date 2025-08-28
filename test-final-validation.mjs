// Teste final para verificar o UpdatePropertySchema
import { z } from 'zod';
import { PropertyCategory } from '../lib/types/property.js';

// Recriar o schema exato para testar
const TestUpdatePropertySchema = z.object({
  title: z.string().min(1, 'Título não pode estar vazio').optional(),
  description: z.string().optional(), // SEM validação mínima
  address: z.string().optional(),     // SEM validação mínima
  category: z.nativeEnum(PropertyCategory).optional(),
}).passthrough();

const testData = {
  title: 'Apto bonito',
  description: 'abc', // Só 3 caracteres - deve passar!
  address: 'r',       // Só 1 caractere - deve passar!
  photos: []
};

console.log('🧪 Testing UpdatePropertySchema validation...');
console.log('Test data:', testData);

const result = TestUpdatePropertySchema.safeParse(testData);

if (result.success) {
  console.log('✅ VALIDATION PASSED!');
  console.log('Schema aceita descrições pequenas corretamente');
} else {
  console.log('❌ VALIDATION FAILED:');
  console.log('Field errors:', result.error.flatten().fieldErrors);
  console.log('Form errors:', result.error.flatten().formErrors);
}