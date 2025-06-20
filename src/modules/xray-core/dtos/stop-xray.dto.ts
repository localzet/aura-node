import { createZodDto } from 'nestjs-zod';

import { StopXrayCommand } from '@localzet/aura-contract';

export class StopXrayResponseDto extends createZodDto(StopXrayCommand.ResponseSchema) {}
