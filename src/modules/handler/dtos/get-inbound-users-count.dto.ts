import { createZodDto } from 'nestjs-zod';

import { GetInboundUsersCountCommand } from '@localzet/aura-contract';

export class GetInboundUsersCountRequestDto extends createZodDto(
    GetInboundUsersCountCommand.RequestSchema,
) {}
export class GetInboundUsersCountResponseDto extends createZodDto(
    GetInboundUsersCountCommand.ResponseSchema,
) {}
