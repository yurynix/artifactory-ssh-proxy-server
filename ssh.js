const net = require("net");
const { Client } = require("ssh2");
const debug = require("util").debuglog("ssh");

function pipeConnection(sourceStream, destinationPort) {
  sourceStream.pause();

  sourceStream.on("error", function (err) {
    debug(`Error on stream from remote: ${err.message}`);
  });

  const destinationSocket = net.connect(destinationPort, "localhost", function () {
    sourceStream.pipe(destinationSocket);
    destinationSocket.pipe(sourceStream);
    sourceStream.resume();
  });

  destinationSocket.on("error", function (err) {
    debug(`Error on local stream: ${err.message}`);
    sourceStream.end();
  });
}

function forwardPorts({ sshConfig, portMappings }) {
  try {
    const sshConnection = new Client();
    sshConnection
      .on("ready", function () {
        Object.keys(portMappings).forEach((portString) => {
          const remotePort = parseInt(portString, 10);
          sshConnection.forwardIn("::", remotePort, function (err) {
            if (err) {
              debug(
                `Failed to forwardIn ${remotePort} on remote to localhost:${portMappings[portString]} - ${err.message}`
              );
              return;
            }

            debug(
              `Forwarding port ${remotePort} on remote to localhost:${portMappings[portString]}`
            );
          });
        });
      })
      .on("tcp connection", function (info, accept, reject) {
        if (!portMappings[info.destPort]) {
          debug(
            `Rejecting ${info.srcIP}:${info.srcPort} -> ${info.destIP}:${info.destPort}`
          );
          return reject();
        }

        debug(
          `Accepting ${info.srcIP}:${info.srcPort} -> ${info.destIP}:${info.destPort}`
        );
        const stream = accept();
        pipeConnection(stream, portMappings[info.destPort]);
      })
      .on("error", function (err) {
        debug(`Error on ssh connection: ${err.message}`);
      })
      .connect(sshConfig);
  } catch (ex) {
    debug(`Execption on ssh connection creation: ${ex.message}`);
  }
}

module.exports = {
  forwardPorts,
};
