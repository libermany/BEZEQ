# BEZEQ - lead form demo (POC)

Demo page that imitates a lead form and creates a Genesys Cloud Workitem through a Data Action.

* `index.html` - the static page (GitHub Pages). The address of the proxy is set at the top of the script (`var API`).
* `lead-proxy-worker.js` - small Cloudflare Worker that keeps the Genesys OAuth client secret and runs the Data Action.

Demo / POC only - not an official page.
