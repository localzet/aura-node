import { createZodDto } from 'nestjs-zod';

import { GetUsersStatsCommand } from '@localzet/aura-contract';

export class GetUsersStatsRequestDto extends createZodDto(GetUsersStatsCommand.RequestSchema) {}

export class GetUsersStatsResponseDto extends createZodDto(GetUsersStatsCommand.ResponseSchema) {}
