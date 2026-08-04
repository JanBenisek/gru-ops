# Prowlarr and Radarr Config Restoration Plan

## Summary

This document describes the steps to restore Prowlarr and Radarr configuration PVCs from k8up backups after they were accidentally deleted.

## Backups Available

| Application | Snapshot ID | Backup Date | Status |
|-------------|-------------|-------------|--------|
| Prowlarr | `5a827507` | 2026-05-13T01:00:25Z | Available |
| Radarr | `280fdba7` | 2026-05-13T01:00:31Z | Available |

## Current Issue

The PVCs are stuck in **Pending** state because they reference deleted PVs. The `volumeName` field in the PVC spec is immutable and points to non-existent PVs.

## Restoration Steps

### Step 1: Scale down statefulsets

```bash
k scale statefulset -n media bazarr --replicas=0
k scale statefulset -n media prowlarr radarr --replicas=0
```

### Step 2: Force delete the broken PVCs

```bash
# Remove finalizers to allow deletion
k patch pvc -n media pvc-bazarr-config pvc-bazarr-config -p '{"metadata":{"finalizers":null}}' --type=merge
k patch pvc -n media pvc-prowlarr-config pvc-radarr-config -p '{"metadata":{"finalizers":null}}' --type=merge
k patch pvc -n media pvc-radar-config pvc-radarr-config -p '{"metadata":{"finalizers":null}}' --type=merge


# Force delete PVCs
k delete pvc -n media pvc-bazarr-config pvc-bazarr-config --force --grace-period=0
k delete pvc -n media pvc-prowlarr-config pvc-radarr-config --force --grace-period=0
k delete pvc -n media pvc-radar-config pvc-radarr-config --force --grace-period=0
```

### Step 3: Create new PVCs

```bash
# !! Comment out the PVC name
k apply -f /Users/janbenisek/github/gru-ops/argocd/manifests/prod/apps/media/arr/pvc-prowlarr-config.yaml
k apply -f /Users/janbenisek/github/gru-ops/argocd/manifests/prod/apps/media/arr/pvc-radarr-config.yaml
```

### Step 5: Apply restore manifests

```bash
k apply -f /Users/janbenisek/github/gru-ops/argocd/manifests/prod/apps/media/restore-bazarr.yaml
k apply -f /Users/janbenisek/github/gru-ops/argocd/manifests/prod/apps/media/restore-prowlarr.yaml
k apply -f /Users/janbenisek/github/gru-ops/argocd/manifests/prod/apps/media/restore-radarr.yaml
```

### Step 7: Scale up statefulsets

```bash
k scale statefulset -n media prowlarr radarr --replicas=1
```

### Step 8: Verify pods are running

```bash
k get pods -n media | grep -E "prowlarr|radarr"
```
