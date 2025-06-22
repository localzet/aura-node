import { Injectable, Logger } from '@nestjs/common';

import { RemoveUserResponseModel as RemoveUserResponseModelFromSdk } from '@localzet/xtls-sdk/build/src/handler/models/remove-user';
import { AddUserResponseModel as AddUserResponseModelFromSdk } from '@localzet/xtls-sdk/build/src/handler/models/add-user';
import { ISdkResponse } from '@localzet/xtls-sdk/build/src/common/types';
import { InjectXtls } from '@localzet/xtls-sdk-nestjs';
import { XtlsApi } from '@localzet/xtls-sdk';

import { ICommandResponse } from '@common/types/command-response.type';
import { ERRORS } from '@localzet/aura-contract';

import { AddUserResponseModel, RemoveUserResponseModel } from './models';
import { GetInboundUsersCountResponseModel } from './models';
import { GetInboundUsersResponseModel } from './models';
import { XrayService } from '../xray-core/xray.service';
import { IRemoveUserRequest } from './interfaces';
import { TAddUserRequest } from './interfaces';

@Injectable()
export class HandlerService {
    private readonly logger = new Logger(HandlerService.name);

    constructor(
        @InjectXtls() private readonly xtlsApi: XtlsApi,
        private readonly xrayService: XrayService,
    ) {}

    public async addUser(data: TAddUserRequest): Promise<ICommandResponse<AddUserResponseModel>> {
        try {
            const { data: requestData } = data;
            const response: Array<ISdkResponse<AddUserResponseModelFromSdk>> = [];

            const inboundsTags = this.xrayService.getSavedInboundsTags();

            for (const tag of inboundsTags) {
                this.logger.debug(`Удаление пользователя: ${requestData[0].username} из тега: ${tag}`);
                await this.xtlsApi.handler.removeUser(tag, requestData[0].username);
            }

            for (const item of requestData) {
                let tempRes = null;

                this.logger.debug(`Добавление пользователя: ${item.username} с типом: ${item.type}`);

                switch (item.type) {
                    case 'trojan':
                        tempRes = await this.xtlsApi.handler.addTrojanUser({
                            tag: item.tag,
                            username: item.username,
                            password: item.password,
                            level: item.level,
                        });
                        response.push(tempRes);
                        break;
                    case 'vless':
                        tempRes = await this.xtlsApi.handler.addVlessUser({
                            tag: item.tag,
                            username: item.username,
                            uuid: item.uuid,
                            flow: item.flow,
                            level: item.level,
                        });
                        response.push(tempRes);
                        break;
                    case 'shadowsocks':
                        tempRes = await this.xtlsApi.handler.addShadowsocksUser({
                            tag: item.tag,
                            username: item.username,
                            password: item.password,
                            cipherType: item.cipherType,
                            ivCheck: item.ivCheck,
                            level: item.level,
                        });
                        response.push(tempRes);
                        break;
                }
            }

            if (response.every((res) => !res.isOk)) {
                this.logger.error('Ошибка при добавлении пользователей: ' + JSON.stringify(response, null, 2));
                return {
                    isOk: true,
                    response: new AddUserResponseModel(
                        false,
                        response.find((res) => !res.isOk)?.message ?? null,
                    ),
                };
            }

            return {
                isOk: true,
                response: new AddUserResponseModel(true, null),
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
                response: new AddUserResponseModel(false, message),
            };
        }
    }

    public async getInboundUsers(
        tag: string,
    ): Promise<ICommandResponse<GetInboundUsersResponseModel>> {
        try {
            // TODO: добавить более подходящий способ возврата пользователей (trojan, vless и др.)
            const response = await this.xtlsApi.handler.getInboundUsers(tag);

            if (!response.isOk || !response.data) {
                return {
                    isOk: false,
                    code: ERRORS.FAILED_TO_GET_INBOUND_USERS.code,
                    response: new GetInboundUsersResponseModel([]),
                };
            }

            return {
                isOk: true,
                response: new GetInboundUsersResponseModel(response.data.users),
            };
        } catch (error) {
            this.logger.error(error);
            return {
                isOk: false,
                code: ERRORS.FAILED_TO_GET_INBOUND_USERS.code,
                response: new GetInboundUsersResponseModel([]),
            };
        }
    }

    public async removeUser(
        data: IRemoveUserRequest,
    ): Promise<ICommandResponse<RemoveUserResponseModel>> {
        try {
            const { username } = data;
            const response: Array<ISdkResponse<RemoveUserResponseModelFromSdk>> = [];

            const inboundsTags = this.xrayService.getSavedInboundsTags();

            for (const tag of inboundsTags) {
                const tempRes = await this.xtlsApi.handler.removeUser(tag, username);
                response.push(tempRes);
            }

            if (response.every((res) => !res.isOk)) {
                this.logger.error(JSON.stringify(response, null, 2));
                return {
                    isOk: true,
                    response: new RemoveUserResponseModel(
                        false,
                        response.find((res) => !res.isOk)?.message ?? null,
                    ),
                };
            }

            return {
                isOk: true,
                response: new RemoveUserResponseModel(true, null),
            };
        } catch (error: unknown) {
            this.logger.error(error);
            let message = '';
            if (error instanceof Error) {
                message = error.message;
            }
            return {
                isOk: false,
                code: ERRORS.INTERNAL_SERVER_ERROR.code,
                response: new RemoveUserResponseModel(false, message),
            };
        }
    }

    public async getInboundUsersCount(
        tag: string,
    ): Promise<ICommandResponse<GetInboundUsersCountResponseModel>> {
        try {
            const response = await this.xtlsApi.handler.getInboundUsersCount(tag);

            if (!response.isOk || !response.data) {
                return {
                    isOk: false,
                    code: ERRORS.FAILED_TO_GET_INBOUND_USERS.code,
                    response: new GetInboundUsersCountResponseModel(0),
                };
            }

            return {
                isOk: true,
                response: new GetInboundUsersCountResponseModel(response.data),
            };
        } catch (error) {
            this.logger.error(error);
            return {
                isOk: false,
                code: ERRORS.FAILED_TO_GET_INBOUND_USERS.code,
                response: new GetInboundUsersCountResponseModel(0),
            };
        }
    }
}
