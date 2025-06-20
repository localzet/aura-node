import { createZodDto } from 'nestjs-zod';

import { GetSystemStatsCommand } from '@localzet/aura-contract';

export class GetSystemStatsResponseDto extends createZodDto(GetSystemStatsCommand.ResponseSchema) {}
