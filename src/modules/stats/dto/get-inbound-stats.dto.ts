import { createZodDto } from 'nestjs-zod';

import { GetInboundStatsCommand } from '@localzet/aura-contract';

export class GetInboundStatsRequestDto extends createZodDto(GetInboundStatsCommand.RequestSchema) {}

export class GetInboundStatsResponseDto extends createZodDto(
    GetInboundStatsCommand.ResponseSchema,
) {}
