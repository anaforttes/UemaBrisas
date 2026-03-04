import { Router, Request, Response } from 'express';
import { prisma } from '../server.js';
import { AuthRequest } from '../middleware/auth.js';
import { getParam } from '../utils/params.js';

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
router.put('/', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id, processId, title, content, status, authorId, templateId } = req.body;

        if (id) {
            // Tentar atualizar
            const existing = await prisma.document.findUnique({ where: { id } });
            if (existing) {
                // Registrar versão anterior
                try {
                    await prisma.documentVersion.create({
                        data: {
                            documentId: existing.id,
                            version: existing.currentVersion,
                            content: existing.content,
                            editedById: req.userId || null,
                        },
                    });
                } catch (versionError) {
                    console.error('DocumentVersion create error:', versionError);
                }

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

        // Criar novo — processId agora é opcional (rascunho independente)
        const newDoc = await prisma.document.create({
            data: {
                processId: processId || null,
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

// ─── GET /api/documents/:id/versions ──────────────────────────────────
router.get('/:id/versions', async (req: Request, res: Response): Promise<void> => {
    try {
        const id = getParam(req, 'id');

        const versions = await prisma.documentVersion.findMany({
            where: { documentId: id },
            orderBy: { version: 'desc' },
            include: {
                editedBy: {
                    select: { id: true, name: true, email: true },
                },
            },
        });

        const mapped = versions.map((v: any) => ({
            id: v.id,
            documentId: v.documentId,
            version: v.version,
            createdAt: v.createdAt?.toISOString?.() || v.createdAt,
            editedBy: v.editedBy
                ? {
                      id: v.editedBy.id,
                      name: v.editedBy.name,
                      email: v.editedBy.email,
                  }
                : null,
        }));

        res.json(mapped);
    } catch (error: any) {
        console.error('Document versions list error:', error);
        res.status(500).json({ error: 'Erro ao listar versões do documento.' });
    }
});

// ─── POST /api/documents/:id/signatures ───────────────────────────────
router.post('/:id/signatures', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = getParam(req, 'id');
        const { signerId, signerName, signerRole, signerEmail, signOrder } = req.body;

        if (!signerName || !signerRole || !signerEmail) {
            res.status(400).json({
                error: 'Campos obrigatórios: signerName, signerRole, signerEmail.',
            });
            return;
        }

        const signature = await prisma.documentSignature.create({
            data: {
                documentId: id,
                signerId: signerId || null,
                signerName,
                signerRole,
                signerEmail,
                signOrder: signOrder ?? 1,
            },
        });

        res.status(201).json(signature);
    } catch (error: any) {
        console.error('Create signature error:', error);
        res.status(500).json({ error: 'Erro ao criar assinatura.' });
    }
});

// ─── PATCH /api/documents/:docId/signatures/:signatureId ──────────────
router.patch('/:docId/signatures/:signatureId', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const signatureId = getParam(req, 'signatureId');
        const { status, signatureHash } = req.body;

        if (!status || !['pending', 'signed', 'rejected'].includes(status)) {
            res.status(400).json({ error: 'Status inválido para assinatura.' });
            return;
        }

        const updated = await prisma.documentSignature.update({
            where: { id: signatureId },
            data: {
                status,
                signatureHash: signatureHash || null,
                signedAt: status === 'signed' ? new Date() : null,
                ipAddress: req.ip || null,
            },
        });

        res.json(updated);
    } catch (error: any) {
        console.error('Update signature error:', error);
        res.status(500).json({ error: 'Erro ao atualizar assinatura.' });
    }
});

// ─── GET /api/documents/:id/comments ──────────────────────────────────
router.get('/:id/comments', async (req: Request, res: Response): Promise<void> => {
    try {
        const id = getParam(req, 'id');

        const comments = await prisma.documentComment.findMany({
            where: { documentId: id },
            orderBy: { createdAt: 'asc' },
        });

        res.json(
            comments.map((c: any) => ({
                id: c.id,
                documentId: c.documentId,
                authorId: c.authorId,
                authorName: c.authorName,
                text: c.text,
                resolved: c.resolved,
                createdAt: c.createdAt?.toISOString?.() || c.createdAt,
                updatedAt: c.updatedAt?.toISOString?.() || c.updatedAt,
            })),
        );
    } catch (error: any) {
        console.error('List comments error:', error);
        res.status(500).json({ error: 'Erro ao listar comentários.' });
    }
});

// ─── POST /api/documents/:id/comments ─────────────────────────────────
router.post('/:id/comments', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = getParam(req, 'id');
        const { text, authorName } = req.body;

        if (!text || !authorName) {
            res.status(400).json({ error: 'Campos obrigatórios: text, authorName.' });
            return;
        }

        const comment = await prisma.documentComment.create({
            data: {
                documentId: id,
                text,
                authorName,
                authorId: req.userId || null,
            },
        });

        res.status(201).json({
            id: comment.id,
            documentId: comment.documentId,
            authorId: comment.authorId,
            authorName: comment.authorName,
            text: comment.text,
            resolved: comment.resolved,
            createdAt: comment.createdAt?.toISOString?.() || comment.createdAt,
            updatedAt: comment.updatedAt?.toISOString?.() || comment.updatedAt,
        });
    } catch (error: any) {
        console.error('Create comment error:', error);
        res.status(500).json({ error: 'Erro ao criar comentário.' });
    }
});

export default router;
