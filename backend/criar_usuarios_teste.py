#!/usr/bin/env python
import os
import django
import random
from datetime import datetime, timedelta

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'configuracao.settings')
django.setup()

from equipe.models import Membro

def criar_usuarios_aleatorios():
    # Dados para gerar usuários aleatórios
    nomes = [
        "Ana Silva", "Carlos Santos", "Maria Oliveira", "João Pereira",
        "Beatriz Costa", "Lucas Rodrigues", "Fernanda Lima", "Pedro Alves",
        "Juliana Ferreira", "Rafael Gomes", "Camila Martins", "Bruno Carvalho",
        "Amanda Ribeiro", "Thiago Sousa", "Patrícia Mendes"
    ]

    dominios = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "empresa.com"]

    roles = ["Admin", "Gestor", "Jurídico", "Técnico", "Auditor", "Atendente"]
    statuses = ["Online", "Offline"]

    print('=== CRIANDO USUÁRIOS ALEATÓRIOS ===')

    for i in range(3):
        # Escolher nome aleatório
        nome = random.choice(nomes)
        nomes.remove(nome)  # Remover para não repetir

        # Gerar email baseado no nome
        primeiro_nome = nome.split()[0].lower()
        dominio = random.choice(dominios)
        email = f"{primeiro_nome}@{dominio}"

        # Escolher role e status aleatórios
        role = random.choice(roles)
        status = random.choice(statuses)

        # Gerar quota aleatória
        quota_used = random.randint(0, 500)
        quota_limit = random.randint(500, 2000)

        # Último acesso aleatório (últimos 30 dias)
        dias_atras = random.randint(0, 30)
        last_login = datetime.now() - timedelta(days=dias_atras) if random.choice([True, False]) else None

        # Flags aleatórias
        flags = {
            "superusuario": random.choice([True, False]),
            "adminMunicipio": random.choice([True, False]),
            "profissionalInterno": random.choice([True, False]),
            "usuarioExterno": random.choice([True, False])
        }

        # Permissões aleatórias
        permissions = {
            "read": True,
            "write": random.choice([True, False]),
            "delete": random.choice([True, False]),
            "admin": random.choice([True, False])
        }

        # Criar membro
        membro = Membro.objects.create(
            name=nome,
            email=email,
            role=role,
            status=status,
            quota_used=quota_used,
            quota_limit=quota_limit,
            last_login=last_login,
            flags=flags,
            permissions=permissions
        )

        print(f'✅ Criado: {membro.name} ({membro.email}) - {membro.role} - {membro.status}')

    print(f'\n🎉 Total de usuários criados: 3')
    print(f'📊 Total no banco: {Membro.objects.count()}')

if __name__ == '__main__':
    criar_usuarios_aleatorios()