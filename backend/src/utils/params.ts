import { Request } from 'express';

/** Garante que req.params retorne string (evita string | string[] do Express) */
export function getParam(req: Request, name: string): string {
    const v = req.params[name];
    return typeof v === 'string' ? v : (Array.isArray(v) ? v[0] ?? '' : '');
}
