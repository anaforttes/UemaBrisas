"""
migration_dados.py

Script de migração para popular as tabelas do controleadmin no banco.
Execute UMA VEZ após aplicar as migrations:

    python manage.py shell < controleadmin/migration_dados.py

Ou coloque o conteúdo em um management command.
"""
from controleadmin.models import NivelAcesso, PermissaoSistema, NivelAcessoPermissao
from controleadmin.servicos import sincronizar_perfis_usuarios

# ── 1. Permissões do sistema ──────────────────────────────────────────────────
PERMISSOES = [
    # (codigo, nome, modulo)
    ('visualizar',         'Visualizar processos e documentos', 'geral'),
    ('comentar',           'Comentar em documentos',            'geral'),
    ('exportar',           'Exportar documentos e relatórios',  'geral'),
    ('editor',             'Editar processos e documentos',     'geral'),
    ('aprovar',            'Aprovar documentos',                'geral'),
    ('assinar',            'Assinar documentos digitalmente',   'geral'),
    ('gerenciar_usuarios', 'Gerenciar usuários do sistema',     'admin'),
]

for codigo, nome, modulo in PERMISSOES:
    PermissaoSistema.objects.get_or_create(
        codigo=codigo,
        defaults={'nome': nome, 'modulo': modulo, 'ativo': True}
    )
print(f'[OK] {len(PERMISSOES)} permissões criadas/verificadas.')

# ── 2. Níveis de acesso ───────────────────────────────────────────────────────
NIVEIS = [
    ('visualizador',  'Visualizador',  ['visualizar', 'comentar']),
    ('colaborador',   'Colaborador',   ['visualizar', 'comentar', 'exportar']),
    ('editor',        'Editor',        ['visualizar', 'comentar', 'exportar', 'editor']),
    ('aprovador',     'Aprovador',     ['visualizar', 'comentar', 'exportar', 'editor', 'aprovar', 'assinar']),
    ('gerente',       'Gerente',       ['visualizar', 'comentar', 'exportar', 'editor', 'aprovar', 'assinar', 'gerenciar_usuarios']),
    ('administrador', 'Administrador', ['visualizar', 'comentar', 'exportar', 'editor', 'aprovar', 'assinar', 'gerenciar_usuarios']),
]

for codigo, nome, codigos_perms in NIVEIS:
    nivel, _ = NivelAcesso.objects.get_or_create(
        codigo=codigo,
        defaults={'nome': nome, 'ativo': True}
    )
    for cod_perm in codigos_perms:
        try:
            perm = PermissaoSistema.objects.get(codigo=cod_perm)
            NivelAcessoPermissao.objects.get_or_create(
                nivel_acesso=nivel,
                permissao=perm,
            )
        except PermissaoSistema.DoesNotExist:
            print(f'  [AVISO] Permissao {cod_perm} nao encontrada.')

print(f'[OK] {len(NIVEIS)} niveis de acesso criados/verificados.')

# ── 3. Criar PerfilAcessoUsuario para todos os usuários existentes ─────────────
sincronizar_perfis_usuarios()
print('[OK] Perfis de acesso sincronizados para todos os usuarios.')
print()
print('PROXIMOS PASSOS:')
print('  1. Acesse /api/controleadmin/usuarios/?status=pendente')
print('  2. Aprove os usuarios e atribua um nivel de acesso via PATCH')
print('  3. Remova access_flags e permissions_data do banco via migration')
