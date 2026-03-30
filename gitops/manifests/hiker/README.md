# Cloudflare tunnel

## How it works

- The user's browser connects to Cloudflare's servers using HTTPS.
- At Cloudflare’s edge (their server closest to the user), the encrypted connection is “terminated” — Cloudflare decrypts the HTTPS traffic.
  - `terminating` means that encrypted connection is ends (is terminated)
- After decrypting, Cloudflare forwards the request either:
  - To your origin (your server/cluster) encrypted again via the Cloudflare Tunnel, or
  - Plain HTTP inside your cluster (like in your case).
- See Notion for more details of the setup

```
+---------------------+       HTTPS       +------------------------+
|   User Browser      | <---------------> | Cloudflare Edge (CDN)  |
|  (swisshikefinder)  |                   +------------------------+
+---------------------+                              |
                                                     | Encrypted Tunnel (cloudflared)
                                                     |
                                        +--------------------------+
                                        |  Cloudflared Tunnel Pod   |
                                        |  (inside Kubernetes)      |
                                        +------------+-------------+
                                                     |
                                                    HTTP (plain)
                                                     |
                                        +------------v-------------+
                                        |    NGINX Ingress         |
                                        |  (listens on HTTP port)  |
                                        +------------+-------------+
                                                     |
                                                     | HTTP
                                                     |
                                        +------------v-------------+
                                        |      Hiker Pod           |
                                        | (your app listening 8080)|
                                        +--------------------------+

```

## HTTP vs HTTPS
- Cloudflare tunnel exposes my service to the internet, it handles HTTPS connection from outside.
- Then it sends traffic to my cluster using HTTP, but my service is configured to listen on HTTPS and by default redirect HTTP to HTTPS
- The issue:
  - Cloudflare Tunnel sends HTTP to nginx, but nginx thinks this should be HTTPS and tries to redirect it
  - Cloudflare tries again HTTP (because it does not do HTTPS) -> endless loop of redirects (301,308)
  - Therefore we need the annotations
```yaml
nginx.ingress.kubernetes.io/ssl-redirect: "false" # do not redirect HTTP to HTTPS
nginx.ingress.kubernetes.io/backend-protocol: "HTTP" # not it expects HTTP from cloudflare
nginx.ingress.kubernetes.io/proxy-redirect-from: "http://" # telling how to redirect
nginx.ingress.kubernetes.io/proxy-redirect-to: "https://"
```