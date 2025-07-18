import { ExecutionContext, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

export class JwtDefaultGuard extends AuthGuard('registeredUserJWT') {
    private readonly logger = new Logger(JwtDefaultGuard.name);

    handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
        if (info instanceof Error || err || !user) {
            const response = context.switchToHttp().getResponse();

            this.logger.debug(`${JSON.stringify(context.switchToHttp().getRequest().headers)}`);

            this.logger.error(
                `Неверный SSL_CERT или JWT! Запрос отклонён. URL: ${context.switchToHttp().getRequest().url}, IP: ${context.switchToHttp().getRequest().ip}`,
            );

            response.socket?.destroy();
            throw new UnauthorizedException('Не авторизован');
        }
        return user;
    }
}
