import { PrismaClient, UserStatus, ProcessStatus, ProcessModality, DocumentStatus, SignatureStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Iniciando seed do banco de dados...');

    // 1. Roles
    const roles = [
        { name: 'Admin', description: 'Administrador do sistema — acesso total' },
        { name: 'Técnico', description: 'Engenheiro / Agrimensura — levantamento técnico' },
        { name: 'Jurídico', description: 'Procuradoria — análise jurídica e pareceres' },
        { name: 'Atendente', description: 'Assistente Social — atendimento ao cidadão' },
        { name: 'Gestor', description: 'Gestor Municipal — supervisão e aprovação' },
        { name: 'Auditor', description: 'Auditor — leitura e auditoria de processos' },
    ];

    for (const role of roles) {
        await prisma.role.upsert({
            where: { name: role.name },
            update: {},
            create: role,
        });
    }
    console.log('  ✅ Roles criadas');

    // 2. Users (senha: Admin123!)
    const passwordHash = await bcrypt.hash('Admin123!', 12);

    const usersData = [
        {
            name: 'Administrador do Sistema',
            email: 'admin@reurb.gov.br',
            passwordHash,
            avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
            status: UserStatus.Offline,
            quotaLimit: 50000,
            quotaUsed: 0,
        },
        {
            name: 'Dr. Ricardo Silva',
            email: 'ricardo.juridico@prefeitura.gov.br',
            passwordHash,
            avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ricardo',
            status: UserStatus.Offline,
            quotaLimit: 10000,
            quotaUsed: 500,
        },
        {
            name: 'Eng. Ana Paula Torres',
            email: 'ana.tecnico@prefeitura.gov.br',
            passwordHash,
            avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ana',
            status: UserStatus.Offline,
            quotaLimit: 10000,
            quotaUsed: 1200,
        },
        {
            name: 'Carlos Eduardo Mendes',
            email: 'carlos.gestor@prefeitura.gov.br',
            passwordHash,
            avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=carlos',
            status: UserStatus.Offline,
            quotaLimit: 10000,
            quotaUsed: 0,
        },
    ];

    const users: Record<string, any> = {};
    for (const userData of usersData) {
        const user = await prisma.user.upsert({
            where: { email: userData.email },
            update: {},
            create: userData,
        });
        users[userData.email] = user;
    }
    console.log('  ✅ Usuários criados');

    // 3. User Roles
    const roleAdmin = await prisma.role.findUnique({ where: { name: 'Admin' } });
    const roleTecnico = await prisma.role.findUnique({ where: { name: 'Técnico' } });
    const roleJuridico = await prisma.role.findUnique({ where: { name: 'Jurídico' } });
    const roleGestor = await prisma.role.findUnique({ where: { name: 'Gestor' } });

    const userRoleAssignments = [
        { userId: users['admin@reurb.gov.br'].id, roleId: roleAdmin!.id },
        { userId: users['ricardo.juridico@prefeitura.gov.br'].id, roleId: roleJuridico!.id },
        { userId: users['ana.tecnico@prefeitura.gov.br'].id, roleId: roleTecnico!.id },
        { userId: users['carlos.gestor@prefeitura.gov.br'].id, roleId: roleGestor!.id },
    ];

    for (const ur of userRoleAssignments) {
        await prisma.userRole.upsert({
            where: { userId_roleId: { userId: ur.userId, roleId: ur.roleId } },
            update: {},
            create: ur,
        });
    }
    console.log('  ✅ Papéis atribuídos');

    // 4. Processes
    const processesData = [
        {
            protocol: '2024.0001',
            title: 'Núcleo Habitacional Esperança',
            applicant: 'Associação de Moradores Vila Verde',
            location: 'Rua das Palmeiras, 100 - Bairro Esperança, São Luís/MA',
            modality: ProcessModality.REURB_S,
            status: ProcessStatus.Levantamento_Tecnico,
            area: '15.400 m²',
            progress: 35,
            responsibleName: 'Eng. Ana Paula Torres',
            technicianId: users['ana.tecnico@prefeitura.gov.br'].id,
            legalId: users['ricardo.juridico@prefeitura.gov.br'].id,
        },
        {
            protocol: '2024.0002',
            title: 'Loteamento Jardim Aurora',
            applicant: 'Imobiliária Horizonte Ltda',
            location: 'Av. Brasil, 2500 - Jardim Aurora, São Luís/MA',
            modality: ProcessModality.REURB_E,
            status: ProcessStatus.Analise_Juridica,
            area: '8.200 m²',
            progress: 60,
            responsibleName: 'Dr. Ricardo Silva',
            technicianId: users['ana.tecnico@prefeitura.gov.br'].id,
            legalId: users['ricardo.juridico@prefeitura.gov.br'].id,
        },
        {
            protocol: '2023.0089',
            title: 'Comunidade Santa Luzia',
            applicant: 'Secretaria de Habitação',
            location: 'Travessa Santa Luzia, s/n - Centro, Paço do Lumiar/MA',
            modality: ProcessModality.REURB_S,
            status: ProcessStatus.Finalizado,
            area: '42.000 m²',
            progress: 100,
            responsibleName: 'Carlos Eduardo Mendes',
            technicianId: users['ana.tecnico@prefeitura.gov.br'].id,
            legalId: users['ricardo.juridico@prefeitura.gov.br'].id,
        },
    ];

    const processes: Record<string, any> = {};
    for (const proc of processesData) {
        const p = await prisma.process.upsert({
            where: { protocol: proc.protocol },
            update: {},
            create: proc,
        });
        processes[proc.protocol] = p;
    }
    console.log('  ✅ Processos criados');

    // 5. Document Templates
    const templatesData = [
        { name: 'Portaria de Instauração', type: 'Administrativo', version: '2.1', contentHtml: '<h1>PORTARIA DE INSTAURAÇÃO REURB</h1><p>Considerando a Lei Federal 13.465/2017...</p>' },
        { name: 'Notificação de Confrontantes', type: 'Notificação', version: '1.5', contentHtml: '<h1>NOTIFICAÇÃO DE CONFRONTANTES</h1><p>Ficam notificados os proprietários confrontantes...</p>' },
        { name: 'Relatório Técnico Social', type: 'Técnico', version: '3.0', contentHtml: '<h1>RELATÓRIO TÉCNICO SOCIAL</h1><p>Conforme levantamento realizado em campo...</p>' },
        { name: 'Auto de Demarcação Urbanística', type: 'Técnico', version: '1.2', contentHtml: '<h1>AUTO DE DEMARCAÇÃO URBANÍSTICA</h1><p>Em conformidade com o Art. 19 da Lei 13.465/2017...</p>' },
        { name: 'Título de Legitimação Fundiária', type: 'Titularidade', version: '4.2', contentHtml: '<h1>TÍTULO DE LEGITIMAÇÃO FUNDIÁRIA</h1><p>Nos termos do Art. 23 da Lei 13.465/2017...</p>' },
    ];

    const templates: Record<string, any> = {};
    for (const tpl of templatesData) {
        // Check if template already exists by name
        let existing = await prisma.documentTemplate.findFirst({ where: { name: tpl.name } });
        if (!existing) {
            existing = await prisma.documentTemplate.create({ data: tpl });
        }
        templates[tpl.name] = existing;
    }
    console.log('  ✅ Templates criados');

    // 6. Documents
    const documentsData = [
        {
            processId: processes['2024.0001'].id,
            templateId: templates['Portaria de Instauração']?.id,
            authorId: users['ricardo.juridico@prefeitura.gov.br'].id,
            title: 'Portaria de Instauração — Núcleo Esperança',
            content: '<h1 style="text-align:center">PORTARIA DE INSTAURAÇÃO REURB</h1><p>Considerando a Lei Federal 13.465/2017 e a necessidade de regularização do Núcleo Habitacional Esperança...</p>',
            status: DocumentStatus.Draft,
            currentVersion: 1,
        },
        {
            processId: processes['2024.0002'].id,
            templateId: templates['Relatório Técnico Social']?.id,
            authorId: users['ana.tecnico@prefeitura.gov.br'].id,
            title: 'Relatório Técnico Social — Jardim Aurora',
            content: '<h1>RELATÓRIO TÉCNICO SOCIAL</h1><p>Conforme levantamento realizado no Loteamento Jardim Aurora em 15/03/2024, a área total compreende 8.200 m², com 42 famílias residentes.</p>',
            status: DocumentStatus.Review,
            currentVersion: 2,
        },
        {
            processId: processes['2023.0089'].id,
            templateId: templates['Título de Legitimação Fundiária']?.id,
            authorId: users['ricardo.juridico@prefeitura.gov.br'].id,
            title: 'Título de Legitimação Fundiária — Santa Luzia',
            content: '<h1>TÍTULO DE LEGITIMAÇÃO FUNDIÁRIA</h1><p>O presente título confere legitimação fundiária aos beneficiários da Comunidade Santa Luzia, nos termos do Art. 23 da Lei 13.465/2017.</p>',
            status: DocumentStatus.Signed,
            currentVersion: 3,
            signatureProtocol: 'REURB-2024-5482901',
            documentHash: 'A1B2C3D4E5F6A7B8',
        },
    ];

    for (const doc of documentsData) {
        await prisma.document.create({ data: doc });
    }
    console.log('  ✅ Documentos criados');

    console.log('\n🎉 Seed concluído com sucesso!');
    console.log('\n📋 Credenciais de teste:');
    console.log('   admin@reurb.gov.br / Admin123!');
    console.log('   ricardo.juridico@prefeitura.gov.br / Admin123!');
    console.log('   ana.tecnico@prefeitura.gov.br / Admin123!');
    console.log('   carlos.gestor@prefeitura.gov.br / Admin123!');
}

main()
    .catch((e) => {
        console.error('❌ Erro no seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
