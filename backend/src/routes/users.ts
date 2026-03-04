import { Router, Request, Response } from 'express';
import { prisma } from '../server.js';
import { getParam } from '../utils/params.js';

const router = Router();

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

// ─── PATCH /api/users/:id/activity ───────────────────────────────────
router.patch('/:id/activity', async (req: Request, res: Response): Promise<void> => {
    try {
        const id = getParam(req, 'id');

        const user = await prisma.user.update({
            where: { id },
            data: {
                lastLoginAt: new Date(),
                status: 'Online',
            },
            include: { userRoles: { include: { role: true } } },
        });

        const u = user as any;
        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: u.userRoles?.[0]?.role?.name || 'Atendente',
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
        const id = getParam(req, 'id');
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
