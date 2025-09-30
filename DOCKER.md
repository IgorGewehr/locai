# 🐳 Docker Setup - LocAI

Este guia fornece instruções completas para configurar e executar o projeto LocAI com Docker, garantindo que funcione perfeitamente em qualquer ambiente.

## 📋 Pré-requisitos

- Docker Engine 20.10+
- Docker Compose 2.0+
- 4GB RAM disponível
- 10GB espaço em disco

### Verificar instalação:
```bash
docker --version
docker-compose --version
```

## 🚀 Setup Rápido

### 1. Clone e configure o ambiente:
```bash
git clone <your-repo>
cd locai

# Copie o arquivo de ambiente e configure
cp .env.docker .env.local
```

### 2. Configure as variáveis de ambiente em `.env.local`:
```bash
# Principais configurações que você DEVE alterar:
JWT_SECRET=your-super-secure-jwt-secret-key-change-this-in-production
N8N_BASIC_AUTH_PASSWORD=sua-senha-segura
REDIS_PASSWORD=sua-senha-redis
WHATSAPP_MICROSERVICE_API_KEY=sua-api-key-microservice

# Configure suas credenciais do Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=sua-firebase-api-key
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSUA_CHAVE_PRIVADA\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@seu-projeto.iam.gserviceaccount.com
```

### 3. Execute o projeto:

**Desenvolvimento:**
```bash
npm run docker:dev
```

**Produção:**
```bash
npm run docker:prod
```

## 📁 Estrutura de Arquivos Docker

```
locai/
├── Dockerfile                 # Produção (multi-stage)
├── Dockerfile.dev            # Desenvolvimento
├── Dockerfile.pm2            # Produção com PM2
├── docker-compose.yml        # Produção completa
├── docker-compose.dev.yml    # Desenvolvimento
├── .dockerignore             # Arquivos ignorados
├── .env.docker              # Template de variáveis
└── docker/                  # Configurações dos serviços
    ├── redis/
    │   └── redis.conf        # Configuração Redis
    ├── nginx/
    │   └── nginx.conf        # Proxy reverso
    └── n8n/
        └── workflows/        # Workflows N8N
```

## 🎯 Comandos Docker Disponíveis

### Scripts NPM:
```bash
# Build da imagem
npm run docker:build

# Build de desenvolvimento
npm run docker:build:dev

# Executar container único
npm run docker:run

# Ambiente de desenvolvimento
npm run docker:dev

# Ambiente de produção
npm run docker:prod

# Parar todos os serviços
npm run docker:stop

# Ver logs em tempo real
npm run docker:logs

# Limpar tudo (cuidado!)
npm run docker:clean

# Rebuild completo
npm run docker:rebuild
```

### Comandos Docker diretos:
```bash
# Build manual
docker build -t locai-app .

# Run manual com env file
docker run -p 8080:8080 --env-file .env.local locai-app

# Ver logs de um serviço específico
docker-compose logs -f locai-app

# Restart um serviço
docker-compose restart locai-app

# Exec dentro do container
docker-compose exec locai-app sh
```

## 🏗️ Arquitetura dos Serviços

### Produção (`docker-compose.yml`):
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Nginx     │────│  LocAI App  │────│    Redis    │
│   :80       │    │   :8080     │    │   :6379     │
└─────────────┘    └─────────────┘    └─────────────┘
                           │
                   ┌─────────────┐    ┌─────────────┐
                   │     N8N     │    │  WhatsApp   │
                   │   :5678     │    │  Service    │
                   └─────────────┘    │   :3001     │
                                      └─────────────┘
```

### Desenvolvimento (`docker-compose.dev.yml`):
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ LocAI Dev   │────│ Redis Dev   │    │   N8N Dev   │
│   :8080     │    │   :6380     │    │   :5679     │
└─────────────┘    └─────────────┘    └─────────────┘
                           │
                   ┌─────────────┐
                   │ Redis UI    │
                   │   :8082     │
                   └─────────────┘
```

## 🔧 Configuração Detalhada

### Variáveis de Ambiente Essenciais:

#### Aplicação:
```env
NODE_ENV=production
PORT=8080
JWT_SECRET=chave-super-segura-256-bits
DEFAULT_TENANT_ID=default-tenant
```

#### URLs e Domínios:
```env
NEXT_PUBLIC_APP_URL=http://localhost:8080
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

#### Redis:
```env
REDIS_URL=redis://redis:6379
REDIS_HOST=redis
REDIS_PORT=6379
```

#### N8N:
```env
N8N_WEBHOOK_URL=http://n8n:5678/webhook/whatsapp-messages
N8N_WEBHOOK_SECRET=sua-chave-secreta
N8N_API_KEY=sua-api-key
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=senha-segura
```

#### WhatsApp:
```env
WHATSAPP_MICROSERVICE_URL=http://whatsapp-service:3001
WHATSAPP_MICROSERVICE_API_KEY=sua-api-key
WHATSAPP_WEBHOOK_SECRET=sua-webhook-secret
```

## 🌍 Ambientes de Execução

### Desenvolvimento Local:
```bash
# Inicia todos os serviços em modo development
npm run docker:dev

# Acesse:
# App: http://localhost:8080
# N8N: http://localhost:5679
# Redis UI: http://localhost:8082
```

### Produção:
```bash
# Inicia todos os serviços em modo produção
npm run docker:prod

# Acesse:
# App: http://localhost:80 (via Nginx)
# App direto: http://localhost:8080
# N8N: http://localhost:5678
```

### Produção com PM2:
```bash
# Use o profile PM2
docker-compose --profile pm2 up -d

# Acesse PM2 logs
docker-compose exec pm2 pm2 logs
```

## 🔍 Monitoramento e Logs

### Ver logs em tempo real:
```bash
# Todos os serviços
npm run docker:logs

# Serviço específico
docker-compose logs -f locai-app
docker-compose logs -f redis
docker-compose logs -f n8n
```

### Health checks:
```bash
# Verificar status dos containers
docker-compose ps

# Health check manual
curl http://localhost:8080/api/health
```

### Monitoramento Redis:
```bash
# Desenvolvimento (Redis Commander)
http://localhost:8082

# Produção (Redis CLI)
docker-compose exec redis redis-cli
```

## 🛠️ Troubleshooting

### Problemas Comuns:

#### 1. Container não inicia:
```bash
# Verificar logs
docker-compose logs locai-app

# Verificar variáveis de ambiente
docker-compose config
```

#### 2. Erro de permissão:
```bash
# Recriar volumes
docker-compose down -v
docker-compose up --build
```

#### 3. Porta já em uso:
```bash
# Verificar portas ocupadas
sudo netstat -tulpn | grep :8080

# Parar processos
docker-compose down
```

#### 4. Build falha:
```bash
# Limpar cache e rebuild
npm run docker:clean
npm run docker:rebuild
```

#### 5. Problemas de rede:
```bash
# Recriar rede
docker network prune
docker-compose up --force-recreate
```

### Reset Completo:
```bash
# ⚠️ CUIDADO: Remove tudo
npm run docker:clean
docker system prune -a --volumes
```

## 🔐 Segurança

### Configurações Importantes:

1. **Senhas**: Altere todas as senhas padrão
2. **JWT Secret**: Use uma chave de 256 bits
3. **Redis**: Configure senha no redis.conf
4. **Nginx**: Configurado com rate limiting
5. **Containers**: Rodando como usuário não-root

### Exemplo de senhas seguras:
```bash
# Gerar JWT Secret
openssl rand -base64 32

# Gerar senha Redis
openssl rand -base64 16
```

## 📦 Volumes e Persistência

### Volumes Docker:
- `redis_data`: Dados do Redis
- `n8n_data`: Workflows e configurações N8N
- `whatsapp_sessions`: Sessões WhatsApp

### Bind Mounts:
- `./logs`: Logs da aplicação
- `./uploads`: Arquivos enviados
- `./.sessions`: Sessões locais

### Backup:
```bash
# Backup Redis
docker-compose exec redis redis-cli BGSAVE

# Backup N8N
docker cp locai-n8n:/home/node/.n8n ./backup-n8n
```

## 🚀 Deploy em Produção

### Preparação:
1. Configure domínio no nginx.conf
2. Configure SSL (certbot)
3. Configure variáveis de ambiente de produção
4. Configure backup automático

### Deploy:
```bash
# Pull da imagem atualizada
git pull origin main

# Rebuild e restart
npm run docker:rebuild

# Verificar saúde
curl https://seu-dominio.com/api/health
```

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs: `npm run docker:logs`
2. Verifique a configuração: `docker-compose config`
3. Consulte este documento
4. Abra uma issue no repositório

**Happy Dockerizing! 🐳**