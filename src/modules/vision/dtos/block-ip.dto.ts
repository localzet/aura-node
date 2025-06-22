import { createZodDto } from 'nestjs-zod';

import { BlockIpCommand } from '@localzet/aura-contract';

export class BlockIpRequestDto extends createZodDto(BlockIpCommand.RequestSchema) {}

export class BlockIpResponseDto extends createZodDto(BlockIpCommand.ResponseSchema) {}
