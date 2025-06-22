import { z } from 'zod';

export function validateEnvConfig<T>(schema: z.ZodType, config: Record<string, unknown>): T {
    try {
        return schema.parse(config);
    } catch (e) {
        throw new Error(`Ошибка валидации конфигурации .env: ${e}`);
    }
}
