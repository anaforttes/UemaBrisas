from django.db import migrations


NIVEIS = [
    ('superadmin', 'Superadmin', 'Acesso total ao sistema e às configurações administrativas.'),
    ('admin_municipio', 'Administrador do Município', 'Gerencia usuários, permissões e operações do município.'),
    ('gestor', 'Gestor', 'Acompanha fluxo, relatórios e aprovações de processos.'),
    ('operador', 'Operador', 'Executa atividades operacionais nos processos e documentos.'),
    ('auditor', 'Auditor', 'Consulta dados e acompanha trilhas de auditoria sem alterar fluxos.'),
    ('externo', 'Usuário Externo', 'Acesso restrito às funcionalidades externas autorizadas.'),
]


PERMISSOES = [
    ('usuarios.visualizar', 'Visualizar usuários', 'Consulta da base de usuários cadastrados.', 'usuarios'),
    ('usuarios.aprovar', 'Aprovar usuários', 'Aprovação de acesso de novos usuários.', 'usuarios'),
    ('usuarios.bloquear', 'Bloquear usuários', 'Bloqueio ou inativação de usuários.', 'usuarios'),
    ('usuarios.gerenciar_niveis', 'Gerenciar níveis de acesso', 'Alteração de níveis e permissões dos usuários.', 'usuarios'),
    ('processos.visualizar', 'Visualizar processos', 'Consulta de processos e movimentações.', 'processos'),
    ('processos.criar', 'Criar processos', 'Criação de novos processos de regularização.', 'processos'),
    ('processos.editar', 'Editar processos', 'Atualização de dados dos processos.', 'processos'),
    ('processos.aprovar', 'Aprovar processos', 'Aprovações e validações de etapas.', 'processos'),
    ('documentos.visualizar', 'Visualizar documentos', 'Leitura de documentos do processo.', 'documentos'),
    ('documentos.editar', 'Editar documentos', 'Edição de documentos no editor rico.', 'documentos'),
    ('documentos.comentar', 'Comentar documentos', 'Inclusão de comentários e sugestões.', 'documentos'),
    ('documentos.assinar', 'Assinar documentos', 'Assinatura de documentos e finalização de fluxo.', 'documentos'),
    ('documentos.exportar', 'Exportar documentos', 'Exportação em PDF e DOCX.', 'documentos'),
    ('equipe.visualizar', 'Visualizar equipe', 'Acesso à área da equipe.', 'equipe'),
    ('equipe.gerenciar', 'Gerenciar equipe', 'Gerenciamento de colaboradores e acessos.', 'equipe'),
    ('relatorios.visualizar', 'Visualizar relatórios', 'Acesso a relatórios e indicadores.', 'relatorios'),
    ('configuracoes.gerenciar', 'Gerenciar configurações', 'Acesso às configurações gerais do sistema.', 'configuracoes'),
]


MATRIZ = {
    'superadmin': [codigo for codigo, _, _, _ in PERMISSOES],
    'admin_municipio': [
        'usuarios.visualizar',
        'usuarios.aprovar',
        'usuarios.bloquear',
        'usuarios.gerenciar_niveis',
        'processos.visualizar',
        'processos.criar',
        'processos.editar',
        'processos.aprovar',
        'documentos.visualizar',
        'documentos.editar',
        'documentos.comentar',
        'documentos.assinar',
        'documentos.exportar',
        'equipe.visualizar',
        'equipe.gerenciar',
        'relatorios.visualizar',
        'configuracoes.gerenciar',
    ],
    'gestor': [
        'processos.visualizar',
        'processos.aprovar',
        'documentos.visualizar',
        'documentos.comentar',
        'documentos.assinar',
        'documentos.exportar',
        'equipe.visualizar',
        'relatorios.visualizar',
    ],
    'operador': [
        'processos.visualizar',
        'processos.criar',
        'processos.editar',
        'documentos.visualizar',
        'documentos.editar',
        'documentos.comentar',
        'documentos.exportar',
        'equipe.visualizar',
    ],
    'auditor': [
        'usuarios.visualizar',
        'processos.visualizar',
        'documentos.visualizar',
        'documentos.exportar',
        'equipe.visualizar',
        'relatorios.visualizar',
    ],
    'externo': [
        'processos.visualizar',
        'documentos.visualizar',
    ],
}


def seed_data(apps, schema_editor):
    NivelAcesso = apps.get_model('controleadmin', 'NivelAcesso')
    PermissaoSistema = apps.get_model('controleadmin', 'PermissaoSistema')
    NivelAcessoPermissao = apps.get_model('controleadmin', 'NivelAcessoPermissao')

    niveis_map = {}
    for codigo, nome, descricao in NIVEIS:
        nivel, _ = NivelAcesso.objects.get_or_create(
            codigo=codigo,
            defaults={'nome': nome, 'descricao': descricao, 'ativo': True},
        )
        niveis_map[codigo] = nivel

    permissoes_map = {}
    for codigo, nome, descricao, modulo in PERMISSOES:
        permissao, _ = PermissaoSistema.objects.get_or_create(
            codigo=codigo,
            defaults={
                'nome': nome,
                'descricao': descricao,
                'modulo': modulo,
                'ativo': True,
            },
        )
        permissoes_map[codigo] = permissao

    for codigo_nivel, codigos_permissoes in MATRIZ.items():
        nivel = niveis_map[codigo_nivel]
        for codigo_permissao in codigos_permissoes:
            permissao = permissoes_map[codigo_permissao]
            NivelAcessoPermissao.objects.get_or_create(
                nivel_acesso=nivel,
                permissao=permissao,
            )


def unseed_data(apps, schema_editor):
    NivelAcessoPermissao = apps.get_model('controleadmin', 'NivelAcessoPermissao')
    PermissaoSistema = apps.get_model('controleadmin', 'PermissaoSistema')
    NivelAcesso = apps.get_model('controleadmin', 'NivelAcesso')

    NivelAcessoPermissao.objects.all().delete()
    PermissaoSistema.objects.filter(codigo__in=[codigo for codigo, _, _, _ in PERMISSOES]).delete()
    NivelAcesso.objects.filter(codigo__in=[codigo for codigo, _, _ in NIVEIS]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('controleadmin', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_data, unseed_data),
    ]
