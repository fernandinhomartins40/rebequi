# 🚀 Quick Start - Docker

Guia rápido para iniciar a aplicação Rebequi com Docker.

## ⚡ Start Rápido (3 comandos)

```bash
# 1. Build e start
make up

# 2. Aguardar ~30 segundos para todos os serviços iniciarem

# 3. Acessar
open http://localhost
```

Pronto! A aplicação está rodando! 🎉

## 🔍 O que foi iniciado?

- **Frontend**: http://localhost (React + Vite)
- **Backend**: http://localhost/api (Express + Prisma)
- **PostgreSQL**: localhost:5432 (Banco de dados)
- **Nginx**: Roteamento inteligente entre serviços

## 🛠️ Comandos Úteis

```bash
make help          # Ver todos os comandos disponíveis
make logs          # Ver logs de todos os serviços
make ps            # Ver status dos containers
make down          # Parar todos os serviços
make clean         # Limpar tudo (cuidado!)
```

## 📊 Verificar Status

```bash
# Health check
curl http://localhost/api/health

# Ver produtos
curl http://localhost/api/products

# Ver categorias
curl http://localhost/api/categories
```

## 🐛 Problemas?

### Porta 80 em uso
```bash
# Verificar o que está usando a porta
sudo lsof -i :80

# Parar o serviço ou mudar a porta no docker-compose.yml
```

### Container não inicia
```bash
# Ver logs de erro
make logs

# Rebuild completo
make clean
make rebuild
```

### Banco vazio
```bash
# Popular o banco manualmente
make seed
```

## 📚 Documentação Completa

- [DOCKER_SETUP.md](./DOCKER_SETUP.md) - Guia completo de Docker
- [Backend README](./apps/backend/README.md) - Documentação da API
- [Frontend README](./apps/frontend/README.md) - Documentação do Frontend
- [STRUCTURE.md](./STRUCTURE.md) - Estrutura do projeto

## 🎯 Próximos Passos

1. Explorar a aplicação em http://localhost
2. Testar os endpoints da API
3. Ver os dados no Prisma Studio: `make studio`
4. Desenvolver novas features!

---

**Dica**: Use `make help` para ver todos os comandos disponíveis!
