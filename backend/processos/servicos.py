from django.db.models import Q
from django.utils import timezone

from .models import Processo, ConviteAtribuicao
from .eventos import registrar
from .constantes import STATUS_CONCLUIDOS, STATUS_EM_REVISAO, STATUS_FECHADOS


def listar_processos(search: str = '', status_filtro: str = ''):
    qs = Processo.objects.select_related('technician_id', 'legal_id', 'criado_por')
    if search:
        qs = qs.filter(
            Q(title__icontains=search) |
            Q(applicant__icontains=search) |
            Q(protocol__icontains=search)
        )
    if status_filtro:
        qs = qs.filter(status=status_filtro)
    return qs


def criar_processo(user, dados: dict) -> Processo:
    from .serializadores import ProcessoSerializer
    serializer = ProcessoSerializer(data=dados)
    serializer.is_valid(raise_exception=True)
    return serializer.save(criado_por=user)


def ids_processos_com_documentos(user) -> set:
    """IDs (str) de processos onde o usuário criou ou colabora em documentos."""
    from documentos.models import Documento, ColaboradorDocumento

    uid = user.pk
    doc_ids_criados = Documento.objects.filter(criado_por_id=uid).values_list('processo_id', flat=True)
    doc_ids_colab = ColaboradorDocumento.objects.filter(
        usuario_id=uid
    ).values_list('documento__processo_id', flat=True)
    return {str(pid) for pid in list(doc_ids_criados) + list(doc_ids_colab) if pid}


def processos_do_usuario(user, processo_ids_docs: set = None):
    """Retorna todos os processos em que o usuário tem algum papel."""
    uid = user.pk

    if processo_ids_docs is None:
        processo_ids_docs = ids_processos_com_documentos(user)

    filtro = Q(technician_id=uid) | Q(legal_id=uid) | Q(criado_por_id=uid)
    if processo_ids_docs:
        pk_ints = {int(pid) for pid in processo_ids_docs if pid.isdigit()}
        if pk_ints:
            filtro |= Q(pk__in=pk_ints)

    return (
        Processo.objects
        .filter(filtro)
        .select_related('technician_id', 'legal_id', 'criado_por')
        .distinct()
    )


def papeis_no_processo(user, processo, processo_ids_docs: set = None) -> list:
    uid = user.pk
    papeis = []
    if processo.criado_por_id == uid:
        papeis.append('Criador')
    if processo.technician_id == uid:
        papeis.append('Técnico')
    if processo.legal_id == uid:
        papeis.append('Jurídico')
    if processo_ids_docs and str(processo.pk) in processo_ids_docs:
        papeis.append('Colaborador')
    return papeis


def calcular_stats() -> dict:
    return {
        'total':      Processo.objects.count(),
        'ativos':     Processo.objects.exclude(status__in=STATUS_FECHADOS).count(),
        'concluidos': Processo.objects.filter(status__in=STATUS_CONCLUIDOS).count(),
        'em_revisao': Processo.objects.filter(status__in=STATUS_EM_REVISAO).count(),
    }


def registrar_alteracoes_processo(processo, dados, usuario) -> None:
    """Registra eventos de mudança de equipe e status antes de salvar o PATCH."""
    from autenticacao.models import CustomUser

    for campo, label in [('technician_id', 'Técnico'), ('legal_id', 'Jurídico')]:
        novo_id = dados.get(campo)
        if novo_id is not None:
            atual_id = getattr(processo, campo + '_id', None)
            if str(novo_id) != str(atual_id or ''):
                try:
                    nome = CustomUser.objects.get(pk=novo_id).name if novo_id else 'Nenhum'
                except CustomUser.DoesNotExist:
                    nome = str(novo_id)
                registrar(processo, 'equipe_alterada',
                          f'{label} atribuído: {nome}',
                          usuario, {'campo': campo, 'novo_id': novo_id, 'nome': nome})

    if 'status' in dados and dados['status'] != processo.status:
        registrar(processo, 'status_alterado',
                  f'Status alterado: {processo.status} → {dados["status"]}',
                  usuario, {'de': processo.status, 'para': dados['status']})


def deletar_processo(processo) -> None:
    processo.delete()


def listar_convites_pendentes(processo):
    return (
        processo.convites.filter(status='pendente')
        .select_related('convidado', 'solicitado_por', 'processo')
    )


def listar_eventos(processo):
    return processo.eventos.select_related('usuario').all()


def consultar_por_protocolo(protocolo: str):
    """Busca um processo pelo protocolo (case-insensitive). Retorna None se não existir."""
    try:
        return Processo.objects.get(protocol__iexact=protocolo.strip().upper())
    except Processo.DoesNotExist:
        return None


# ─── Atribuição de equipe (com convite/aceite) ────────────────────────────────

PAPEL_CAMPO = {'tecnico': 'technician_id', 'juridico': 'legal_id'}
PAPEL_LABEL = {'tecnico': 'Técnico', 'juridico': 'Jurídico'}


def _eh_admin(user) -> bool:
    from controleadmin.servicos import usuario_tem_acesso_controleadmin
    return usuario_tem_acesso_controleadmin(user)


def _aplicar_papel(processo, papel, usuario):
    setattr(processo, PAPEL_CAMPO[papel], usuario)
    processo.save()


def atribuir_ou_convidar(processo, papel, usuario_id, solicitante):
    """
    Decide entre atribuição direta (admin) ou convite com aceite (demais).
    Retorna (resultado, convite|None) com resultado em
    {'removido', 'atribuido', 'convite_enviado'}.
    """
    from notificacoes.servicos import criar_notificacao

    if papel not in PAPEL_CAMPO:
        raise ValueError('Papel inválido.')

    label = PAPEL_LABEL[papel]

    # Remoção do papel (sem destinatário)
    if not usuario_id:
        _aplicar_papel(processo, papel, None)
        ConviteAtribuicao.objects.filter(
            processo=processo, papel=papel, status='pendente'
        ).update(status='cancelado', respondido_em=timezone.now())
        registrar(processo, 'equipe_alterada', f'{label} removido', solicitante,
                  {'papel': papel, 'usuario_id': None})
        return ('removido', None)

    from autenticacao.models import CustomUser
    usuario = CustomUser.objects.get(pk=usuario_id)

    # Admin atribui direto
    if _eh_admin(solicitante):
        _aplicar_papel(processo, papel, usuario)
        ConviteAtribuicao.objects.filter(
            processo=processo, papel=papel, status='pendente'
        ).update(status='cancelado', respondido_em=timezone.now())
        registrar(processo, 'equipe_alterada', f'{label} atribuído: {usuario.name}',
                  solicitante, {'papel': papel, 'usuario_id': usuario.pk})
        if usuario.pk != solicitante.pk:
            criar_notificacao(
                usuario, 'atribuicao',
                f'Você foi atribuído como {label}',
                f'No processo {processo.protocol} — {processo.title}.',
                link='/processes',
            )
        return ('atribuido', None)

    # Demais perfis: convite pendente que exige aceite
    ConviteAtribuicao.objects.filter(
        processo=processo, papel=papel, status='pendente'
    ).update(status='cancelado', respondido_em=timezone.now())

    convite = ConviteAtribuicao.objects.create(
        processo=processo, papel=papel, convidado=usuario, solicitado_por=solicitante,
    )
    criar_notificacao(
        usuario, 'atribuicao',
        f'Convite para atuar como {label}',
        f'{solicitante.name} convidou você para o processo {processo.protocol} — {processo.title}.',
        link='/processes', convite=convite,
    )
    registrar(processo, 'equipe_alterada',
              f'Convite enviado a {usuario.name} para {label}', solicitante,
              {'papel': papel, 'convite_id': convite.id, 'evento': 'convite_enviado'})
    return ('convite_enviado', convite)


def responder_convite(convite, usuario, acao):
    """Convidado aceita ou recusa. Retorna o convite atualizado."""
    from notificacoes.servicos import criar_notificacao

    if convite.convidado_id != usuario.pk:
        raise PermissionError('Apenas o convidado pode responder a este convite.')
    if convite.status != 'pendente':
        raise ValueError('Este convite já foi respondido.')

    label = PAPEL_LABEL.get(convite.papel, convite.papel)
    processo = convite.processo
    convite.respondido_em = timezone.now()

    if acao == 'aceitar':
        convite.status = 'aceito'
        convite.save()
        _aplicar_papel(processo, convite.papel, usuario)
        registrar(processo, 'equipe_alterada',
                  f'{usuario.name} aceitou atuar como {label}', usuario,
                  {'papel': convite.papel, 'convite_id': convite.id, 'evento': 'convite_aceito'})
        if convite.solicitado_por_id:
            criar_notificacao(
                convite.solicitado_por, 'atribuicao',
                f'Convite aceito por {usuario.name}',
                f'{usuario.name} aceitou atuar como {label} no processo {processo.protocol}.',
                link='/processes',
            )
    elif acao == 'recusar':
        convite.status = 'recusado'
        convite.save()
        registrar(processo, 'equipe_alterada',
                  f'{usuario.name} recusou o convite de {label}', usuario,
                  {'papel': convite.papel, 'convite_id': convite.id, 'evento': 'convite_recusado'})
        if convite.solicitado_por_id:
            criar_notificacao(
                convite.solicitado_por, 'atribuicao',
                f'Convite recusado por {usuario.name}',
                f'{usuario.name} recusou atuar como {label} no processo {processo.protocol}.',
                link='/processes',
            )
    else:
        raise ValueError('Ação inválida.')

    return convite
