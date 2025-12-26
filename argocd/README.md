# ArgoCD

## Bootstrap
```sh
helm repo add argo https://argoproj.github.io/argo-helm
k create ns argocd
helm install argocd argo/argo-cd -n argocd -f /Users/janbenisek/github/gru-ops/argocd/manifests/prod/infra/argocd/values.yaml --version 9.2.1
# also need the secret

# Install CRDs (also use to update)
k apply -k argocd/bootstrap

# Apply project (make more gitopsy later)
k apply -f argocd/project.yaml

# Apply the app-of-apps pattern
k apply -f argocd/root-app.yaml
```

```
helm install argocd argo/argo-cd -n argocd -f /Users/janbenisek/github/gru-ops/argocd/manifests/prod/infra/argocd/values.yaml --version 9.2.1

I1225 21:54:30.404562   74920 warnings.go:110] "Warning: unrecognized format \"int64\""
I1225 21:54:30.444984   74920 warnings.go:110] "Warning: unrecognized format \"int64\""
I1225 21:54:30.691905   74920 warnings.go:110] "Warning: unrecognized format \"int64\""
NAME: argocd
LAST DEPLOYED: Thu Dec 25 21:54:23 2025
NAMESPACE: argocd
STATUS: deployed
REVISION: 1
TEST SUITE: None
NOTES:
In order to access the server UI you have the following options:

1. kubectl port-forward service/argocd-server -n argocd 8080:443

    and then open the browser on http://localhost:8080 and accept the certificate

2. enable ingress in the values file `server.ingress.enabled` and either
      - Add the annotation for ssl passthrough: https://argo-cd.readthedocs.io/en/stable/operator-manual/ingress/#option-1-ssl-passthrough
      - Set the `configs.params."server.insecure"` in the values file and terminate SSL at your ingress: https://argo-cd.readthedocs.io/en/stable/operator-manual/ingress/#option-2-multiple-ingress-objects-and-hosts


After reaching the UI the first time you can login with username: admin and the random password generated during the installation. You can find the password by running:

kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d

(You should delete the initial secret afterwards as suggested by the Getting Started Guide: https://argo-cd.readthedocs.io/en/stable/getting_started/#4-login-using-the-cli)
```