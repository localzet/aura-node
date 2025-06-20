import { createZodDto } from 'nestjs-zod';

import { GetStatusAndVersionCommand } from '@localzet/aura-contract';

export class GetXrayStatusAndVersionResponseDto extends createZodDto(
    GetStatusAndVersionCommand.ResponseSchema,
) {}
