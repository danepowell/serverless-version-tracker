'use strict';

const { exec } = require('child_process');

class ServerlessPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider(this.serverless.service.provider.name);
    this.stage = this.options.stage || this.serverless.service.provider.stage;

    this.hooks = {
      'before:package:initialize': this.checkClean.bind(this),
      'after:deploy:deploy': this.tagVersion.bind(this),
    };
  }

  checkClean() {
    if (this.stage !== 'production') {
      return;
    }
    exec('git status --porcelain', (err, stdout, stderr) => {
      if (err || stderr) {
        throw new Error(`err: ${err}; stderr: ${stderr}`);
      }
      if (stdout) {
        throw new Error('Working directory is not clean. Commit all changes to Git and try again.');
      }
    });
  }

  async tagVersion() {
    if (this.stage !== 'production') {
      return;
    }
    const arn = await this.getArn();
    const regex = /([-\w]*):(\d*)$/;
    const name = arn.match(regex)[1];
    const version = arn.match(regex)[2];
    const tag = `${name}-${version}`;
    this.serverless.cli.log(`Creating local git tag '${tag}'...`);
    exec(`git tag ${tag}`, (err, stdout, stderr) => {
      if (err || stdout || stderr) {
        throw new Error(`err: ${err}; stdout: ${stdout}; stderr: ${stderr}`);
      }
    });
  }

  async getArn() {
    const resp = await this.provider.request('CloudFormation', 'describeStacks', { StackName: this.provider.naming.getStackName(this.stage) });
    const output = resp.Stacks[0].Outputs;
    let arn;
    const arns = output.filter(entry => entry.OutputKey.match('ApiLambdaFunctionQualifiedArn'));
    arns.forEach((entry) => { arn = entry.OutputValue; });
    return arn;
  }
}

module.exports = ServerlessPlugin;
