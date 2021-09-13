// Node.js require:
const fs = require('fs');
const path = require('path');
const os = require('os');
const Ajv = require("ajv");
const { startServer } = require('./server');

const CONFIG_FILE_NAME = '.artifactory-ssh-proxy.json';
 // options can be passed, e.g. {allErrors: true}

// const UPSTREAM_REGISTRY_METDATA_URL = new URL("https://npm.dev.wixpress.com/");
// const UPSTREAM_TAR_BALL_SERVER_URL = new URL("https://repo.dev.wixpress.com/");
// const LISTEN_PORT = process.env.LISTEN_PORT
//   ? parseInt(process.env.LISTEN_PORT, 10)
//   : 9000;
// const REMOTE_PORT = process.env.REMOTE_PORT
//   ? parseInt(process.env.REMOTE_PORT, 10)
//   : 8080;

// const sshConfig = {
//     host: "3.66.228.199",
//     port: 22,
//     username: "ubuntu",
//     privateKey: fs.readFileSync("/Users/yurym/.ssh/yurynix-frankfurt.pem"),
//     //debug: st => console.log('ssh', st),
// };
// // --- end of config ---

const configSchema = {
  $id: "https://proxy-server.com/schema.json",
  type: "object",
  properties: {
    listenPort: {type: "integer"},
    remotePort: {type: "integer"},
    upstreamRegistryMetadataUrl: {type: "string"},
    upstreamTarballServerUrl: {type: "string"},
    sshConfig: {
        type: "object",
        properties: {
          port: {type: "integer"},
          host: {type: "string"},
          username: {type: "string"},
          privateKeyPath: {type: "string"},
        },
        required: ["host", "port", "username", "privateKeyPath"],
        additionalProperties: false,
    }
  },
  required: ["upstreamRegistryMetadataUrl", "upstreamTarballServerUrl", "sshConfig"],
  additionalProperties: false,
}

const configFilePath = path.join(os.homedir(), CONFIG_FILE_NAME);
const sampleConfig = {
    upstreamRegistryMetadataUrl: 'https://npm.dev.some-artifactory.com/',
    upstreamTarballServerUrl: 'https://repo.dev.some-artifactory.com/',
    remotePort: 8080,
    listenPort: 9000,
    sshConfig: {
        host: "1.2.3.4",
        port: 22,
        username: "ubuntu",
        privateKeyPath: path.join(os.homedir(), '.ssh', 'id_rsa'),
    }
}

let configFileData;
try {
    configFileData = fs.readFileSync(configFilePath, 'utf-8');
} catch(ex) {
    if (ex.code === 'ENOENT') {
        console.log(`Unable to open ${configFilePath}, creating it...`);
        fs.writeFileSync(configFilePath, JSON.stringify(sampleConfig, null, '\t'));
        console.log(`Please edit ${configFilePath}`);
        process.exit(1);
    }
}

const config = JSON.parse(configFileData);
const ajv = new Ajv()
const validate = ajv.compile(configSchema)
const valid = validate(config)
if (!valid) {
    console.log('Config is invalid:', validate.errors);
    process.exit(1);
}

config.sshConfig.privateKey = fs.readFileSync(config.sshConfig.privateKeyPath);
['upstreamRegistryMetadataUrl', 'upstreamTarballServerUrl'].forEach(urlKey => config[urlKey] = new URL(config[urlKey]));
delete config.sshConfig.privateKeyPath;

startServer(config);