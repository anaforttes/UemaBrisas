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


class GerenciamentoEquipeTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.usuario = make_user(email='usuario@test.com', name='Usuario')
        self.outro = make_user(email='outro@test.com', name='Outro')
        self.admin = make_user(email='admin@test.com', name='Admin', role='Admin')

    def test_usuario_pode_alterar_proprio_nome(self):
        self.client.force_authenticate(self.usuario)
        resp = self.client.patch(
            f'/api/autenticacao/usuarios/{self.usuario.id}/',
            {'name': 'Nome Atualizado'},
            format='json',
        )
        self.assertEqual(resp.status_code, 200)
        self.usuario.refresh_from_db()
        self.assertEqual(self.usuario.name, 'Nome Atualizado')

    def test_usuario_nao_pode_alterar_nome_de_outro(self):
        self.client.force_authenticate(self.usuario)
        resp = self.client.patch(
            f'/api/autenticacao/usuarios/{self.outro.id}/',
            {'name': 'Nome Indevido'},
            format='json',
        )
        self.assertEqual(resp.status_code, 403)
        self.outro.refresh_from_db()
        self.assertEqual(self.outro.name, 'Outro')

    def test_admin_nao_pode_alterar_nome_de_outro(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.patch(
            f'/api/autenticacao/usuarios/{self.outro.id}/',
            {'name': 'Nome Indevido'},
            format='json',
        )
        self.assertEqual(resp.status_code, 403)
        self.outro.refresh_from_db()
        self.assertEqual(self.outro.name, 'Outro')

    def test_admin_pode_alterar_cargo_de_outro(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.patch(
            f'/api/autenticacao/usuarios/{self.outro.id}/',
            {'role': 'Gestor'},
            format='json',
        )
        self.assertEqual(resp.status_code, 200)
        self.outro.refresh_from_db()
        self.assertEqual(self.outro.role, 'Gestor')

    def test_usuario_nao_pode_remover_outro(self):
        self.client.force_authenticate(self.usuario)
        resp = self.client.delete(f'/api/autenticacao/usuarios/{self.outro.id}/')
        self.assertEqual(resp.status_code, 403)
        self.assertTrue(CustomUser.objects.filter(pk=self.outro.id).exists())
