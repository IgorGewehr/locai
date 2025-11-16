#!/bin/bash

# Script para fazer deploy da correção do post-conversation

echo "🚀 Iniciando deploy da correção..."
echo ""

# 1. Verificar se há mudanças
echo "📋 Verificando mudanças..."
git status

echo ""
read -p "Deseja fazer commit das mudanças? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  # 2. Fazer commit
  echo "📝 Fazendo commit..."
  git add app/api/ai/functions/post-conversation/route.ts
  git commit -m "fix: corrigir orderBy em post-conversation (array → string)"

  # 3. Push
  echo "⬆️  Fazendo push..."
  git push origin main

  echo ""
  echo "✅ Deploy concluído!"
  echo ""
  echo "🔍 Para verificar os logs em produção:"
  echo "   pm2 logs locai --lines 100 | grep POST-CONVERSATION"
  echo ""
  echo "🧪 Para testar:"
  echo "   Envie uma mensagem via WhatsApp e veja se post-conversation funciona"
else
  echo "❌ Deploy cancelado"
fi
