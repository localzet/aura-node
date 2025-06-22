import { createZodDto } from 'nestjs-zod';

import { GetAllInboundsStatsCommand } from '@localzet/aura-contract';

export class GetAllInboundsStatsRequestDto extends createZodDto(
    GetAllInboundsStatsCommand.RequestSchema,
) {}

export class GetAllInboundsStatsResponseDto extends createZodDto(
    GetAllInboundsStatsCommand.ResponseSchema,
) {}
