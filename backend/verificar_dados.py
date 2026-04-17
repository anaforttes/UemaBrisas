#!/usr/bin/env python
import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'configuracao.settings')
django.setup()

from equipe.models import Membro

def verificar_dados():
    print('=== VERIFICAÇÃO DO BANCO DE DADOS ===')
    print(f'Total de membros: {Membro.objects.count()}')

    if Membro.objects.count() > 0:
        print('\n=== MEMBROS CADASTRADOS ===')
        for membro in Membro.objects.all():
            print(f'ID: {membro.id}')
            print(f'Nome: {membro.name}')
            print(f'Email: {membro.email}')
            print(f'Cargo: {membro.role}')
            print(f'Status: {membro.status}')
            print(f'Quota: {membro.quota_used}/{membro.quota_limit}')
            print(f'Último acesso: {membro.last_login}')
            print(f'Flags: {membro.flags}')
            print(f'Permissões: {membro.permissions}')
            print('---')
    else:
        print('\nNenhum membro cadastrado ainda.')

if __name__ == '__main__':
    verificar_dados()