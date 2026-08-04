# PVC Restoration Plan

## Summary

This document describes the steps to restore application PVCs from k8up backups after iSCSI LUN issues or accidental deletion.

**Note:** This covers both StatefulSets (bazarr, prowlarr, radarr) and Deployments (jellyfin).

## Backups Available

| Application | Snapshot ID | Backup Date | Status | Type |
|-------------|-------------|-------------|--------|------|
| Jellyfin | `d5469c66` | 2026-08-04 | Available | Deployment |
| Prowlarr | `5a827507` | 2026-05-13T01:00:25Z | Available | StatefulSet |
| Radarr | `280fdba7` | 2026-05-13T01:00:31Z | Available | StatefulSet |

## Current Issue

The PVCs are stuck in **Pending** state because they reference deleted PVs. The `volumeName` field in the PVC spec is immutable and points to non-existent PVs.

## Restoration Steps

### Step 1: Scale down statefulsets and deployments

```bash
k scale statefulset -n media bazarr prowlarr radarr --replicas=0
k scale deployment -n media jellyfin --replicas=0
```

### Step 2: Force delete the broken PVCs

```bash
# Remove finalizers to allow deletion
k patch pvc -n media pvc-jellyfin-config pvc-jellyfin-config -p '{"metadata":{"finalizers":null}}' --type=merge
k patch pvc -n media pvc-bazarr-config pvc-bazarr-config -p '{"metadata":{"finalizers":null}}' --type=merge
k patch pvc -n media pvc-prowlarr-config pvc-radarr-config -p '{"metadata":{"finalizers":null}}' --type=merge
k patch pvc -n media pvc-radar-config pvc-radarr-config -p '{"metadata":{"finalizers":null}}' --type=merge


# Force delete PVCs
k delete pvc -n media pvc-bazarr-config --force --grace-period=0
k delete pvc -n media pvc-prowlarr-config --force --grace-period=0
k delete pvc -n media pvc-radarr-config --force --grace-period=0
k delete pvc -n media pvc-jellyfin-config --force --grace-period=0
k delete pv pvc-35fafcf7-e83d-4015-ade5-a802015ac633 --force --grace-period=0
```

### Step 3: Create new PVCs

```bash
# !! Comment out the PVC name in yaml files first
k apply -f /Users/janbenisek/github/gru-ops/argocd/manifests/prod/apps/media/arr/pvc-prowlarr-config.yaml
k apply -f /Users/janbenisek/github/gru-ops/argocd/manifests/prod/apps/media/arr/pvc-radarr-config.yaml

# Create jellyfin PVC manually (not in a file)
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

### Step 5: Apply restore manifests

```bash
k apply -f /Users/janbenisek/github/gru-ops/argocd/manifests/prod/apps/media/operational-docs/restore-bazarr.yaml
k apply -f /Users/janbenisek/github/gru-ops/argocd/manifests/prod/apps/media/operational-docs/restore-prowlarr.yaml
k apply -f /Users/janbenisek/github/gru-ops/argocd/manifests/prod/apps/media/operational-docs/restore-radarr.yaml
k apply -f /Users/janbenisek/github/gru-ops/argocd/manifests/prod/apps/media/operational-docs/restore-jellyfin.yaml
```

### Step 7: Scale up statefulsets and deployments

```bash
k scale statefulset -n media bazarr prowlarr radarr --replicas=1
k scale deployment -n media jellyfin --replicas=1
```

### Step 8: Verify pods are running

```bash
k get pods -n media | grep -E "jellyfin|bazarr|prowlarr|radarr"
```
