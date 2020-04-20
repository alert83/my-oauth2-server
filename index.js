const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const PORT = process.env.PORT || 5000

const {StateUpdateRequest} = require('st-schema');
//
const OAuth2Server = require('oauth2-server');
const Request = OAuth2Server.Request;
const Response = OAuth2Server.Response;
//

const Model = require('./model');
const {connector, deviceStates, accessTokens} = require('./connector');

const model = new Model();

const oauth = new OAuth2Server({
    model: model
});

const app = express();

app
    .use(bodyParser.json())
    .use(bodyParser.urlencoded({extended: false}))
    .use(express.static(path.join(__dirname, 'public')))
    .set('views', path.join(__dirname, 'views'))
    .set('view engine', 'ejs');

app
    .post('/st', async (req, res) => {
        if (accessTokenIsValid(req)) {
            await connector.handleHttpCallback(req, res)
        }
    })
    .post('/st/command', async (req, res) => {
        deviceStates[req.body.attribute] = req.body.value;

        for (const accessToken of Object.keys(accessTokens)) {
            const item = accessTokens[accessToken];

            const deviceState = [{
                externalDeviceId: 'external-device-1',
                states: [
                    {
                        component: 'main',
                        capability: req.body.attribute === 'level' ? 'st.switchLevel' : 'st.switch',
                        attribute: req.body.attribute,
                        value: req.body.value
                    }
                ]
            }];

            const stateUpdateRequest = new StateUpdateRequest(
                process.env.ST_CLIENT_ID,
                process.env.ST_CLIENT_SECRET,
            );

            console.log('stateUpdateRequest', item);

            await stateUpdateRequest.updateState(
                item.callbackUrls,
                item.callbackAuthentication,
                deviceState,
            );
        }

        res.send(true);
        res.end();
    })
    .get('/st/states', (req, res) => {
        res.json(deviceStates);
        res.end();
    });

function accessTokenIsValid(req) {
    // Replace with proper validation of issued access token
    if (req.body.authentication && req.body.authentication.token) {
        console.log(req.body);
        return true;
    }
    res.status(401).send('Unauthorized');
    return false;
}

app
    .post('/token', (req, res, next) => {
        let request = new Request(req);
        let response = new Response(res);

        oauth.token(request, response)
            .then((token) => {
                console.log(token);
                model.dump();
                next();
            })
            .catch((err) => {
                console.error(err);
                next(err);
            });
    })
    .get('/auth1', (req, res, next) => {
        let request = new Request(req);
        let response = new Response(res);

        oauth.authenticate(request, response)
            .then((token) => {
                console.log(token);
                model.dump();
                next();
            })
            .catch((err) => {
                console.error(err);
                next(err);
            });
    })
    .get('/auth2', (req, res, next) => {
        let request = new Request(req);
        let response = new Response(res);

        oauth.authorize(request, response)
            .then((token) => {
                console.log(token);
                model.dump();
                next();
            })
            .catch((err) => {
                console.error(err);
                next(err);
            });
    });

app.listen(PORT, () => console.log(`Listening on ${PORT}`));

