from processos.models import Processo
from processos.constantes import STATUS_CONCLUIDOS, STATUS_EM_REVISAO, STATUS_FECHADOS
from processos.serializadores import ProcessoSerializer


def obter_dashboard() -> dict:
    processos_qs = Processo.objects.all().order_by('-created_at')

    cards = {
        'ativos':     processos_qs.exclude(status__in=STATUS_FECHADOS).count(),
        'em_revisao': processos_qs.filter(status__in=STATUS_EM_REVISAO).count(),
        'concluidos': processos_qs.filter(status__in=STATUS_CONCLUIDOS).count(),
    }

    recentes = []
    for processo in processos_qs[:5]:
        recentes.append({
            'id':          processo.id,
            'nome':        processo.title,
            'applicant':   processo.applicant,
            'requerente':  processo.applicant,
            'modalidade':  processo.modality,
            'status':      processo.status,
            'progresso':   processo.progress,
            'responsavel': processo.responsible_name,
        })

    return {'cards': cards, 'recentes': recentes}
