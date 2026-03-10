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

// ─── Definição das 14 etapas oficiais do REURB ─────────────────────
const REURB_STEPS = [
    { stepNumber: 1,  name: 'Requerimento Inicial',               axis: 'Geral' },
    { stepNumber: 2,  name: 'Processamento Administrativo',       axis: 'Geral' },
    { stepNumber: 3,  name: 'Notificação de Confrontantes',       axis: 'Jurídico' },
    { stepNumber: 4,  name: 'Levantamento Topográfico',           axis: 'Técnico' },
    { stepNumber: 5,  name: 'Plano de Regularização',             axis: 'Técnico' },
    { stepNumber: 6,  name: 'Estudo Técnico Ambiental',           axis: 'Técnico' },
    { stepNumber: 7,  name: 'Projeto de Urbanização',             axis: 'Técnico' },
    { stepNumber: 8,  name: 'Estudo Técnico Social',              axis: 'Técnico / Social' },
    { stepNumber: 9,  name: 'Análise e Saneamento de Dúvidas',    axis: 'Jurídico' },
    { stepNumber: 10, name: 'Decisão Administrativa',             axis: 'Jurídico' },
    { stepNumber: 11, name: 'Expedição da CRF',                   axis: 'Cartorial' },
    { stepNumber: 12, name: 'Registro Cartorial',                 axis: 'Cartorial' },
    { stepNumber: 13, name: 'Titulação dos Beneficiários',        axis: 'Cartorial' },
    { stepNumber: 14, name: 'Conclusão e Arquivamento',           axis: 'Geral' },
];

function mapStepToFrontend(s: any): any {
    return {
        id: s.id,
        stepNumber: s.stepNumber,
        name: s.name,
        axis: s.axis,
        status: s.status,
        responsible: s.responsible ? { id: s.responsible.id, name: s.responsible.name, avatarUrl: s.responsible.avatarUrl } : null,
        notes: s.notes,
        startedAt: s.startedAt?.toISOString?.() || s.startedAt,
        concludedAt: s.concludedAt?.toISOString?.() || s.concludedAt,
    };
}

// ─── GET /api/processes/:id/steps ────────────────────────────────────
router.get('/:id/steps', async (req: Request, res: Response): Promise<void> => {
    try {
        const processId = getParam(req, 'id');
        const steps = await prisma.processStep.findMany({
            where: { processId },
            orderBy: { stepNumber: 'asc' },
            include: { responsible: true },
        });
        res.json(steps.map(mapStepToFrontend));
    } catch (error: any) {
        console.error('Get steps error:', error);
        res.status(500).json({ error: 'Erro ao listar etapas.' });
    }
});

// ─── POST /api/processes/:id/steps/init ──────────────────────────────
router.post('/:id/steps/init', async (req: Request, res: Response): Promise<void> => {
    try {
        const processId = getParam(req, 'id');

        // Verifica se já existem etapas
        const existing = await prisma.processStep.count({ where: { processId } });
        if (existing > 0) {
            const steps = await prisma.processStep.findMany({
                where: { processId },
                orderBy: { stepNumber: 'asc' },
                include: { responsible: true },
            });
            res.json(steps.map(mapStepToFrontend));
            return;
        }

        // Cria as 14 etapas
        await prisma.processStep.createMany({
            data: REURB_STEPS.map(s => ({
                processId,
                stepNumber: s.stepNumber,
                name: s.name,
                axis: s.axis,
                status: 'pendente' as any,
            })),
        });

        const steps = await prisma.processStep.findMany({
            where: { processId },
            orderBy: { stepNumber: 'asc' },
            include: { responsible: true },
        });

        res.status(201).json(steps.map(mapStepToFrontend));
    } catch (error: any) {
        console.error('Init steps error:', error);
        res.status(500).json({ error: 'Erro ao inicializar etapas.' });
    }
});

// ─── PATCH /api/processes/:id/steps/:stepId ──────────────────────────
router.patch('/:id/steps/:stepId', async (req: Request, res: Response): Promise<void> => {
    try {
        const stepId = getParam(req, 'stepId');
        const { status, notes, responsibleId } = req.body;

        const data: any = {};
        if (status) data.status = status;
        if (notes !== undefined) data.notes = notes;
        if (responsibleId !== undefined) data.responsibleId = responsibleId;

        // Atualizar datas automaticamente
        if (status === 'em_andamento') data.startedAt = new Date();
        if (status === 'concluida') data.concludedAt = new Date();

        const step = await prisma.processStep.update({
            where: { id: stepId },
            data,
            include: { responsible: true },
        });

        res.json(mapStepToFrontend(step));
    } catch (error: any) {
        console.error('Update step error:', error);
        res.status(500).json({ error: 'Erro ao atualizar etapa.' });
    }
});

export default router;
