import { createZodDto } from 'nestjs-zod';

import { GetOutboundStatsCommand } from '@localzet/aura-contract';

export class GetOutboundStatsRequestDto extends createZodDto(
    GetOutboundStatsCommand.RequestSchema,
) {}

export class GetOutboundStatsResponseDto extends createZodDto(
    GetOutboundStatsCommand.ResponseSchema,
) {}
