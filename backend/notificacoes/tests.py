from django.test import TestCase
from rest_framework.test import APIClient
from autenticacao.models import CustomUser
from .models import Notificacao


def make_user(email='n@test.com', name='NTest', password='Pass123!'):
    return CustomUser.objects.create_user(email=email, name=name, password=password)


def get_token(client, email, password):
    resp = client.post('/api/autenticacao/login/', {'email': email, 'password': password}, format='json')
    return resp.data.get('access', '')


class NotificacoesTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_user()
        token = get_token(self.client, 'n@test.com', 'Pass123!')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        Notificacao.objects.create(
            usuario=self.user, tipo='sistema',
            titulo='Bem-vindo', descricao='Olá!',
        )

    def test_listar_notificacoes(self):
        resp = self.client.get('/api/notificacoes/')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('resultados', resp.data)
        self.assertIn('nao_lidas', resp.data)
        self.assertEqual(len(resp.data['resultados']), 1)

    def test_nao_lidas_count(self):
        resp = self.client.get('/api/notificacoes/')
        self.assertEqual(resp.data['nao_lidas'], 1)

    def test_marcar_lida(self):
        n = Notificacao.objects.first()
        resp = self.client.patch(f'/api/notificacoes/{n.id}/lida/')
        self.assertEqual(resp.status_code, 200)
        n.refresh_from_db()
        self.assertTrue(n.lida)

    def test_marcar_todas(self):
        Notificacao.objects.create(usuario=self.user, tipo='sistema', titulo='Segunda')
        resp = self.client.post('/api/notificacoes/marcar-todas/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['marcadas'], 2)
        self.assertEqual(Notificacao.objects.filter(usuario=self.user, lida=False).count(), 0)

    def test_sem_autenticacao(self):
        c = APIClient()
        resp = c.get('/api/notificacoes/')
        self.assertEqual(resp.status_code, 401)
