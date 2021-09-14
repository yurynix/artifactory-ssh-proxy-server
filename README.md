## To run

```
npx artifactory-ssh-proxy-server
```

It'll create an example configuration file at `~/.artifactory-ssh-proxy.json`, edit it to values apropriate to you.

## Examples

Yarn:
```
NODE_OPTIONS="--max-old-space-size=4096" midgard-yarn --registry=http://localhost:8080
```

pnpm:
```
NODE_OPTIONS="--max-old-space-size=8192" pnpm install --registry=http://localhost:8080
```