import { createZodDto } from 'nestjs-zod';

import { GetUserOnlineStatusCommand } from '@localzet/aura-contract';

export class GetUserOnlineStatusRequestDto extends createZodDto(
    GetUserOnlineStatusCommand.RequestSchema,
) {}

export class GetUserOnlineStatusResponseDto extends createZodDto(
    GetUserOnlineStatusCommand.ResponseSchema,
) {}
