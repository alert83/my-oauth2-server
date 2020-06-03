import {DeviceErrorTypes, SchemaConnector, StateUpdateRequest} from "st-schema";
import {provideIf} from "./ioc/ioc";
import {TYPE} from "./ioc/const";
import {inject} from "inversify";
import {Express} from "express";
import {MongoService} from "./mongoService";
import {OAuth2Model} from "./OAuth2Model";
import {Token} from "oauth2-server";
import groupBy from "lodash/groupBy";
import Bluebird from "bluebird";
import {fromPairs, merge} from "lodash";
import {compact} from "./utils";
import moment from "moment";
import got from "got";
import * as Sentry from '@sentry/node';
//

interface ICallbackAuthentication {
    tokenType: string;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    expiresAt?: Date;
}

interface ICallbackUrls {
    oauthToken: string;
    stateCallback: string;
}

export interface IDeviceState {
    component: string;
    capability: string;
    attribute: string;
    value: string | number;
    unit?: string | null;
    data?: any | null;
    timestamp?: number;
    cdate?: Date;
}

export interface IDevice {
    externalDeviceId: string;
    friendlyName: string;
    deviceHandlerType: string;
    manufacturerInfo: { manufacturerName: string, modelName: string };
    status: string;
    states: IDeviceState[];
}

@provideIf(TYPE.StConnector, true)
export class StConnector {
    public connector: any;

    stateFields = [
        'component',
        'capability',
        'attribute',
        'value',
        'unit',
        'data',
        'timestamp',
    ];

    constructor(
        @inject(TYPE.Application) private readonly app: Express,
        @inject(TYPE.MongoDBClient) private readonly client: MongoService,
        @inject(TYPE.OAuth2Model) private readonly model: OAuth2Model,
    ) {
        this.connector = new SchemaConnector()
            .clientId(process.env.ST_CLIENT_ID)
            .clientSecret(process.env.ST_CLIENT_SECRET)

            /**
             * Discovery request. Respond with a list of devices. Called after installation of the
             * connector and every six hours after that.
             * @accessToken External cloud access token
             * @response {DiscoveryResponse} Discovery response object
             */
            .discoveryHandler(async (
                accessToken: string,
                response,
                data: {
                    headers: { schema, version, interactionType, requestId },
                    authentication: { tokenType, token },
                }) => {
                console.log('from smartthings', 'discoveryHandler =>', accessToken, data);

                const devices: IDevice[] = await this.client.withClient(async (db) => {
                    const collection = db.collection<IDevice>('my-devices');
                    return collection.find().toArray();
                });

                devices.forEach((d) => {
                    console.log('device:', d.friendlyName);

                    response.addDevice(d.externalDeviceId, d.friendlyName, d.deviceHandlerType)
                        .manufacturerName(d?.manufacturerInfo?.manufacturerName)
                        .modelName(d?.manufacturerInfo?.modelName);
                });
            })

            /**
             * State refresh request. Respond with the current states of all devices. Called after
             * device discovery runs.
             * @accessToken External cloud access token
             * @response {StateRefreshResponse} StateRefresh response object
             */
            .stateRefreshHandler(async (
                accessToken: string,
                response,
                data: {
                    headers: { schema, version, interactionType, requestId },
                    authentication: { tokenType, token },
                    devices: { externalDeviceId }[],
                }) => {
                console.log('from smartthings', 'stateRefreshHandler =>', accessToken, data);

                const ids = data.devices ? data.devices.map((d) => d.externalDeviceId) : undefined;
                const devices: IDevice[] = await this.client.withClient(async (db) => {
                    const collection = db.collection<IDevice>('my-devices');
                    return collection.find(ids ? {externalDeviceId: {$in: ids}} : {}).toArray();
                    // return collection.find().toArray();
                });

                devices.forEach((d) => {
                    console.log('device:', d.friendlyName);

                    const device = response.addDevice(d.externalDeviceId);
                    const byCmp = groupBy(d.states, (s) => s.component);

                    Object.entries(byCmp).forEach(([cmp, states]) => {
                        const component = device.addComponent(cmp);
                        states.forEach((s) => {
                            s = compact(s);
                            component.addState(
                                s.capability,
                                s.attribute,
                                s.value ?? undefined,
                                s.unit ?? undefined,
                                s.data ?? undefined,
                            );
                        });
                    })
                });
            })

            /**
             * Device command request. Control the devices and respond with new device states
             * @accessToken External cloud access token
             * @response {CommandResponse} CommandResponse response object
             * @devices {array} List of ST device commands
             */
            .commandHandler(async (
                accessToken: string,
                response,
                devices: {
                    externalDeviceId,
                    commands: { component, capability, command, arguments: any[] }[],
                }[],
                data,
            ) => {
                console.log('from smartthings', 'commandHandler =>', accessToken, devices, data);

                await Bluebird.each(devices, async (device) => {
                    const deviceResponse = response.addDevice(device.externalDeviceId);

                    await Bluebird.each(device.commands, async (cmd) => {
                        let state = this.commandToState(cmd);

                        if (state) {
                            state = compact(await this.updateMyState(device.externalDeviceId, state) ?? state);
                            if (state) {
                                deviceResponse.addState(
                                    fromPairs(
                                        this.stateFields.map((k) => [k, (state as any)[k]])
                                    )
                                );
                            }
                        } else {
                            deviceResponse.setError(
                                `Command '${cmd.command} of capability '${cmd.capability}' not supported`,
                                DeviceErrorTypes.CAPABILITY_NOT_SUPPORTED)
                        }
                    });
                });

                const redis = this.app.get('redis');
                await got.post(await redis.get("ngrok") ?? '', {
                    username: process.env.NGROK_USER,
                    password: process.env.NGROK_PASS,
                    json: devices,
                }).catch((err) => {
                    Sentry.captureException(err);
                });
            })

            /**
             * Create access and refresh tokens to allow SmartThings to be informed of device state
             * changes as they happen.
             * @accessToken External cloud access token
             * @callbackAuthentication ST access and refresh tokens for proactive state callbacks
             * @callbackUrls Callback and refresh token URLs
             */
            .callbackAccessHandler(async (
                accessToken: string,
                callbackAuthentication: ICallbackAuthentication,
                callbackUrls: ICallbackUrls,
                data: {
                    headers: { schema, version, interactionType, requestId },
                    authentication: { tokenType, token },
                    callbackAuthentication: { grantType, scope, code, clientId },
                    callbackUrls: { oauthToken, stateCallback },
                }) => {
                console.log('from smartthings', 'callbackAccessHandler =>', accessToken, data);

                await this.client.withClient(async (db) => {
                    const collection = db.collection('CallbackAccessTokens');
                    const token = await this.model.getAccessToken(accessToken) as Token;

                    await collection.findOneAndReplace({
                        accessToken,
                    }, {
                        accessToken,
                        callbackAuthentication: {
                            ...callbackAuthentication,
                            expiresAt: moment().add(callbackAuthentication.expiresIn, "seconds").toDate(),
                        },
                        callbackUrls,
                        clientId: token?.client?._id,
                        userId: token?.user?._id,
                        username: token?.user?.username,
                        ctime: new Date(),
                    }, {upsert: true});
                });
            })

            /**
             * Called when the connector is removed from SmartThings. You may want clean up access
             * tokens and other data when that happend.
             * @accessToken External cloud access token
             */
            .integrationDeletedHandler(async (
                accessToken: string,
                data: {
                    headers: { schema, version, interactionType, requestId },
                    authentication: { tokenType, token },
                    callbackAuthentication: { accessToken, refreshToken },
                }) => {
                console.log('from smartthings', 'integrationDeletedHandler =>', accessToken, data);

                await this.client.withClient(async (db) => {
                    const collection1 = db.collection('my-oauth2-tokens');
                    await collection1.deleteMany({accessToken});

                    const collection2 = db.collection('CallbackAccessTokens');
                    await collection2.deleteMany({'callbackAuthentication.accessToken': data.callbackAuthentication.accessToken});
                });
            })
    }

    async updateMyState(externalDeviceId, state: IDeviceState) {
        const myDevice: IDevice = await this.client.withClient(async (db) => {
            const collection = db.collection<IDevice>('my-devices');
            return await collection.findOne({externalDeviceId});
        });

        const curState = (myDevice?.states ?? []).find((s) =>
            s.capability === state.capability &&
            s.attribute === state.attribute
        );

        // if (!curState || (
        //     curState.value !== state.value ||
        //     curState.unit !== state.unit ||
        //     curState.data !== state.data
        // )) {
        const newState: IDeviceState = compact(merge({}, curState, state));

        const idx = myDevice.states.findIndex((s) =>
            state.capability === s.capability && state.attribute === s.attribute)

        if (idx >= 0) myDevice.states.splice(idx, 1, newState);
        else myDevice.states.push(newState);

        await this.client.withClient(async (db) => {
            const collection = db.collection<IDevice>('my-devices');
            await collection.updateOne({externalDeviceId}, {$set: {"states": myDevice.states}});
        });

        return newState;
        // }
    }

    commandToState(cmd: { component, capability, command, arguments: any[] }) {
        const state: IDeviceState = {
            component: cmd.component,
            capability: cmd.capability,
            attribute: '',
            value: '',
        };

        switch (cmd.capability) {
            case 'st.switch': {
                state.attribute = 'switch';
                state.value = cmd.command;
                break;
            }
            case 'st.alarm': {
                state.attribute = 'alarm';
                state.value = cmd.command;
                break;
            }
            default: {
                return;
            }
        }

        return compact(state);

        // if (cmd.capability === 'st.switchLevel' && cmd.command === 'setLevel') {
        //     state.attribute = 'level';
        //     state.value =
        //         // this.deviceStates[device.externalDeviceId].level =
        //         cmd.arguments[0];
        //     deviceResponse.addState(state);
        //
    }

    /**
     *
     * @param devices
     */
    async setStates(devices: any[]) {
        const deviceStates: { externalDeviceId, states: IDeviceState[] }[] =
            await Bluebird.mapSeries(devices, async (d) => {
                const externalDeviceId: string = d.deviceId;
                let states: IDeviceState[] = d.states;
                states = await Bluebird.mapSeries(states, async (s) => {
                    let value = s.value;
                    value = !isNaN(Number(value)) ? Number(value) : value;

                    const state: IDeviceState = compact({
                        component: 'main',
                        capability: s.capability,
                        attribute: s.attribute,
                        value,
                        unit: s.unit ?? null,
                        data: s.data ?? null,
                        timestamp: new Date().getTime(),
                    });
                    return compact(
                        fromPairs(
                            Object.entries(await this.updateMyState(externalDeviceId, state) ?? state)
                                .filter(([k, v]) => this.stateFields.includes(k))
                        ) as IDeviceState
                    );
                })

                return {externalDeviceId, states};
            });

        // console.log(deviceState);

        const tokens = await this.client.withClient(async (db) => {
            const collection = db.collection('CallbackAccessTokens');
            return await collection
                // .find({"callbackAuthentication.expiresAt": {$gte: new Date()}})
                .find()
                .sort({_id: -1})
                .toArray();
        });

        await Promise.all(
            tokens.map(async (token) => {
                const stateUpdateRequest = new StateUpdateRequest(
                    process.env.ST_CLIENT_ID,
                    process.env.ST_CLIENT_SECRET,
                );

                // console.log('updateState', token.accessToken);
                // console.dir(deviceStates, {depth: 10});

                await stateUpdateRequest.updateState(
                    token.callbackUrls,
                    token.callbackAuthentication,
                    deviceStates,
                    async (callbackAuthentication) => {
                        console.log('refreshedCallback');

                        const accessToken = token.accessToken
                        await this.client.withClient(async (db) => {
                            const collection = db.collection('CallbackAccessTokens');

                            await collection.findOneAndUpdate({
                                accessToken,
                            }, {
                                $set: {
                                    callbackAuthentication: {
                                        ...callbackAuthentication,
                                        expiresAt: moment().add(callbackAuthentication.expiresIn, "seconds").toDate(),
                                    },
                                },
                            }, {});
                        });
                    },
                );
            })
        ).catch((err) => console.error(err.message));
    }
}



