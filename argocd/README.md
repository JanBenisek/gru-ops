# ArgoCD

## Bootstrap
```sh
# Install CRDs (also use to update)
k apply -k argocd/bootstrap

# Apply project (make more gitopsy later)
k apply -f argocd/project.yaml

# Apply the app-of-apps pattern
k apply -f argocd/root-app.yaml
```

- ArgoCD, when using OCI, needs to register a repo