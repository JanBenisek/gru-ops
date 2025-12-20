# ArgoCD

## Bootstrap
```sh
# Install CRDs (also use to update)
k apply -k argocd/bootstrap/base

# Apply project (make more gitopsy later)
k apply -f argocd/project.yaml

# Apply the app-of-apps pattern
k apply -f argocd/root-app.yaml

# Later apply ingress and other kustomizations
k apply -k argocd/bootstrap/overlay
```