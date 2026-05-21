from django.db.models import Count
from django.db.models.functions import TruncMonth
from django.utils import timezone
from datetime import timedelta

from processos.models import Processo
from processos.constantes import STATUS_CONCLUIDOS, STATUS_EM_REVISAO, STATUS_FECHADOS
from processos.serializadores import ProcessoSerializer


def obter_agregacoes(periodo: str = 'all', modalidade: str = 'todos') -> dict:
    qs = Processo.objects.all()

    if modalidade in ('REURB-S', 'REURB-E'):
        qs = qs.filter(modality=modalidade)

    agora = timezone.now()
    if periodo == '7d':
        qs = qs.filter(created_at__gte=agora - timedelta(days=7))
    elif periodo == '30d':
        qs = qs.filter(created_at__gte=agora - timedelta(days=30))
    elif periodo == '90d':
        qs = qs.filter(created_at__gte=agora - timedelta(days=90))

    por_mes = (
        Processo.objects.annotate(mes=TruncMonth('created_at'))
        .values('mes')
        .annotate(total=Count('id'))
        .order_by('mes')
    )
    por_mes_lista = [
        {'mes': item['mes'].strftime('%Y-%m') if item['mes'] else '', 'total': item['total']}
        for item in por_mes
        if item['mes']
    ]

    por_modalidade = list(
        qs.values('modality').annotate(total=Count('id')).order_by('-total')
    )

    por_status = list(
        qs.values('status').annotate(total=Count('id')).order_by('-total')
    )

    por_responsavel = list(
        qs.exclude(responsible_name='')
        .values('responsible_name')
        .annotate(total=Count('id'))
        .order_by('-total')[:10]
    )

    total = qs.count()
    progress_vals = list(qs.values_list('progress', flat=True))
    progresso_medio = round(sum(progress_vals) / len(progress_vals)) if progress_vals else 0

    return {
        'total': total,
        'progresso_medio': progresso_medio,
        'por_mes': por_mes_lista,
        'por_modalidade': por_modalidade,
        'por_status': por_status,
        'por_responsavel': por_responsavel,
    }


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
