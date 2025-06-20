import { createZodDto } from 'nestjs-zod';

import { RemoveUserCommand } from '@localzet/aura-contract';

export class RemoveUserRequestDto extends createZodDto(RemoveUserCommand.RequestSchema) {}
export class RemoveUserResponseDto extends createZodDto(RemoveUserCommand.ResponseSchema) {}
