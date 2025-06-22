import { createZodDto } from 'nestjs-zod';

import { AddUserCommand } from '@localzet/aura-contract';

export class AddUserRequestDto extends createZodDto(AddUserCommand.RequestSchema) {}

export class AddUserResponseDto extends createZodDto(AddUserCommand.ResponseSchema) {}
