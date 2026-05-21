from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from .models import CustomUser


def make_user(email='test@test.com', name='Teste', password='Test123!'):
    return CustomUser.objects.create_user(email=email, name=name, password=password)


class LoginTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_user()
        self.url = '/api/autenticacao/login/'

    def test_login_valido(self):
        resp = self.client.post(self.url, {'email': 'test@test.com', 'password': 'Test123!'}, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('access', resp.data)
        self.assertIn('refresh', resp.data)

    def test_login_senha_errada(self):
        resp = self.client.post(self.url, {'email': 'test@test.com', 'password': 'Errada!'}, format='json')
        self.assertEqual(resp.status_code, 401)

    def test_login_usuario_inexistente(self):
        resp = self.client.post(self.url, {'email': 'nao@existe.com', 'password': 'Qualquer1'}, format='json')
        self.assertEqual(resp.status_code, 401)

    def test_login_campos_ausentes(self):
        resp = self.client.post(self.url, {'email': 'test@test.com'}, format='json')
        self.assertIn(resp.status_code, [400, 401])


class CadastroTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = '/api/autenticacao/cadastro/'

    def test_cadastro_valido(self):
        resp = self.client.post(self.url, {
            'email': 'novo@test.com',
            'name': 'Novo Usuário',
            'password': 'SenhaForte1!',
        }, format='json')
        self.assertIn(resp.status_code, [200, 201])
        self.assertTrue(CustomUser.objects.filter(email='novo@test.com').exists())

    def test_email_duplicado(self):
        make_user(email='dup@test.com')
        resp = self.client.post(self.url, {
            'email': 'dup@test.com',
            'name': 'Dup',
            'password': 'SenhaForte1!',
        }, format='json')
        self.assertIn(resp.status_code, [400, 409])
