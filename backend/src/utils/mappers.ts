export function mapUserToResponse(user: any, fallbackRole?: string): any {
    const roleNames: string[] = user.userRoles?.map((ur: any) => ur.role?.name).filter(Boolean) || [];
    const roleName = roleNames[0] || fallbackRole || 'Atendente';

    return {
        id:         user.id,
        name:       user.name,
        email:      user.email,
        role:       roleName,
        roles:      roleNames,
        avatar:     user.avatarUrl,
        status:     user.status || 'Online',
        lastLogin:  user.lastLoginAt?.toISOString?.() || new Date().toISOString(),
        professionalType: user.professionalType || null,
        allowedSteps:     user.allowedSteps     || [],
        quota: {
            limit:   user.quotaLimit  ?? 10000,
            used:    user.quotaUsed   ?? 0,
            resetAt: user.quotaResetAt?.toISOString?.() || new Date(Date.now() + 86400000).toISOString(),
        },
    };
}
