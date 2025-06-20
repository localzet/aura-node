import { createZodDto } from 'nestjs-zod';

import { GetNodeHealthCheckCommand } from '@localzet/aura-contract';

export class GetNodeHealthCheckResponseDto extends createZodDto(
    GetNodeHealthCheckCommand.ResponseSchema,
) {}
