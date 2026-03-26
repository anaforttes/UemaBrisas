import { Router, Request, Response } from 'express';
import { prisma } from '../server.js';
import { randomUUID } from 'crypto';

const router = Router();
const templateProfilesByUser = new Map<string, Array<{ id: string; nomePerfil: string; dados: Record<string, string>; atualizadoEm: string }>>();

// ─── GET /api/users ──────────────────────────────────────────────────
router.get('/', async (_req: Request, res: Response): Promise<void> => {
    try {
        const users = await prisma.user.findMany({
            where: { deletedAt: null },
            include: {
                userRoles: { include: { role: true } },
            },
            orderBy: { name: 'asc' },
        });

        const mapped = users.map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.userRoles[0]?.role.name || 'Atendente',
            avatar: u.avatarUrl,
            status: u.status,
            lastLogin: u.lastLoginAt?.toISOString(),
            quota: {
                limit: u.quotaLimit,
                used: u.quotaUsed,
                resetAt: u.quotaResetAt?.toISOString() || new Date(Date.now() + 86400000).toISOString(),
            },
        }));

        res.json(mapped);
    } catch (error: any) {
        console.error('Users list error:', error);
        res.status(500).json({ error: 'Erro ao listar usuários.' });
    }
});

// ─── GET /api/users/by-email?email=xxx ───────────────────────────────
router.get('/by-email', async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.query;
        if (!email) {
            res.status(400).json({ error: 'Email é obrigatório.' });
            return;
        }

        const user = await prisma.user.findUnique({
            where: { email: email as string, deletedAt: null },
            include: { userRoles: { include: { role: true } } },
        });

        if (!user) {
            res.json(null);
            return;
        }

        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.userRoles[0]?.role.name || 'Atendente',
            avatar: user.avatarUrl,
            password: undefined, // never send password
            status: user.status,
            lastLogin: user.lastLoginAt?.toISOString(),
            quota: {
                limit: user.quotaLimit,
                used: user.quotaUsed,
                resetAt: user.quotaResetAt?.toISOString(),
            },
        });
    } catch (error: any) {
        console.error('Find by email error:', error);
        res.status(500).json({ error: 'Erro ao buscar usuário.' });
    }
});

// ─── GET /api/users/:id/template-profiles ─────────────────────────────
router.get('/:id/template-profiles', async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const profiles = templateProfilesByUser.get(id) || [];
        res.json(profiles);
    } catch (error: any) {
        console.error('Template profiles list error:', error);
        res.status(500).json({ error: 'Erro ao listar perfis salvos.' });
    }
});

// ─── POST /api/users/:id/template-profiles ────────────────────────────
router.post('/:id/template-profiles', async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { nomePerfil, dados } = req.body;

        if (!nomePerfil || typeof nomePerfil !== 'string') {
            res.status(400).json({ error: 'nomePerfil é obrigatório.' });
            return;
        }

        if (!dados || typeof dados !== 'object') {
            res.status(400).json({ error: 'dados é obrigatório.' });
            return;
        }

        const novoPerfil = {
            id: randomUUID(),
            nomePerfil: nomePerfil.trim(),
            dados,
            atualizadoEm: new Date().toISOString(),
        };

        const atuais = templateProfilesByUser.get(id) || [];
        const atualizados = [novoPerfil, ...atuais].slice(0, 15);
        templateProfilesByUser.set(id, atualizados);

        res.status(201).json(novoPerfil);
    } catch (error: any) {
        console.error('Template profile create error:', error);
        res.status(500).json({ error: 'Erro ao salvar perfil.' });
    }
});

// ─── DELETE /api/users/:id/template-profiles/:profileId ───────────────
router.delete('/:id/template-profiles/:profileId', async (req: Request, res: Response): Promise<void> => {
    try {
        const { id, profileId } = req.params;
        const atuais = templateProfilesByUser.get(id) || [];
        const filtrados = atuais.filter((p) => p.id !== profileId);
        templateProfilesByUser.set(id, filtrados);
        res.json({ ok: true });
    } catch (error: any) {
        console.error('Template profile delete error:', error);
        res.status(500).json({ error: 'Erro ao excluir perfil.' });
    }
});

// ─── PATCH /api/users/:id/activity ───────────────────────────────────
router.patch('/:id/activity', async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const user = await prisma.user.update({
            where: { id },
            data: {
                lastLoginAt: new Date(),
                status: 'Online',
            },
            include: { userRoles: { include: { role: true } } },
        });

        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.userRoles[0]?.role.name || 'Atendente',
            avatar: user.avatarUrl,
            status: user.status,
            lastLogin: user.lastLoginAt?.toISOString(),
            quota: {
                limit: user.quotaLimit,
                used: user.quotaUsed,
                resetAt: user.quotaResetAt?.toISOString(),
            },
        });
    } catch (error: any) {
        console.error('Update activity error:', error);
        res.status(500).json({ error: 'Erro ao atualizar atividade.' });
    }
});

// ─── PATCH /api/users/:id/quota ──────────────────────────────────────
router.patch('/:id/quota', async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { tokensUsed } = req.body;

        const user = await prisma.user.update({
            where: { id },
            data: {
                quotaUsed: { increment: tokensUsed || 0 },
            },
        });

        res.json({
            id: user.id,
            quota: {
                limit: user.quotaLimit,
                used: user.quotaUsed,
                resetAt: user.quotaResetAt?.toISOString(),
            },
        });
    } catch (error: any) {
        console.error('Update quota error:', error);
        res.status(500).json({ error: 'Erro ao atualizar quota.' });
    }
});

export default router;
