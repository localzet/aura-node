import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { parseNodePayloadFromConfigService } from '@common/utils/decode-node-payload';

export const configSchema = z
    .object({
        APP_PORT: z
            .string()
            .default('3000')
            .transform((port) => parseInt(port, 10)),
        SSL_CERT: z.string(),
        XTLS_IP: z.string().default('127.0.0.1'),
        JWT_PUBLIC_KEY: z.string().optional(),
        XTLS_PORT: z.string().default('61000'),
        CONFIG_EQUAL_CHECKING: z
            .string()
            .default('true')
            .transform((val) => val === 'true'),
    })
    .superRefine((data, ctx) => {
        if (data.SSL_CERT) {
            try {
                const parsed = parseNodePayloadFromConfigService(data.SSL_CERT);
                data.JWT_PUBLIC_KEY = parsed.jwtPublicKey;
            } catch {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Недопустимое содержимое SSL-сертификата',
                });
            }
        }
    });

export type ConfigSchema = z.infer<typeof configSchema>;

export class Env extends createZodDto(configSchema) {}
