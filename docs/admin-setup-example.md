# Como Definir um Usuário como Administrador

## Método 1: Via Firebase Console (Recomendado)

1. Acesse o Firebase Console do projeto
2. Vá em Firestore Database
3. Navegue até a coleção `users`
4. Encontre o documento do usuário que deve ser admin
5. Edite o campo `role` para `"admin"`

## Método 2: Via Script (Para desenvolvimento)

```javascript
// Exemplo de script para definir um usuário como admin
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './lib/firebase/config';

async function makeUserAdmin(userId) {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      role: 'admin'
    });
    
    console.log('Usuário definido como admin com sucesso!');
  } catch (error) {
    console.error('Erro ao definir usuário como admin:', error);
  }
}

// Usar com o UID do usuário
makeUserAdmin('USER_UID_HERE');
```

## Verificação no Sistema

Depois de definir um usuário como admin, o sistema automaticamente:

1. ✅ **AuthProvider**: Define `user.isAdmin = true` 
2. ✅ **Context**: Disponibiliza `isAdmin` na verificação
3. ✅ **Tickets**: Admin pode responder como administrador
4. ✅ **Interface**: Diferencia visualmente respostas de admin

## Como Verificar se Funcionou

```typescript
import { useAuth } from '@/contexts/AuthProvider';

function MyComponent() {
  const { user, isAdmin } = useAuth();
  
  // Ambas as verificações funcionam:
  console.log('É admin (context):', isAdmin);
  console.log('É admin (user prop):', user?.isAdmin);
  console.log('Role:', user?.role);
  
  return (
    <div>
      {isAdmin && <p>Você é administrador!</p>}
    </div>
  );
}
```

## Estrutura de Dados no Firestore

```json
{
  "users": {
    "userId123": {
      "email": "admin@empresa.com",
      "name": "Admin User",
      "role": "admin",  // ← Esta propriedade define o admin
      "isActive": true,
      "createdAt": "2023-01-01T00:00:00Z",
      // ... outros campos
    }
  }
}
```

## Tipos de Role Disponíveis

- `"user"` - Usuário comum (padrão)
- `"agent"` - Agente/Funcionário
- `"admin"` - Administrador completo

## Sistema de Tickets com Admin

Quando um admin responde um ticket:
- ✅ Aparece como "Administrador" na interface
- ✅ Tem background azul diferenciado
- ✅ É marcado como `isAdmin: true` no banco
- ✅ Usuário recebe notificação de resposta admin