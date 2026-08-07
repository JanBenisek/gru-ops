# PVC Restoration Plan

## Summary

This document describes the steps to restore application PVCs from k8up backups after migrating to `volumeClaimTemplates`.

**Note:** This covers StatefulSets: bazarr, prowlarr, radarr, sonarr, sabnzbd, qbittorrent.

## Backups Available (2026-08-05)

| Application | Snapshot ID | Backup Date | New PVC Name | Type | Status |
|-------------|-------------|-------------|--------------|------|--------|
| Bazarr | `0b647b1d` | 2026-08-05 | config-storage-bazarr-0 | StatefulSet | Available |
| Prowlarr | `93d9e374` | 2026-08-05 | config-storage-prowlarr-0 | StatefulSet | Available |
| Radarr | `4c6e37bf` | 2026-08-05 | config-storage-radarr-0 | StatefulSet | Available |
| Sonarr | `ea0e95ba` | 2026-08-05 | config-storage-sonarr-0 | StatefulSet | Available |
| Sabnzbd | `b28e29a7` | 2026-08-05 | config-storage-sabnzbd-0 | StatefulSet | Available |
| Qbittorrent | `cd27de35` | 2026-08-05 | config-storage-qbittorrent-0 | StatefulSet | Available |
| Jellyfin | `301cd8be` | 2026-08-05 | pvc-jellyfin-config | Deployment | Available |

## Restoration Steps

### Step 1: Delete statefulsets and deployments (must recreate to change volumeClaimTemplates)

```bash
# StatefulSets (delete and recreate - volumeClaimTemplates is immutable)
k delete statefulset -n media bazarr
k delete statefulset -n media prowlarr
k delete statefulset -n media radarr
k delete statefulset -n media sonarr
k delete statefulset -n media sabnzbd
k delete statefulset -n media qbittorrent

# Scale to 0 might also be needed
k scale statefulset -n media bazarr --replicas=0
k scale statefulset -n media prowlarr --replicas=0
k scale statefulset -n media radarr --replicas=0
k scale statefulset -n media sonarr --replicas=0
k scale statefulset -n media sabnzbd --replicas=0
k scale statefulset -n media qbittorrent --replicas=0

# Deployment
k scale deployment -n media jellyfin --replicas=0
```

### Step 2: Force delete the old PVCs

```bash
# Remove finalizers to allow deletion
k patch pvc -n media pvc-bazarr-config -p '{"metadata":{"finalizers":null}}' --type=merge
k patch pvc -n media pvc-prowlarr-config -p '{"metadata":{"finalizers":null}}' --type=merge
k patch pvc -n media pvc-radarr-config -p '{"metadata":{"finalizers":null}}' --type=merge
k patch pvc -n media pvc-sonarr-config -p '{"metadata":{"finalizers":null}}' --type=merge
k patch pvc -n media pvc-sabnzbd-config -p '{"metadata":{"finalizers":null}}' --type=merge
k patch pvc -n media pvc-qbittorrent-config -p '{"metadata":{"finalizers":null}}' --type=merge
k patch pvc -n media pvc-jellyfin-config -p '{"metadata":{"finalizers":null}}' --type=merge

# Force delete PVCs
k delete pvc -n media pvc-bazarr-config --force --grace-period=0
k delete pvc -n media pvc-prowlarr-config --force --grace-period=0
k delete pvc -n media pvc-radarr-config --force --grace-period=0
k delete pvc -n media pvc-sonarr-config --force --grace-period=0
k delete pvc -n media pvc-sabnzbd-config --force --grace-period=0
k delete pvc -n media pvc-qbittorrent-config --force --grace-period=0
k delete pvc -n media pvc-jellyfin-config --force --grace-period=0
```

### Step 3: Apply updated manifests (creates StatefulSets with volumeClaimTemplates, pods start immediately)

```bash
k apply -f /Users/janbenisek/github/gru-ops/argocd/manifests/prod/apps/media/arr/bazarr.yaml
k apply -f /Users/janbenisek/github/gru-ops/argocd/manifests/prod/apps/media/arr/prowlarr.yaml
k apply -f /Users/janbenisek/github/gru-ops/argocd/manifests/prod/apps/media/arr/radarr.yaml
k apply -f /Users/janbenisek/github/gru-ops/argocd/manifests/prod/apps/media/arr/sonarr.yaml
k apply -f /Users/janbenisek/github/gru-ops/argocd/manifests/prod/apps/media/arr/sabnzbd.yaml
k apply -f /Users/janbenisek/github/gru-ops/argocd/manifests/prod/apps/media/arr/qbittorrent.yaml
```

Create jellyfin PVC manually (not in a file):
```bash
cat << 'YAML' | kubectl apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: pvc-jellyfin-config
  namespace: media
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 4Gi
  storageClassName: synology-storage-apps
YAML
```

### Step 4: Apply restore manifests

```bash
k apply -f /Users/janbenisek/github/gru-ops/argocd/manifests/prod/apps/media/operational-docs/restore-bazarr.yaml
k apply -f /Users/janbenisek/github/gru-ops/argocd/manifests/prod/apps/media/operational-docs/restore-prowlarr.yaml
k apply -f /Users/janbenisek/github/gru-ops/argocd/manifests/prod/apps/media/operational-docs/restore-radarr.yaml
k apply -f /Users/janbenisek/github/gru-ops/argocd/manifests/prod/apps/media/operational-docs/restore-sonarr.yaml
k apply -f /Users/janbenisek/github/gru-ops/argocd/manifests/prod/apps/media/operational-docs/restore-sabnzbd.yaml
k apply -f /Users/janbenisek/github/gru-ops/argocd/manifests/prod/apps/media/operational-docs/restore-qbittorrent.yaml
k apply -f /Users/janbenisek/github/gru-ops/argocd/manifests/prod/apps/media/operational-docs/restore-jellyfin.yaml
```

### Step 5: Scale deployment

```bash
k scale deployment -n media jellyfin --replicas=1
```

### Step 6: Verify pods are running

```bash
k get pods -n media | grep -E "bazarr|prowlarr|radarr|sonarr|sabnzbd|qbittorrent|jellyfin"
```

### Step 7: Verify restore jobs completed

```bash
k get restore -n media
k describe restore <name> -n media  # Check status
```
