import { createZodDto } from 'nestjs-zod';

import { GetAllInboundsStatsCommand, GetAllOutboundsStatsCommand } from '@localzet/aura-contract';

export class GetAllOutboundsStatsRequestDto extends createZodDto(
    GetAllInboundsStatsCommand.RequestSchema,
) {}

export class GetAllOutboundsStatsResponseDto extends createZodDto(
    GetAllOutboundsStatsCommand.ResponseSchema,
) {}
