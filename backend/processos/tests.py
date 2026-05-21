from django.test import TestCase
from rest_framework.test import APIClient
from autenticacao.models import CustomUser
from .models import Processo


def make_user(email='proc@test.com', name='ProcTest', password='Pass123!'):
    return CustomUser.objects.create_user(email=email, name=name, password=password)


def get_token(client, email, password):
    resp = client.post('/api/autenticacao/login/', {'email': email, 'password': password}, format='json')
    return resp.data.get('access', '')


class ProcessoCRUDTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_user()
        token = get_token(self.client, 'proc@test.com', 'Pass123!')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_criar_processo(self):
        resp = self.client.post('/api/processos/', {
            'title': 'Processo Alpha',
            'applicant': 'João Silva',
            'modality': 'REURB-S',
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(Processo.objects.count(), 1)
        self.assertIn('id', resp.data)

    def test_listar_processos(self):
        Processo.objects.create(title='P1', applicant='A1', modality='REURB-S')
        Processo.objects.create(title='P2', applicant='A2', modality='REURB-E')
        resp = self.client.get('/api/processos/')
        self.assertEqual(resp.status_code, 200)
        self.assertGreaterEqual(resp.data['count'], 2)

    def test_obter_processo(self):
        p = Processo.objects.create(title='Det', applicant='B', modality='REURB-S')
        resp = self.client.get(f'/api/processos/{p.id}/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['title'], 'Det')

    def test_atualizar_processo(self):
        p = Processo.objects.create(title='Old', applicant='C', modality='REURB-S', criado_por=self.user)
        resp = self.client.patch(f'/api/processos/{p.id}/', {'title': 'New'}, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['title'], 'New')

    def test_deletar_processo(self):
        p = Processo.objects.create(title='Del', applicant='D', modality='REURB-S', criado_por=self.user)
        resp = self.client.delete(f'/api/processos/{p.id}/')
        self.assertIn(resp.status_code, [200, 204])
        self.assertFalse(Processo.objects.filter(pk=p.id).exists())

    def test_sem_autenticacao(self):
        c = APIClient()
        resp = c.get('/api/processos/')
        self.assertEqual(resp.status_code, 401)

    def test_protocolo_gerado_automaticamente(self):
        resp = self.client.post('/api/processos/', {
            'title': 'Auto',
            'applicant': 'E',
            'modality': 'REURB-E',
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertIn('-', resp.data['protocol'])
