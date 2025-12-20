# ArgoCD

## Bootstrap
```sh
# Install CRDs
k apply -k argocd/bootstrap

# Apply the app-of-apps pattern
k apply -f argocd/root-app.yaml
```

- Check UI: 