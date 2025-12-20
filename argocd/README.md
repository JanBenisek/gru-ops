# ArgoCD

## Bootstrap
```sh
# Install CRDs
k apply -k argocd/bootstrap

# Apply project (make more gitopsy later)
k apply -f argocd/project.yaml

# Apply the app-of-apps pattern
k apply -f argocd/root-app.yaml
```