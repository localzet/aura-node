import { createZodDto } from 'nestjs-zod';

import { StartXrayCommand } from '@localzet/aura-contract';

export class StartXrayRequestDto extends createZodDto(StartXrayCommand.RequestSchema) {}

export class StartXrayResponseDto extends createZodDto(StartXrayCommand.ResponseSchema) {}
