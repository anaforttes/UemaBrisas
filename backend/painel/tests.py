from django.test import TestCase
from rest_framework.test import APIClient
from autenticacao.models import CustomUser
from processos.models import Processo


def make_user(email='admin@test.com', name='Admin', password='Admin123!'):
    return CustomUser.objects.create_user(email=email, name=name, password=password)


def get_token(client, email, password):
    resp = client.post('/api/autenticacao/login/', {'email': email, 'password': password}, format='json')
    return resp.data.get('access', '')


class DashboardTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_user()
        token = get_token(self.client, 'admin@test.com', 'Admin123!')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_dashboard_retorna_cards(self):
        resp = self.client.get('/api/painel/dashboard/')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn('cards', data)
        self.assertIn('recentes', data)


class AgregacoesTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_user()
        token = get_token(self.client, 'admin@test.com', 'Admin123!')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        Processo.objects.create(title='P1', applicant='A1', modality='REURB-S', responsible_name='Ana')
        Processo.objects.create(title='P2', applicant='A2', modality='REURB-E', responsible_name='Bruno')

    def test_agregacoes_retorna_estrutura(self):
        resp = self.client.get('/api/painel/agregacoes/')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn('total', data)
        self.assertIn('por_mes', data)
        self.assertIn('por_modalidade', data)
        self.assertIn('por_status', data)
        self.assertIn('por_responsavel', data)

    def test_agregacoes_total_correto(self):
        resp = self.client.get('/api/painel/agregacoes/')
        self.assertEqual(resp.json()['total'], 2)

    def test_agregacoes_filtro_modalidade(self):
        resp = self.client.get('/api/painel/agregacoes/?modalidade=REURB-S')
        self.assertEqual(resp.json()['total'], 1)

    def test_agregacoes_filtro_periodo(self):
        resp = self.client.get('/api/painel/agregacoes/?periodo=7d')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()['total'], 2)
