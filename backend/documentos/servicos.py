from datetime import timedelta
from django.core.exceptions import ValidationError
from django.utils import timezone

from autenticacao.models import CustomUser
from .models import (
    Documento, ColaboradorDocumento, VersaoDocumento,
    AssinaturaDocumento, ConviteDocumento, AuditoriaDocumento,
    PresencaDocumento,
)
from controleadmin.servicos import usuario_possui_permissao_codigo

def _pode_editar(request, doc):
    user = request.user
    # Superusuário edita tudo
    if user.is_superuser or user.is_staff:
        return True
    # Criador tem controle total
    if doc.criado_por == user:
        return True
    # Colaborador com papel editor
    collab = doc.colaboradores.filter(usuario=user).first()
    if collab and collab.papel == 'editor':
        return True
    # Permissão global de editor no controleadmin
    return usuario_possui_permissao_codigo(user, 'editor')


def _pode_ver(request, doc):
    user = request.user
    # Superusuário vê tudo
    if user.is_superuser or user.is_staff:
        return True
    # Criador vê sempre
    if doc.criado_por == user:
        return True
    # Qualquer colaborador pode ver
    if doc.colaboradores.filter(usuario=user).exists():
        return True
    # Signatário designado pode ver (necessário para assinar)
    if doc.assinaturas.filter(usuario=user).exists():
        return True
    # Permissão global de visualizar no controleadmin
    return usuario_possui_permissao_codigo(user, 'visualizar')

def registrar_auditoria(doc: Documento, usuario: CustomUser, tipo: str, descricao: str = '', versao: int = None):
    """Registra ação de auditoria no documento."""
    AuditoriaDocumento.objects.create(
        documento=doc,
        tipo=tipo,
        usuario=usuario,
        descricao=descricao,
        versao=versao,
    )


def atualizar_presenca(doc: Documento, usuario: CustomUser, cursor_pos: int = None):
    """Atualiza timestamp de presença e posição do cursor do usuário no documento."""
    defaults = {}
    if cursor_pos is not None:
        defaults['cursor_pos'] = cursor_pos
    PresencaDocumento.objects.update_or_create(
        documento=doc,
        usuario=usuario,
        defaults=defaults,
    )


def criar_documento(user, data: dict) -> Documento:
    doc = Documento.objects.create(
        doc_ref=data.get('doc_ref', ''),
        titulo=data.get('titulo', 'Sem título'),
        conteudo=data.get('conteudo', ''),
        cabecalho=data.get('cabecalho', ''),
        rodape=data.get('rodape', ''),
        processo_id=data.get('processo_id', ''),
        criado_por=user,
        status=data.get('status', 'Draft'),
    )
    VersaoDocumento.objects.create(
        documento=doc, numero=1,
        conteudo=doc.conteudo, titulo=doc.titulo,
        autor=user, descricao='Versão inicial',
    )
    registrar_auditoria(doc, user, 'criacao', f'Documento criado: {doc.titulo}', 1)
    atualizar_presenca(doc, user)
    return doc


def salvar_versao(doc: Documento, user, conteudo: str, titulo: str,
                  descricao: str = '', status_novo: str = None) -> tuple:
    doc.conteudo = conteudo
    doc.titulo   = titulo
    if status_novo:
        doc.status = status_novo
    doc.versao_atual += 1
    doc.save()

    versao = VersaoDocumento.objects.create(
        documento=doc, numero=doc.versao_atual,
        conteudo=conteudo, titulo=titulo,
        autor=user,
        descricao=descricao or f'Versão {doc.versao_atual}',
    )

    tipo_auditoria = 'status_alterado' if status_novo else 'edicao'
    desc = descricao or f'Documento editado - Versão {doc.versao_atual}'
    registrar_auditoria(doc, user, tipo_auditoria, desc, doc.versao_atual)
    atualizar_presenca(doc, user)

    return versao, doc


def adicionar_colaborador(doc: Documento, usuario: CustomUser,
                          papel: str = 'editor') -> tuple:
    colab, criado = ColaboradorDocumento.objects.get_or_create(
        documento=doc, usuario=usuario,
        defaults={'papel': papel},
    )
    if not criado:
        colab.papel = papel
        colab.save()
    else:
        registrar_auditoria(doc, None, 'colaborador_adicionado',
                          f'{usuario.name} adicionado como {papel}')
    return colab, criado


def iniciar_assinaturas(doc: Documento, user, signatarios: list) -> list:
    doc.assinaturas.all().delete()

    criados = []
    for item in signatarios:
        try:
            usuario = CustomUser.objects.get(pk=item['usuario_id'])
        except CustomUser.DoesNotExist:
            continue
        ass = AssinaturaDocumento.objects.create(
            documento=doc, usuario=usuario,
            ordem=item.get('ordem', 1),
            status='pendente',
        )
        criados.append(ass)

    doc.status = 'Review'
    doc.save()
    registrar_auditoria(doc, user, 'status_alterado', 'Documento enviado para revisão')
    return criados


def registrar_assinatura(doc: Documento, user, dados: dict) -> AssinaturaDocumento:
    protocolo = (dados.get('protocolo') or '').strip()
    hash_assinatura = (dados.get('hash_assinatura') or '').strip()
    if not protocolo:
        raise ValidationError('Protocolo da assinatura e obrigatorio.')
    if not hash_assinatura:
        raise ValidationError('Hash da assinatura e obrigatorio.')

    assinaturas = doc.assinaturas.select_related('usuario').order_by('ordem', 'id')
    ass = assinaturas.filter(usuario=user).first()

    if assinaturas.exists() and not ass:
        raise ValidationError('Usuario nao esta na lista de signatarios do documento.')

    if not ass:
        ass = AssinaturaDocumento.objects.create(
            documento=doc,
            usuario=user,
            ordem=assinaturas.count() + 1,
            status='pendente',
        )

    anterior_pendente = assinaturas.filter(ordem__lt=ass.ordem).exclude(status='assinado').first()
    if anterior_pendente:
        raise ValidationError('Assinatura fora da ordem definida.')

    if ass.status == 'assinado':
        raise ValidationError('Documento ja assinado por este usuario.')

    ass.status = 'assinado'
    ass.protocolo = protocolo
    ass.hash_assinatura = hash_assinatura
    ass.nome_certificado = dados.get('nome_certificado', '') or user.name
    ass.cpf_certificado = dados.get('cpf_certificado', '')
    ass.ac_emissora = dados.get('ac_emissora', '') or 'Sistema REURB'
    ass.assinado_em = timezone.now()
    ass.save()

    registrar_auditoria(doc, user, 'assinatura',
                       f'Assinado por {user.name} - Protocolo: {ass.protocolo}')

    total = doc.assinaturas.count()
    signed = doc.assinaturas.filter(status='assinado').count()
    if total > 0 and signed == total:
        doc.status = 'Signed'
        doc.save()
        registrar_auditoria(doc, user, 'status_alterado', 'Documento completamente assinado')
        _notificar_documento_assinado(doc, user)
    else:
        _notificar_proximo_assinante(doc, solicitante=user)

    return ass


def _link_documento(doc: Documento) -> str:
    return f'/edit/{doc.doc_ref or doc.id}'


def _notificar_proximo_assinante(doc: Documento, solicitante) -> None:
    """Avisa o proximo signatario pendente (menor ordem) que e a vez dele assinar."""
    from notificacoes.servicos import criar_notificacao

    proximo = (
        doc.assinaturas.select_related('usuario')
        .filter(status='pendente', usuario__isnull=False)
        .order_by('ordem', 'id')
        .first()
    )
    if not proximo or not proximo.usuario:
        return

    link = _link_documento(doc)
    ja_notificado = proximo.usuario.notificacoes.filter(
        tipo='assinatura', link=link, lida=False
    ).exists()
    if ja_notificado:
        return

    quem = getattr(solicitante, 'name', None) or 'Um responsavel'
    criar_notificacao(
        usuario=proximo.usuario,
        tipo='assinatura',
        titulo='Assinatura pendente',
        descricao=f'{quem} solicitou sua assinatura no documento "{doc.titulo}".',
        link=link,
    )


def _notificar_documento_assinado(doc: Documento, ultimo_assinante) -> None:
    """Avisa o criador do documento quando todas as assinaturas forem coletadas."""
    from notificacoes.servicos import criar_notificacao

    criador = doc.criado_por
    if not criador or criador == ultimo_assinante:
        return
    criar_notificacao(
        usuario=criador,
        tipo='assinatura',
        titulo='Documento totalmente assinado',
        descricao=f'Todas as assinaturas do documento "{doc.titulo}" foram coletadas.',
        link=_link_documento(doc),
    )


def listar_assinaturas_pendentes(user):
    """Documentos aguardando a assinatura do usuario, com indicacao de quando e a vez dele."""
    pendentes = (
        AssinaturaDocumento.objects
        .select_related('documento', 'documento__criado_por')
        .filter(usuario=user, status='pendente')
        .order_by('ordem', 'id')
    )
    resultado = []
    for ass in pendentes:
        doc = ass.documento
        anterior_pendente = doc.assinaturas.filter(
            ordem__lt=ass.ordem
        ).exclude(status='assinado').exists()
        resultado.append({
            'documento_id': str(doc.id),
            'doc_ref': doc.doc_ref,
            'titulo': doc.titulo,
            'ordem': ass.ordem,
            'minha_vez': not anterior_pendente,
            'solicitante': doc.criado_por.name if doc.criado_por else '',
            'link': _link_documento(doc),
            'criado_em': doc.criado_em.isoformat(),
        })
    return resultado

def gerar_convite(doc: Documento, user, papel: str = 'editor',
                  dias: int = 7) -> ConviteDocumento:
    expira = timezone.now() + timedelta(days=dias)
    convite = ConviteDocumento.objects.filter(
        documento=doc, papel=papel, ativo=True, expira_em__gt=timezone.now()
    ).first()
    if not convite:
        convite = ConviteDocumento.objects.create(
            documento=doc, criado_por=user, papel=papel, expira_em=expira,
        )
    return convite


def aceitar_convite(codigo: str, user) -> tuple:
    try:
        convite = ConviteDocumento.objects.select_related('documento').get(
            codigo=codigo, ativo=True,
        )
    except ConviteDocumento.DoesNotExist:
        return None, 'Convite inválido ou expirado.'

    if convite.expira_em < timezone.now():
        convite.ativo = False
        convite.save()
        return None, 'Este convite expirou.'

    if convite.usos >= convite.max_usos:
        return None, 'Limite de usos atingido.'

    doc = convite.documento
    if doc.criado_por == user:
        return convite, 'ja_criador'

    colab, criado = ColaboradorDocumento.objects.get_or_create(
        documento=doc, usuario=user,
        defaults={'papel': convite.papel},
    )
    if not criado and colab.papel != convite.papel:
        colab.papel = convite.papel
        colab.save()
    else:
        if criado:
            registrar_auditoria(doc, None, 'colaborador_adicionado',
                              f'{user.name} entrou via convite como {convite.papel}')

    convite.usos += 1
    convite.save()
    atualizar_presenca(doc, user)
    return convite, None
