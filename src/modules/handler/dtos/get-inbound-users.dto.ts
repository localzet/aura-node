import { createZodDto } from 'nestjs-zod';

import { GetInboundUsersCommand } from '@localzet/aura-contract';

export class GetInboundUsersRequestDto extends createZodDto(GetInboundUsersCommand.RequestSchema) {}

export class GetInboundUsersResponseDto extends createZodDto(
    GetInboundUsersCommand.ResponseSchema,
) {}
