import { createZodDto } from 'nestjs-zod';

import { UnblockIpCommand } from '@localzet/aura-contract';

export class UnblockIpRequestDto extends createZodDto(UnblockIpCommand.RequestSchema) {}

export class UnblockIpResponseDto extends createZodDto(UnblockIpCommand.ResponseSchema) {}
