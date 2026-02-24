import { Router, Request, Response } from 'express';
import { prisma } from '../server.js';

const router = Router();

function mapDocToFrontend(d: any): any {
    return {
        id: d.id,
        processId: d.processId,
        title: d.title,
        content: d.content,
        status: d.status,
        authorId: d.authorId,
        version: d.currentVersion,
        updatedAt: d.updatedAt?.toISOString?.() || d.updatedAt,
    };
}

// ─── GET /api/documents?processId=xxx ────────────────────────────────
router.get('/', async (req: Request, res: Response): Promise<void> => {
    try {
        const { processId } = req.query;

        const where: any = { deletedAt: null };
        if (processId) where.processId = processId as string;

        const docs = await prisma.document.findMany({
            where,
            orderBy: { updatedAt: 'desc' },
        });

        res.json(docs.map(mapDocToFrontend));
    } catch (error: any) {
        console.error('List documents error:', error);
        res.status(500).json({ error: 'Erro ao listar documentos.' });
    }
});

// ─── PUT /api/documents (upsert) ─────────────────────────────────────
router.put('/', async (req: Request, res: Response): Promise<void> => {
    try {
        const { id, processId, title, content, status, authorId, templateId } = req.body;

        if (id) {
            // Tentar atualizar
            const existing = await prisma.document.findUnique({ where: { id } });
            if (existing) {
                const updated = await prisma.document.update({
                    where: { id },
                    data: {
                        title: title || existing.title,
                        content: content !== undefined ? content : existing.content,
                        status: (status as any) || existing.status,
                        currentVersion: { increment: 1 },
                    },
                });
                res.json(mapDocToFrontend(updated));
                return;
            }
        }

        // Criar novo
        if (!processId) {
            res.status(400).json({ error: 'processId é obrigatório para criar documento.' });
            return;
        }

        const newDoc = await prisma.document.create({
            data: {
                processId,
                title: title || 'Documento sem título',
                content: content || '',
                status: (status as any) || 'Draft',
                authorId: authorId || null,
                templateId: templateId || null,
                currentVersion: 1,
            },
        });

        res.status(201).json(mapDocToFrontend(newDoc));
    } catch (error: any) {
        console.error('Upsert document error:', error);
        res.status(500).json({ error: 'Erro ao salvar documento.' });
    }
});

export default router;
