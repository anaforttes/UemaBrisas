from django.utils import timezone
from .models import Etapa

ETAPAS_PADRAO = [
    {'numero': 1,  'nome': 'Abertura / Protocolo',           'eixo': 'Geral',     'depende_de': []},
    {'numero': 2,  'nome': 'Diagnóstico Prévio',             'eixo': 'Geral',     'depende_de': [1]},
    {'numero': 3,  'nome': 'Levantamento Topográfico',       'eixo': 'Técnico',   'depende_de': [2]},
    {'numero': 4,  'nome': 'Classificação da Modalidade',    'eixo': 'Jurídico',  'depende_de': [2]},
    {'numero': 5,  'nome': 'Buscas Dominiais',               'eixo': 'Jurídico',  'depende_de': [4]},
    {'numero': 6,  'nome': 'Notificação dos Confrontantes',  'eixo': 'Jurídico',  'depende_de': [5]},
    {'numero': 7,  'nome': 'Estudos Técnicos',               'eixo': 'Técnico',   'depende_de': [3]},
    {'numero': 8,  'nome': 'Vetorização + Cadastro Social',  'eixo': 'Social',    'depende_de': [7]},
    {'numero': 9,  'nome': 'Saneamento',                     'eixo': 'Geral',     'depende_de': [6, 8]},
    {'numero': 10, 'nome': 'Elaboração do PRF',              'eixo': 'Técnico',   'depende_de': [9]},
    {'numero': 11, 'nome': 'Aprovação do PRF',               'eixo': 'Geral',     'depende_de': [10]},
    {'numero': 12, 'nome': 'Emissão da CRF',                 'eixo': 'Geral',     'depende_de': [11]},
    {'numero': 13, 'nome': 'Registro em Cartório',           'eixo': 'Cartorial', 'depende_de': [12]},
    {'numero': 14, 'nome': 'Monitoramento Pós-REURB',        'eixo': 'Geral',     'depende_de': [13]},
]


def criar_etapas_padrao(processo):
    hoje = timezone.now().date()
    etapas = [
        Etapa(
            processo=processo,
            numero=e['numero'],
            nome=e['nome'],
            eixo=e['eixo'],
            depende_de=e['depende_de'],
            status='em_andamento' if e['numero'] == 1 else 'pendente',
            data_inicio=hoje if e['numero'] == 1 else None,
        )
        for e in ETAPAS_PADRAO
    ]
    return Etapa.objects.bulk_create(etapas)


def atualizar_progresso(processo):
    total = processo.etapas.count()
    if total == 0:
        return
    concluidas = processo.etapas.filter(status='concluida').count()
    processo.progress = round((concluidas / total) * 100)
    processo.save(update_fields=['progress'])
