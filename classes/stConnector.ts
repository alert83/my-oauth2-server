import {DeviceErrorTypes, SchemaConnector} from "st-schema";
import {provideIf} from "./ioc/ioc";
import {TYPE} from "./ioc/const";
import {inject} from "inversify";
import {Express} from "express";
import {MongoService} from "./mongoService";
import {OAuth2Model} from "./OAuth2Model";
import {Token} from "oauth2-server";
import groupBy from "lodash/groupBy";
import Bluebird from "bluebird";

//

interface ICallbackAuthentication {
    tokenType: string;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

interface ICallbackUrls {
    oauthToken: string;
    stateCallback: string;
}

export interface IDevice {
    externalDeviceId: string;
    friendlyName: string;
    deviceHandlerType: string;
    manufacturerInfo: { manufacturerName: string, modelName: string };
    status: string;
    states: {
        component: string;
        capability: string;
        attribute: string;
        value: string;
    }[];
}

@provideIf(TYPE.StConnector, true)
export class StConnector {
    public connector: any;

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
            .discoveryHandler(async (accessToken: string, response, data) => {
                // console.log('discoveryHandler =>', accessToken, data);

                const devices: IDevice[] = await this.client.withClient(async (db) => {
                    const collection = db.collection<IDevice>('my-devices');
                    return collection.find().toArray();
                });

                devices.forEach((d) => {
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
            .stateRefreshHandler(async (accessToken: string, response, data) => {
                // console.log('stateRefreshHandler =>', accessToken, data);

                const ids = data.devices ? data.devices.map((d) => d.externalDeviceId) : undefined;

                const devices: IDevice[] = await this.client.withClient(async (db) => {
                    const collection = db.collection<IDevice>('my-devices');
                    return collection.find(ids ? {externalDeviceId: {$in: ids}} : {}).toArray();
                });

                devices.forEach((d) => {
                    const device = response.addDevice(d.externalDeviceId);
                    const byCmp = groupBy(d.states, (s) => s.component);

                    Object.entries(byCmp).forEach(([cmp, states]) => {
                        const component = device.addComponent(cmp);
                        states.forEach((s) => component.addState(s.capability, s.attribute, s.value));
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
                devices: { externalDeviceId, commands: { component, capability, command, arguments: any[] }[] }[],
                data) => {
                // console.log('commandHandler =>', accessToken, devices, data);

                // const ids = data.devices ? devices.map((d) => d.externalDeviceId) : undefined;
                // const myDevices: IDevice[] = await this.client.withClient(async (db) => {
                //     const collection = db.collection<IDevice>('my-devices');
                //     return collection.find(ids ? {externalDeviceId: {$in: ids}} : {}).toArray();
                // });

                await Bluebird.each(devices, async (device) => {
                    const deviceResponse = response.addDevice(device.externalDeviceId);

                    await Bluebird.each(device.commands, async (cmd) => {
                        const state = this.commandToState(cmd)

                        if (state) {
                            await this.client.withClient(async (db) => {
                                const collection = db.collection<IDevice>('my-devices');
                                await collection.updateOne(
                                    {
                                        externalDeviceId: device.externalDeviceId,
                                        "states.capability": state.capability,
                                        "states.attribute": state.attribute,
                                    },
                                    {$set: {"states.$": state}}
                                )
                            });

                            deviceResponse.addState(state);
                        } else {
                            deviceResponse.setError(
                                `Command '${cmd.command} of capability '${cmd.capability}' not supported`,
                                DeviceErrorTypes.CAPABILITY_NOT_SUPPORTED)
                        }
                    });

                });
            })

            /**
             * Create access and refresh tokens to allow SmartThings to be informed of device state
             * changes as they happen.
             * @accessToken External cloud access token
             * @callbackAuthentication ST access and refresh tokens for proactive state callbacks
             * @callbackUrls Callback and refresh token URLs
             */
            .callbackAccessHandler(async (accessToken: string,
                                          callbackAuthentication: ICallbackAuthentication,
                                          callbackUrls: ICallbackUrls,
                                          data) => {
                // console.log('callbackAccessHandler =>', accessToken, data);

                await this.client.withClient(async (db) => {
                    const collection = db.collection('CallbackAccessTokens');
                    const token = await this.model.getAccessToken(accessToken) as Token;

                    await collection.findOneAndReplace({
                        accessToken,
                    }, {
                        accessToken,
                        callbackAuthentication,
                        callbackUrls,
                        clientId: token?.client?._id,
                        userId: token?.user?._id,
                        username: token?.user?.username,
                    }, {upsert: true});
                });
            })

            /**
             * Called when the connector is removed from SmartThings. You may want clean up access
             * tokens and other data when that happend.
             * @accessToken External cloud access token
             */
            .integrationDeletedHandler(async (accessToken: string, data) => {
                console.log('integrationDeletedHandler =>', accessToken, data);

                await this.client.withClient(async (db) => {
                    const collection = db.collection('CallbackAccessTokens');
                    await collection.deleteMany({accessToken});
                });
            })
    }

    commandToState(cmd: { component, capability, command, arguments: any[] }) {
        const state: { component, capability, attribute, value } = {
            component: cmd.component,
            capability: cmd.capability,
            attribute: undefined,
            value: undefined,
        };

        switch (cmd.capability) {
            case 'st.switch': {
                state.attribute = 'switch';
                state.value = cmd.command;
                break;
            }
            default: {
                return;
            }
        }

        return state;

        // if (cmd.capability === 'st.switchLevel' && cmd.command === 'setLevel') {
        //     state.attribute = 'level';
        //     state.value =
        //         // this.deviceStates[device.externalDeviceId].level =
        //         cmd.arguments[0];
        //     deviceResponse.addState(state);
        //
        // } else if (cmd.capability === 'st.switch') {
        //     state.attribute = 'switch';
        //     state.value =
        //         // this.deviceStates[device.externalDeviceId].switch =
        //         cmd.command === 'on' ? 'on' : 'off';
        //     deviceResponse.addState(state);
        //
        // } else {
        //     deviceResponse.setError(
        //         `Command '${cmd.command} of capability '${cmd.capability}' not supported`,
        //         DeviceErrorTypes.CAPABILITY_NOT_SUPPORTED)
        // }
    }
}



