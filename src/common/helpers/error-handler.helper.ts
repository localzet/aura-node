import { InternalServerErrorException } from '@nestjs/common';

import { ERRORS } from '@localzet/aura-contract';

import { HttpExceptionWithErrorCodeType } from '../exception/http-exeception-with-error-code.type';
import { ICommandResponse } from '../types/command-response.type';

export function errorHandler<T>(response: ICommandResponse<T>): T {
    if (response.isOk) {
        if (!response.response) {
            throw new InternalServerErrorException('Данные не были возвращены');
        }
        return response.response;
    } else {
        if (!response.code) {
            throw new InternalServerErrorException('Неизвестная ошибка');
        }
        const errorObject = Object.values(ERRORS).find((error) => error.code === response.code);

        if (!errorObject) {
            throw new InternalServerErrorException('Неизвестная ошибка');
        }
        throw new HttpExceptionWithErrorCodeType(
            errorObject.message,
            errorObject.code,
            errorObject.httpCode,
        );
    }
}
