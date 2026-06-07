from django.db.models import Count, Avg, F, ExpressionWrapper, fields
from django.db.models.functions import TruncMonth
from django.utils import timezone
from datetime import timedelta

from processos.models import Processo
from processos.constantes import STATUS_CONCLUIDOS, STATUS_EM_REVISAO, STATUS_FECHADOS
from etapas.models import Etapa

# As 14 etapas padrão do fluxo REURB (nome canônico + número)
ETAPAS_PADRAO = [
    (1,  'Abertura / Protocolo'),
    (2,  'Diagnóstico Prévio'),
    (3,  'Levantamento Topográfico'),
    (4,  'Classificação da Modalidade'),
    (5,  'Buscas Dominiais'),
    (6,  'Notificação dos Confrontantes'),
    (7,  'Estudos Técnicos'),
    (8,  'Vetorização + Cadastro Social'),
    (9,  'Saneamento'),
    (10, 'Elaboração do PRF'),
    (11, 'Aprovação do PRF'),
    (12, 'Emissão da CRF'),
    (13, 'Registro em Cartório'),
    (14, 'Monitoramento Pós-REURB'),
]


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
        for item in por_mes if item['mes']
    ]

    total = qs.count()
    progress_vals = list(qs.values_list('progress', flat=True))
    progresso_medio = round(sum(progress_vals) / len(progress_vals)) if progress_vals else 0

    return {
        'total': total,
        'progresso_medio': progresso_medio,
        'por_mes': por_mes_lista,
        'por_modalidade': list(qs.values('modality').annotate(total=Count('id')).order_by('-total')),
        'por_status': list(qs.values('status').annotate(total=Count('id')).order_by('-total')),
        'por_responsavel': list(
            qs.exclude(responsible_name='')
            .values('responsible_name')
            .annotate(total=Count('id'))
            .order_by('-total')[:10]
        ),
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

    # ── Cards principais ──────────────────────────────────────────────────────
    cards = {
        'ativos':     processos_base.filter(status='Em Andamento').count(),
        'em_revisao': processos_base.filter(
            status__in=['Em Revisão', 'Em Análise', 'Análise Jurídica', 'Diligência']
        ).count(),
        'concluidos': processos_base.filter(status__in=STATUS_CONCLUIDOS).count(),
    }

    status_resumo = {
        'em_edicao':  processos_base.filter(status='Em Edição').count(),
        'em_revisao': processos_base.filter(
            status__in=['Em Revisão', 'Em Análise', 'Análise Jurídica', 'Diligência']
        ).count(),
        'pendente':  processos_base.filter(status='Pendente').count(),
        'assinado':  processos_base.filter(status='Assinado').count(),
        'arquivado': processos_base.filter(status='Arquivado').count(),
    }

    # ── Recentes ──────────────────────────────────────────────────────────────
    recentes = [
        {
            'id':              p.id,
            'nome':            p.title,
            'title':           p.title,
            'applicant':       p.applicant,
            'requerente':      p.applicant,
            'modalidade':      p.modality,
            'modality':        p.modality,
            'status':          p.status,
            'progresso':       p.progress,
            'progress':        p.progress,
            'responsavel':     p.responsible_name,
            'responsibleName': p.responsible_name,
        }
        for p in processos[:5]
    ]

    # ── Top 5 mais antigos não finalizados ────────────────────────────────────
    nao_finalizados = processos_base.exclude(status__in=STATUS_FECHADOS).order_by('created_at')
    mais_antigos = [
        {
            'id':         p.id,
            'protocol':   p.protocol or '',
            'title':      p.title,
            'applicant':  p.applicant,
            'status':     p.status,
            'created_at': p.created_at.isoformat() if p.created_at else '',
        }
        for p in nao_finalizados[:5]
    ]

    # ── Top 5 sem movimentação (não finalizados) ──────────────────────────────
    sem_movimentacao = [
        {
            'id':         p.id,
            'protocol':   p.protocol or '',
            'title':      p.title,
            'applicant':  p.applicant,
            'status':     p.status,
            'updated_at': p.updated_at.isoformat() if p.updated_at else '',
        }
        for p in nao_finalizados.order_by('updated_at')[:5]
    ]

    # ── Processos por responsável (todos os processos ativos) ─────────────────
    processos_por_responsavel = list(
        processos_base
        .exclude(status__in=STATUS_FECHADOS)
        .exclude(responsible_name='')
        .values('responsible_name')
        .annotate(total=Count('id'))
        .order_by('-total')[:10]
    )

    # ── Processos por etapa ───────────────────────────────────────────────────
    # Para cada etapa (1-14), conta quantos processos não finalizados estão
    # com aquela etapa em status 'em_andamento'. Um processo está "naquela etapa"
    # quando a etapa correspondente é a que está em andamento no momento.
    processos_nao_finalizados = processos_base.exclude(status__in=STATUS_FECHADOS)

    etapas_em_andamento = (
        Etapa.objects
        .filter(status='em_andamento')
        .filter(processo__in=processos_nao_finalizados)
        .values('numero')
        .annotate(total=Count('processo', distinct=True))
    )
    etapas_dict = {e['numero']: e['total'] for e in etapas_em_andamento}

    por_etapa = [
        {
            'numero': num,
            'etapa':  nome,
            'total':  etapas_dict.get(num, 0),
        }
        for num, nome in ETAPAS_PADRAO
    ]

    return {
        'cards':                     cards,
        'status':                    status_resumo,
        'recentes':                  recentes,
        'mais_antigos':              mais_antigos,
        'sem_movimentacao':          sem_movimentacao,
        'processos_por_responsavel': processos_por_responsavel,
        'por_etapa':                 por_etapa,
    }
