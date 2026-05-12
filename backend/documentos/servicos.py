from datetime import timedelta
from django.utils import timezone

from autenticacao.models import CustomUser
from .models import (
    Documento, ColaboradorDocumento, VersaoDocumento,
    AssinaturaDocumento, ConviteDocumento,
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
    return criados


def registrar_assinatura(doc: Documento, user, dados: dict) -> AssinaturaDocumento:
    ass, _ = AssinaturaDocumento.objects.get_or_create(
        documento=doc, usuario=user,
        defaults={'ordem': doc.assinaturas.count() + 1},
    )
    ass.status           = 'assinado'
    ass.protocolo        = dados.get('protocolo', '')
    ass.hash_assinatura  = dados.get('hash_assinatura', '')
    ass.nome_certificado = dados.get('nome_certificado', '')
    ass.cpf_certificado  = dados.get('cpf_certificado', '')
    ass.ac_emissora      = dados.get('ac_emissora', '')
    ass.assinado_em      = timezone.now()
    ass.save()

    total  = doc.assinaturas.count()
    signed = doc.assinaturas.filter(status='assinado').count()
    if total > 0 and signed == total:
        doc.status = 'Signed'
        doc.save()

    return ass


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

    convite.usos += 1
    convite.save()
    return convite, None
