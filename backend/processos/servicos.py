from django.db.models import Q

from .models import Processo
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


def processos_do_usuario(user, processo_ids_docs: set = None):
    """Retorna todos os processos em que o usuário tem algum papel."""
    from documentos.models import Documento, ColaboradorDocumento

    uid = user.pk

    if processo_ids_docs is None:
        doc_ids_criados = Documento.objects.filter(criado_por_id=uid).values_list('processo_id', flat=True)
        doc_ids_colab   = ColaboradorDocumento.objects.filter(usuario_id=uid).values_list('documento__processo_id', flat=True)
        processo_ids_docs = {str(pid) for pid in list(doc_ids_criados) + list(doc_ids_colab) if pid}

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
