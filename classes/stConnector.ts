import {DeviceErrorTypes, SchemaConnector} from "st-schema";
import {provideIf} from "./ioc/ioc";
import {TYPE} from "./ioc/const";
import {inject} from "inversify";
import {Express} from "express";
import {MongoService} from "./mongoService";
import {OAuth2Model} from "./OAuth2Model";
import {Token} from "oauth2-server";

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

@provideIf(TYPE.StConnector, true)
export class StConnector {
    public connector: any;

    deviceStates = {
        'external-device-1': {switch: 'off', level: 100},
    };

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
                console.log('discoveryHandler =>', accessToken, data);

                response.addDevice('external-device-1', 'Test Dimmer', 'c2c-dimmer')
                    .manufacturerName('Example Connector')
                    .modelName('Virtual Dimmer');

                response.addDevice('1ff35717-53b7-40f8-87ba-93329599c98b',
                    'Test Watch Dog',
                    'd7419d49-8d27-4b7b-aa0c-5c7b2d6d7651')
                    .manufacturerName('Example Connector')
                    .modelName('My Watch Dog');
            })

            /**
             * State refresh request. Respond with the current states of all devices. Called after
             * device discovery runs.
             * @accessToken External cloud access token
             * @response {StateRefreshResponse} StateRefresh response object
             */
            .stateRefreshHandler(async (accessToken: string, response, data) => {
                console.log('stateRefreshHandler =>', accessToken, data);

                response.addDevice('external-device-1', [
                    {
                        component: 'main',
                        capability: 'st.switch',
                        attribute: 'switch',
                        value: this.deviceStates['external-device-1'].switch,
                    },
                    {
                        component: 'main',
                        capability: 'st.switchLevel',
                        attribute: 'level',
                        value: this.deviceStates['external-device-1'].level,
                    }
                ])
            })

            /**
             * Device command request. Control the devices and respond with new device states
             * @accessToken External cloud access token
             * @response {CommandResponse} CommandResponse response object
             * @devices {array} List of ST device commands
             */
            .commandHandler(async (accessToken: string, response, devices, data) => {
                console.log('commandHandler =>', accessToken, devices, data);

                for (const device of devices) {
                    const deviceResponse = response.addDevice(device.externalDeviceId);
                    for (const cmd of device.commands) {
                        const state: any = {
                            component: cmd.component,
                            capability: cmd.capability
                        };
                        if (cmd.capability === 'st.switchLevel' && cmd.command === 'setLevel') {
                            state.attribute = 'level';
                            state.value = this.deviceStates[device.externalDeviceId].level = cmd.arguments[0];
                            deviceResponse.addState(state);

                        } else if (cmd.capability === 'st.switch') {
                            state.attribute = 'switch';
                            state.value = this.deviceStates[device.externalDeviceId].switch = cmd.command === 'on' ? 'on' : 'off';
                            deviceResponse.addState(state);

                        } else {
                            deviceResponse.setError(
                                `Command '${cmd.command} of capability '${cmd.capability}' not supported`,
                                DeviceErrorTypes.CAPABILITY_NOT_SUPPORTED)
                        }
                    }
                }
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
                console.log('callbackAccessHandler =>', accessToken, data);

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
}



