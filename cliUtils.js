const exec = require("child_process").exec;

async function callCLIForJSON(cmd) {
  return JSON.parse(await execShellCommand(cmd));
}

function execShellCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.warn(error);
      }

      resolve(stdout ? stdout : stderr);
    });
  });
}

module.exports = {
  callCLIForJSON,
  execShellCommand,
};
