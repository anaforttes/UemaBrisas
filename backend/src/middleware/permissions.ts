import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from './auth.js';
import { prisma } from '../server.js';

export function requireAnyRole(roles: string[]) {
    return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Token não fornecido.' });
            return;
        }

        const token = authHeader.split(' ')[1];
        let userId: string;
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as { userId: string };
            userId = decoded.userId;
            req.userId = userId;
        } catch {
            res.status(401).json({ error: 'Token inválido ou expirado.' });
            return;
        }

        // Se não há roles exigidas, basta estar autenticado
        if (!roles || roles.length === 0) { next(); return; }

        const userRoles = await prisma.userRole.findMany({
            where: { userId },
            include: { role: true },
        });

        const userRoleNames = userRoles.map((ur) => ur.role.name);
        const hasRole = roles.some((r) => userRoleNames.includes(r));

        if (!hasRole) {
            res.status(403).json({ error: 'Permissão insuficiente.' });
            return;
        }

        next();
    };
}
