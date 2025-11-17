#!/usr/bin/env node

/**
 * Script de Debug para Search Properties
 * Executa: node scripts/debug-search.js
 */

const tenantId = 'U11UvXr67vWnDtDpDaaJDTuEcxo2';

async function debugSearch() {
  console.log('🔍 Iniciando debug de search properties...\n');

  // Teste 1: Busca ampla (sem filtros)
  console.log('1️⃣ TESTE 1: Busca ampla (sem filtros de preço/tipo)');
  const test1 = await fetch('http://localhost:3000/api/ai/functions/search-properties', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tenantId,
      location: 'Piratuba', // Sem "Balneário"
    })
  });
  const result1 = await test1.json();
  console.log('Resultado:', result1.data?.totalFound || 0, 'propriedades encontradas');
  if (result1.data?.properties?.length > 0) {
    console.log('Propriedades:', result1.data.properties.map(p => ({
      name: p.name,
      location: p.location,
      price: p.basePrice,
      category: p.category
    })));
  }
  console.log('');

  // Teste 2: Busca com "Balneário Piratuba"
  console.log('2️⃣ TESTE 2: Busca com "Balneário Piratuba"');
  const test2 = await fetch('http://localhost:3000/api/ai/functions/search-properties', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tenantId,
      location: 'Balneário Piratuba',
    })
  });
  const result2 = await test2.json();
  console.log('Resultado:', result2.data?.totalFound || 0, 'propriedades encontradas');
  console.log('');

  // Teste 3: Busca com todos os filtros
  console.log('3️⃣ TESTE 3: Busca com TODOS os filtros');
  const test3 = await fetch('http://localhost:3000/api/ai/functions/search-properties', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tenantId,
      location: 'Balneário Piratuba',
      guests: 2,
      bedrooms: 1,
      maxPrice: 300,
      propertyType: 'apartamento'
    })
  });
  const result3 = await test3.json();
  console.log('Resultado:', result3.data?.totalFound || 0, 'propriedades encontradas');
  console.log('');

  // Teste 4: Buscar TODAS as propriedades ativas
  console.log('4️⃣ TESTE 4: Buscar TODAS as propriedades ativas do tenant');
  const test4 = await fetch('http://localhost:3000/api/ai/functions/search-properties', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tenantId,
      // Sem filtros
    })
  });
  const result4 = await test4.json();
  console.log('Total de propriedades ativas:', result4.data?.totalFound || 0);
  if (result4.data?.properties?.length > 0) {
    console.log('\nPrimeiras 5 propriedades:');
    result4.data.properties.slice(0, 5).forEach((p, i) => {
      console.log(`${i + 1}. ${p.name}`);
      console.log(`   Location: ${p.location}`);
      console.log(`   Price: R$ ${p.basePrice}/noite`);
      console.log(`   Category: ${p.category || 'N/A'}`);
      console.log(`   Bedrooms: ${p.bedrooms}`);
      console.log(`   Max Guests: ${p.maxGuests}`);
      console.log('');
    });
  }

  console.log('✅ Debug concluído!');
}

debugSearch().catch(console.error);
