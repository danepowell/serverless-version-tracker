# Serverless Version Tracker
A serverless plugin for tracking deployed versions of your code.

This plugin has a super simple function: after you run `serverless deploy`, it will create a local git tag based on the version of the Lambda function that you just deployed. For instance, if your function is named `foo-production-index` and a deploy creates Lambda version 56, this plugin will automatically create a local git tag `foo-production-index-56`.

This guarantees that you always know exactly what version of your source code is actually running in the cloud.

## Installation

#### Install using Serverless plugin manager
```bash
serverless plugin install --name serverless-version-tracker
```

#### Install using npm

Install the module using npm:
```bash
npm install serverless-version-tracker --save-dev
```

Add `serverless-version-tracker` to the plugin list of your `serverless.yml` file:

```yaml
plugins:
  - serverless-version-tracker
```

## Configuration

By default, this plugin only runs for deployments to the production stage. If you'd like to customize this behavior, you can set the `versionTrackerStages` custom variable.

## Usage

1. Ensure that you have committed all of your changes to Git. The deploy will be aborted if the Git working directory is not clean. This prevents the possibility of deploying uncommitted / untraceable / volatile code.
2. Run a deploy as normal (i.e. `sls deploy --stage production`). The plugin will automatically tag your local Git repository with the Lambda function name and new version.
3. Make sure to push the new tag to your remote repository (the plugin won't do this for you).
