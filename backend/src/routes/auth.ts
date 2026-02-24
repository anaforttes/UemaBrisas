import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../server.js';

const router = Router();

// ─── POST /api/auth/signup ───────────────────────────────────────────
router.post('/signup', async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email, password, role = 'Atendente' } = req.body;

        if (!name || !email || !password) {
            res.status(400).json({ error: 'Campos obrigatórios: name, email, password.' });
            return;
        }

        // Verificar se email já existe
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            res.status(409).json({ error: 'Este e-mail já possui uma solicitação ativa.' });
            return;
        }

        // Hash da senha
        const passwordHash = await bcrypt.hash(password, 12);

        // Criar usuário
        const user = await prisma.user.create({
            data: {
                name,
                email,
                passwordHash,
                avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
                status: 'Offline',
                quotaLimit: 10000,
                quotaUsed: 0,
            },
        });

        // Atribuir role
        const roleRecord = await prisma.role.findFirst({ where: { name: role } });
        if (roleRecord) {
            await prisma.userRole.create({
                data: { userId: user.id, roleId: roleRecord.id },
            });
        }

        res.status(201).json({
            id: user.id,
            name: user.name,
            email: user.email,
            role,
            avatar: user.avatarUrl,
            status: user.status,
        });
    } catch (error: any) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Erro interno ao criar usuário.' });
    }
});

// ─── POST /api/auth/login ────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ error: 'Email e senha são obrigatórios.' });
            return;
        }

        const user = await prisma.user.findUnique({
            where: { email, deletedAt: null },
            include: {
                userRoles: { include: { role: true } },
            },
        });

        if (!user) {
            res.status(401).json({ error: 'Credenciais inválidas ou usuário não encontrado.' });
            return;
        }

        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) {
            res.status(401).json({ error: 'Credenciais inválidas ou usuário não encontrado.' });
            return;
        }

        // Atualizar atividade
        await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date(), status: 'Online' },
        });

        // Gerar JWT
        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '24h' }
        );

        const roleName = user.userRoles[0]?.role.name || 'Atendente';

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: roleName,
                avatar: user.avatarUrl,
                status: 'Online',
                lastLogin: new Date().toISOString(),
                quota: {
                    limit: user.quotaLimit,
                    used: user.quotaUsed,
                    resetAt: user.quotaResetAt?.toISOString() || new Date(Date.now() + 86400000).toISOString(),
                },
            },
        });
    } catch (error: any) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Erro interno no login.' });
    }
});

// ─── POST /api/auth/google ──────────────────────────────────────────
router.post('/google', async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email, avatar } = req.body;

        let user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            const passwordHash = await bcrypt.hash(Math.random().toString(36), 12);
            user = await prisma.user.create({
                data: {
                    name,
                    email,
                    passwordHash,
                    avatarUrl: avatar,
                    status: 'Online',
                    lastLoginAt: new Date(),
                },
            });

            // Atribuir role padrão
            const defaultRole = await prisma.role.findFirst({ where: { name: 'Jurídico' } });
            if (defaultRole) {
                await prisma.userRole.create({
                    data: { userId: user.id, roleId: defaultRole.id },
                });
            }
        } else {
            await prisma.user.update({
                where: { id: user.id },
                data: { lastLoginAt: new Date(), status: 'Online' },
            });
        }

        const userRoles = await prisma.userRole.findMany({
            where: { userId: user.id },
            include: { role: true },
        });

        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: userRoles[0]?.role.name || 'Jurídico',
                avatar: user.avatarUrl,
                status: 'Online',
                lastLogin: new Date().toISOString(),
                quota: {
                    limit: user.quotaLimit,
                    used: user.quotaUsed,
                    resetAt: user.quotaResetAt?.toISOString() || new Date(Date.now() + 86400000).toISOString(),
                },
            },
        });
    } catch (error: any) {
        console.error('Google auth error:', error);
        res.status(500).json({ error: 'Erro na autenticação Google.' });
    }
});

export default router;
