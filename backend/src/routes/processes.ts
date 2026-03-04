import { Router, Request, Response } from 'express';
import { prisma } from '../server.js';
import { getParam } from '../utils/params.js';

const router = Router();

// Helper: mapeamento do status string do frontend para o enum do Prisma
const statusMap: Record<string, string> = {
    'Inicial': 'Inicial',
    'Iniciado': 'Iniciado',
    'Levantamento Técnico': 'Levantamento_Tecnico',
    'Em Análise': 'Em_Analise',
    'Análise Jurídica': 'Analise_Juridica',
    'Diligência': 'Diligencia',
    'Em Edital': 'Em_Edital',
    'Aprovado': 'Aprovado',
    'Concluído': 'Concluido',
    'Finalizado': 'Finalizado',
    'Arquivado': 'Arquivado',
};

// Helper: mapear enum Prisma de volta para string legível
const statusReverseMap: Record<string, string> = {};
for (const [key, value] of Object.entries(statusMap)) {
    statusReverseMap[value] = key;
}

function mapProcessToFrontend(p: any): any {
    return {
        id: p.id,
        protocol: p.protocol,
        title: p.title,
        applicant: p.applicant,
        location: p.location,
        modality: p.modality === 'REURB_S' ? 'REURB-S' : 'REURB-E',
        status: statusReverseMap[p.status] || p.status,
        area: p.area,
        progress: p.progress,
        responsibleName: p.responsibleName,
        technicianId: p.technicianId,
        legalId: p.legalId,
        createdAt: p.createdAt?.toISOString?.()?.split('T')[0] || p.createdAt,
        updatedAt: p.updatedAt?.toISOString?.()?.split('T')[0] || p.updatedAt,
    };
}

// ─── GET /api/processes ──────────────────────────────────────────────
router.get('/', async (_req: Request, res: Response): Promise<void> => {
    try {
        const processes = await prisma.process.findMany({
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
        });

        res.json(processes.map(mapProcessToFrontend));
    } catch (error: any) {
        console.error('List processes error:', error);
        res.status(500).json({ error: 'Erro ao listar processos.' });
    }
});

// ─── POST /api/processes ─────────────────────────────────────────────
router.post('/', async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, applicant, location, modality, area, responsibleName, technicianId, legalId } = req.body;

        // Gerar protocolo sequencial
        const year = new Date().getFullYear();
        const count = await prisma.process.count({
            where: { protocol: { startsWith: year.toString() } },
        });
        const protocol = `${year}.${String(count + 1).padStart(4, '0')}`;

        const modalityEnum = modality === 'REURB-E' ? 'REURB_E' : 'REURB_S';

        const process = await prisma.process.create({
            data: {
                protocol,
                title: title || applicant,
                applicant,
                location,
                modality: modalityEnum as any,
                status: 'Inicial',
                area: area || '0 m²',
                progress: 10,
                responsibleName: responsibleName || 'Não atribuído',
                technicianId: technicianId || null,
                legalId: legalId || null,
            },
        });

        res.status(201).json(mapProcessToFrontend(process));
    } catch (error: any) {
        console.error('Create process error:', error);
        res.status(500).json({ error: 'Erro ao criar processo.' });
    }
});

// ─── PATCH /api/processes/:id/status ─────────────────────────────────
router.patch('/:id/status', async (req: Request, res: Response): Promise<void> => {
    try {
        const id = getParam(req, 'id');
        const { status } = req.body;

        const prismaStatus = statusMap[status] || status;

        const process = await prisma.process.update({
            where: { id },
            data: {
                status: prismaStatus as any,
            },
        });

        res.json(mapProcessToFrontend(process));
    } catch (error: any) {
        console.error('Update process status error:', error);
        res.status(500).json({ error: 'Erro ao atualizar status.' });
    }
});

export default router;
