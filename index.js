'use strict';

const util = require('util');
const exec = util.promisify(require('child_process').exec);

class ServerlessPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider(this.serverless.service.provider.name);
    this.stage = this.options.stage || this.serverless.service.provider.stage;
    this.versionTrackerStages = this.serverless.service.custom.versionTrackerStages || ['production'];

    this.hooks = {
      'before:package:initialize': this.checkClean.bind(this),
      'after:deploy:deploy': this.tagVersion.bind(this),
    };
  }

  async checkClean() {
    if (!this.shouldRun()) {
      return;
    }
    const { stdout, stderr } = await exec('git status --porcelain');
    if (stderr) {
      throw new Error(`stderr: ${stderr}`);
    }
    if (stdout) {
      throw new Error('Working directory is not clean. Commit all changes to Git and try again.');
    }
  }

  async tagVersion() {
    if (!this.shouldRun()) {
      return;
    }
    const arns = await this.getArns();
    if (len(arns) === 0) {
      throw new Error('Serverless Version Tracker error: cannot retrieve deployed ARN');
    }
    arns.forEach(async (arn) => {
      const regex = /([-\w]*):(\d*)$/;
      const name = arn.match(regex)[1];
      const version = arn.match(regex)[2];
      const tag = `${name}-${version}`;
      this.serverless.cli.log(`Creating local git tag '${tag}'...`);
      const { stdout, stderr } = await exec(`git tag ${tag}`);
      if (stdout || stderr) {
        throw new Error(`stdout: ${stdout}; stderr: ${stderr}`);
      }
    });
  }

  async getArns() {
    const resp = await this.provider.request('CloudFormation', 'describeStacks', { StackName: this.provider.naming.getStackName(this.stage) });
    const output = resp.Stacks[0].Outputs;
    let arns = [];
    let filteredOutputs;
    try {
      filteredOutputs = output.filter(entry => entry.OutputKey.match('LambdaFunctionQualifiedArn'));
    } catch (error) {
      return arns;
    }
    filteredOutputs.forEach((entry) => { arns.push(entry.OutputValue) });
    return arns
  }

  shouldRun() {
    // Default behavior if user has not configured stages.
    if (!this.versionTrackerStages
      || !Array.isArray(this.versionTrackerStages)) {
      throw new Error('Invalid configuration value for option versionTrackerStages');
    }

    // Check against configured stages.
    return this.versionTrackerStages.indexOf(this.stage) !== -1;
  }
}

module.exports = ServerlessPlugin;
