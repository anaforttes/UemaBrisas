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


def obter_dashboard(status_filtro=None) -> dict:
    processos_base = Processo.objects.all().order_by('-created_at')
    processos = processos_base

    if status_filtro:
        mapa_status = {
            'em_edicao':  ['Em Edição'],
            'em_revisao': ['Em Revisão', 'Em Análise', 'Análise Jurídica', 'Diligência'],
            'pendente':   ['Pendente'],
            'assinado':   ['Assinado'],
            'arquivado':  ['Arquivado'],
            'concluido':  ['Concluído', 'Finalizado'],
            'ativo':      ['Em Andamento'],
        }
        status_validos = mapa_status.get(status_filtro)
        if status_validos:
            processos = processos.filter(status__in=status_validos)

    cards = {
        'ativos':     processos_base.filter(status='Em Andamento').count(),
        'em_revisao': processos_base.filter(
            status__in=['Em Revisão', 'Em Análise', 'Análise Jurídica', 'Diligência']
        ).count(),
        'concluidos': processos_base.filter(status__in=['Concluído', 'Finalizado']).count(),
    }

    status_resumo = {
        'em_edicao': processos_base.filter(status='Em Edição').count(),
        'em_revisao': processos_base.filter(
            status__in=['Em Revisão', 'Em Análise', 'Análise Jurídica', 'Diligência']
        ).count(),
        'pendente':  processos_base.filter(status='Pendente').count(),
        'assinado':  processos_base.filter(status='Assinado').count(),
        'arquivado': processos_base.filter(status='Arquivado').count(),
    }

    recentes = []
    for processo in processos[:5]:
        recentes.append({
            'id':            processo.id,
            'nome':          processo.title,
            'title':         processo.title,
            'applicant':     processo.applicant,
            'requerente':    processo.applicant,
            'modalidade':    processo.modality,
            'modality':      processo.modality,
            'status':        processo.status,
            'progresso':     processo.progress,
            'progress':      processo.progress,
            'responsavel':   processo.responsible_name,
            'responsibleName': processo.responsible_name,
        })

    return {'cards': cards, 'status': status_resumo, 'recentes': recentes}
