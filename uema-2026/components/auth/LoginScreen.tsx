import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Mail, Lock, AlertCircle, Eye, EyeOff, CheckCircle2, ArrowLeft } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { authService } from '../../services/authService';
import { permissaoService } from '../../services/permissaoService'; // 🔥 NOVO
import { Logo } from '../common/Logo';

export const LoginScreen = ({ onLoginSuccess }: { onLoginSuccess: (user: any) => void }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const uidFromUrl = (searchParams.get('uid') || '')
    .replace(/^3D/gi, '')
    .replace(/=3D/gi, '=')
    .replace(/\s/g, '');

  const tokenFromUrl = (searchParams.get('token') || '')
    .replace(/^3D/gi, '')
    .replace(/=3D/gi, '=')
    .replace(/\s/g, '');

  const [view, setView] = useState<'login' | 'forgot_password' | 'reset_password'>(
    uidFromUrl && tokenFromUrl ? 'reset_password' : 'login'
  );

  const [email, setEmail] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    setError('');
    setSuccessMsg('');
  }, [view]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await authService.login(email, passwordInput);

      // 🔥 NOVO BLOCO (INTEGRAÇÃO SEGURA)
      try {
        const permissoes = await permissaoService.getRegras();
        localStorage.setItem('reurb_permissoes', JSON.stringify(permissoes));
      } catch (err) {
        console.warn('Permissões não carregadas (login segue normal).', err);
      }

      const user = {
        id: data.email,
        name: data.name,
        email: data.email,
        role: 'Técnico' as const,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.email}`,
        status: 'Online' as const,
        lastLogin: new Date().toISOString(),
        flags: {
          superusuario: false,
          adminMunicipio: false,
          profissionalInterno: true,
          usuarioExterno: false,
        },
        etapasPermitidas: [],
      };

      onLoginSuccess(user);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Credenciais inválidas ou usuário não encontrado.');
    } finally {
      setLoading(false);
    }
  };

  // 🔽 RESTO DO ARQUIVO PERMANECE IGUAL (NÃO MEXI EM NADA)