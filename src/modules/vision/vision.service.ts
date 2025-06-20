import objectHash from 'object-hash';

import { Injectable, Logger } from '@nestjs/common';

import { InjectXtls } from '@localzet/xtls-sdk-nestjs';
import { XtlsApi } from '@localzet/xtls-sdk';

import { ICommandResponse } from '@common/types/command-response.type';
import { ERRORS } from '@localzet/aura-contract';

import { BlockIpResponseModel, UnblockIpResponseModel } from './models';
import { BlockIpRequestDto, UnblockIpRequestDto } from './dtos';

@Injectable()
export class VisionService {
    private readonly logger = new Logger(VisionService.name);

    constructor(@InjectXtls() private readonly xtlsApi: XtlsApi) {}

    public async blockIp(dto: BlockIpRequestDto): Promise<ICommandResponse<BlockIpResponseModel>> {
        try {
            const { ip } = dto;

            const ipHash = this.getIpHash(ip);

            const res = await this.xtlsApi.router.addSrcIpRule({
                ruleTag: ipHash,
                outbound: 'BLOCK',
                append: true,
                ip: ip,
            });

            this.logger.log(res);

            if (!res.isOk) {
                throw new Error(res.message);
            }

            return {
                isOk: true,
                response: new BlockIpResponseModel(true, null),
            };
        } catch (error) {
            this.logger.error(error);
            let message = '';
            if (error instanceof Error) {
                message = error.message;
            }
            return {
                isOk: false,
                code: ERRORS.INTERNAL_SERVER_ERROR.code,
                response: new BlockIpResponseModel(false, message),
            };
        }
    }

    public async unblockIp(
        dto: UnblockIpRequestDto,
    ): Promise<ICommandResponse<UnblockIpResponseModel>> {
        try {
            const { ip } = dto;

            const ipHash = this.getIpHash(ip);

            const res = await this.xtlsApi.router.removeRuleByRuleTag({
                ruleTag: ipHash,
            });

            this.logger.log(res);

            if (!res.isOk) {
                throw new Error(res.message);
            }

            return {
                isOk: true,
                response: new UnblockIpResponseModel(true, null),
            };
        } catch (error) {
            this.logger.error(error);
            let message = '';
            if (error instanceof Error) {
                message = error.message;
            }
            return {
                isOk: false,
                code: ERRORS.INTERNAL_SERVER_ERROR.code,
                response: new UnblockIpResponseModel(false, message),
            };
        }
    }

    private getIpHash(ip: string): string {
        return objectHash(ip, { algorithm: 'md5', encoding: 'hex' });
    }
}
