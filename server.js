const fs = require("fs");
const zlib = require("zlib");
const Fastify = require("fastify");
const server = Fastify();
const proxy = require("fastify-http-proxy");
const { forwardPorts } = require("./ssh");
const { pipeline, PassThrough } = require('stream');
const stringReplaceStream = require('string-replace-stream');
const debug = require("util").debuglog("proxy");

function startServer(config) {
    server.register(proxy, {
        upstream: config.upstreamTarballServerUrl.toString(),
        prefix: "/artifactory/api/npm",
        rewritePrefix: "/artifactory/api/npm",
        replyOptions: {
          rewriteRequestHeaders: (originalReq, headers) => {
            console.log(`tarball proxy ${originalReq.method} ${originalReq.url}`);
            return { ...headers, host: config.upstreamTarballServerUrl.host };
          },
          rewriteHeaders: (headers) => ({
            ...headers,
            ...(headers["location"]
              ? {
                  location: headers["location"].replace(
                    config.upstreamTarballServerUrl.toString().slice(0, -1),
                    `http://localhost:${config.remotePort}`
                  ),
                }
              : {}),
          }),
        },
      });
      
      server.register(proxy, {
        upstream: config.upstreamRegistryMetadataUrl.toString(),
        prefix: "/",
        replyOptions: {
          rewriteRequestHeaders: (originalReq, headers) => {
            console.log(`metadata proxy ${originalReq.method} ${originalReq.url}`);
            return { ...headers, host: config.upstreamRegistryMetadataUrl.host };
          },
          rewriteHeaders: (headers) => ({
            ...headers,
            ...(headers["location"]
              ? {
                  location: headers["location"].replace(
                    config.upstreamRegistryMetadataUrl.toString().slice(0, -1),
                    `http://localhost:${config.remotePort}`
                  ),
                }
              : {}),
          }),
          onResponse: (request, reply, res) => {
            const piplineMembers = [
              res,
              ...(reply.getHeader("content-encoding") === "gzip"
                ? [zlib.createGunzip()]
                : []),
              stringReplaceStream(`https://${config.upstreamTarballServerUrl.host}`, `http://localhost:${config.remotePort}`),
              stringReplaceStream(`http://${config.upstreamTarballServerUrl.host}`, `http://localhost:${config.remotePort}`),
              ...(reply.getHeader("content-encoding") === "gzip"
              ? [zlib.createGzip()]
              : [new PassThrough()]),
            ];
      
            const output = pipeline(...piplineMembers, (err) => {
              if (err) {
                console.error('Stream pipeline error', err);
                return;
              }
      
              debug(`Metadata transform pipeline sucess`);
            });
      
            reply.send(output);
          },
        },
      });
      
      server.listen(config.listenPort, (err, hostname) => {
        if (err) {
          throw new Error(`Unable to listen on ${config.listenPort}`);
        }
      
        console.log(`Proxy listening on ${hostname}`);
      });
      
      forwardPorts({
        sshConfig: config.sshConfig,
        portMappings: {
          [config.remotePort]: config.listenPort,
        },
      });      
}

module.exports = {
    startServer
}
