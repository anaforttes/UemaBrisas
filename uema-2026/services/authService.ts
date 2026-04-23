const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const authService = {
  login: async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/api/autenticacao/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || err.error || 'Erro ao autenticar usuario.');
    }
    const data = await response.json();
    localStorage.setItem('reurb_access_token', data.access);
    localStorage.setItem('reurb_refresh_token', data.refresh);
    return data;
  },

  googleLogin: async (credential: string) => {
    const response = await fetch(`${API_URL}/api/autenticacao/login-google/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Erro ao autenticar com Google');
    }
    const data = await response.json();
    localStorage.setItem('reurb_access_token', data.access);
    localStorage.setItem('reurb_refresh_token', data.refresh);
    return data;
  },

  // role agora é obrigatório — vem da lista suspensa do SignupScreen
  register: async (email: string, password: string, name: string, role: string) => {
    const response = await fetch(`${API_URL}/api/autenticacao/cadastro/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, role }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.email?.[0] || err.erro || err.error || 'Erro ao criar conta.');
    }
    const data = await response.json();
    if (data.access)   localStorage.setItem('reurb_access_token',  data.access);
    if (data.refresh)  localStorage.setItem('reurb_refresh_token', data.refresh);
    return data;
  },

  requestPasswordReset: async (email: string) => {
    const response = await fetch(`${API_URL}/api/autenticacao/esqueci-senha/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) {
      try {
        const err = await response.json();
        throw new Error(err.error || 'Erro ao processar a solicitacao.');
      } catch {
        throw new Error('Falha ao processar a solicitacao de recuperacao de senha.');
      }
    }
    return response.json();
  },

  confirmPasswordReset: async (uid: string, token: string, new_password: string) => {
    const response = await fetch(`${API_URL}/api/autenticacao/redefinir-senha/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, token, new_password }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(
        err.new_password?.[0] || err.token?.[0] || err.detail || err.error || 'Erro ao redefinir a senha.'
      );
    }
    return response.json();
  },

  /** Atualiza cargo, flags e permissões de um usuário no banco. */
  updateUser: async (
    id: string,
    data: {
      role?: string;
      access_flags?: Record<string, boolean>;
      permissions?: Record<string, boolean>;
      name?: string;
    },
  ) => {
    const response = await fetch(`${API_URL}/api/autenticacao/usuarios/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.erro || err.detail || 'Erro ao atualizar usuário.');
    }
    return response.json();
  },
};
