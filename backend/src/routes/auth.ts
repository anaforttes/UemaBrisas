import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../server.js';
import { RoleName } from '../permissions.js';
import { mapUserToResponse } from '../utils/mappers.js';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'reurb-dev-secret-change-in-production';
const ACCESS_TOKEN_EXPIRY  = '15m';   // curta duração conforme spec
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

function generateAccessToken(userId: string, roles: string[]): string {
    return jwt.sign({ userId, roles }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

async function createRefreshToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    await prisma.refreshToken.create({ data: { userId, token, expiresAt } });
    return token;
}

function getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) return String(forwarded).split(',')[0].trim();
    return req.socket?.remoteAddress || 'unknown';
}

async function logAudit(
    userId: string | null,
    action: any,
    entity: string,
    entityId: string | null,
    ip: string,
    details?: object,
) {
    try {
        await prisma.auditLog.create({
            data: { userId, action, entity, entityId, ipAddress: ip, details: details as any },
        });
    } catch (e) {
        console.error('Audit log error:', e);
    }
}

// ─── POST /api/auth/signup ───────────────────────────────────────────
router.post('/signup', async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            name,
            email,
            password,
            role = RoleName.InternalProfessional,
            professionalType,
        } = req.body;

        if (!name || !email || !password) {
            res.status(400).json({ error: 'Campos obrigatórios: name, email, password.' });
            return;
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            res.status(409).json({ error: 'Este e-mail já possui uma solicitação ativa.' });
            return;
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                passwordHash,
                avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
                status: 'Offline',
                professionalType: professionalType || null,
                quotaLimit: 10000,
                quotaUsed: 0,
            },
        });

        const roleRecord = await prisma.role.findFirst({ where: { name: role } });
        if (roleRecord) {
            await prisma.userRole.create({ data: { userId: user.id, roleId: roleRecord.id } });
        }

        await logAudit(user.id, 'signup', 'User', user.id, getClientIp(req), { email });

        res.status(201).json({ id: user.id, name: user.name, email: user.email, role, avatar: user.avatarUrl, status: user.status });
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
            include: { userRoles: { include: { role: true } } },
        });

        if (!user) {
            res.status(401).json({ error: 'Credenciais inválidas ou usuário não encontrado.' });
            return;
        }

        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) {
            await logAudit(null, 'login', 'User', null, getClientIp(req), { email, success: false });
            res.status(401).json({ error: 'Credenciais inválidas ou usuário não encontrado.' });
            return;
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date(), status: 'Online' },
        });

        const roleNames = user.userRoles.map((ur) => ur.role.name);
        const accessToken  = generateAccessToken(user.id, roleNames);
        const refreshToken = await createRefreshToken(user.id);

        await logAudit(user.id, 'login', 'User', user.id, getClientIp(req), { email, success: true });

        const userForMap = { ...user, status: 'Online', lastLoginAt: new Date(), userRoles: user.userRoles };
        res.json({
            token: accessToken,
            refreshToken,
            user: mapUserToResponse(userForMap as any),
        });
    } catch (error: any) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Erro interno no login.' });
    }
});

// ─── POST /api/auth/refresh ──────────────────────────────────────────
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            res.status(400).json({ error: 'Refresh token obrigatório.' });
            return;
        }

        const stored = await prisma.refreshToken.findUnique({
            where: { token: refreshToken },
            include: { user: { include: { userRoles: { include: { role: true } } } } },
        });

        if (!stored || stored.expiresAt < new Date()) {
            if (stored) await prisma.refreshToken.delete({ where: { id: stored.id } });
            res.status(401).json({ error: 'Refresh token inválido ou expirado.' });
            return;
        }

        const roleNames = stored.user.userRoles.map((ur) => ur.role.name);
        const newAccessToken  = generateAccessToken(stored.user.id, roleNames);
        const newRefreshToken = await createRefreshToken(stored.user.id);

        // Rotaciona o refresh token (revoga o antigo)
        await prisma.refreshToken.delete({ where: { id: stored.id } });

        res.json({ token: newAccessToken, refreshToken: newRefreshToken });
    } catch (error: any) {
        console.error('Refresh error:', error);
        res.status(500).json({ error: 'Erro ao renovar token.' });
    }
});

// ─── POST /api/auth/logout ───────────────────────────────────────────
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) {
            await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
        }
        res.json({ message: 'Sessão encerrada.' });
    } catch (error: any) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Erro ao encerrar sessão.' });
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
                data: { name, email, passwordHash, avatarUrl: avatar, status: 'Online', lastLoginAt: new Date() },
            });

            const defaultRole = await prisma.role.findFirst({ where: { name: RoleName.InternalProfessional } });
            if (defaultRole) {
                await prisma.userRole.create({ data: { userId: user.id, roleId: defaultRole.id } });
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
        const roleNames = userRoles.map((ur) => ur.role.name);

        const accessToken  = generateAccessToken(user.id, roleNames);
        const refreshToken = await createRefreshToken(user.id);

        await logAudit(user.id, 'login', 'User', user.id, getClientIp(req), { email, provider: 'google' });

        const userForMap = { ...user, status: 'Online', lastLoginAt: new Date(), userRoles };
        res.json({
            token: accessToken,
            refreshToken,
            user: mapUserToResponse(userForMap as any, RoleName.InternalProfessional),
        });
    } catch (error: any) {
        console.error('Google auth error:', error);
        res.status(500).json({ error: 'Erro na autenticação Google.' });
    }
});

export default router;
export { logAudit, getClientIp };
