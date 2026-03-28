# Gru-Ops

This is my tiny homelab, running k8s with Talos OS, build from three mini PCs.
GitOps-style with ArgoCD, exposing some apps to the internet with Cloudflare tunnel & Pocket-id.

## Cluster
<table>
  <thead>
    <tr style="background-color: #4CAF50; color: white;">
      <th>Name</th>
      <th>Node</th>
      <th>CPU</th>
      <th>RAM</th>
      <th>HDD</th>
      <th>Second HDD</th>
      <th>OS</th>
      <th>Power</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Kevin</td>
      <td>HP EliteDesk 800 G3 Mini</td>
      <td>Intel Quad Core i5 7500 3,40 GHz (4 cores, 4 threads, 6MB cache)</td>
      <td>40GiB</td>
      <td>256 GB NVMe</td>
      <td>500GiB SSD</td>
      <td>Talos (master)</td>
      <td>65W</td>
    </tr>
    <tr>
      <td>Stuart</td>
      <td>HP EliteDesk 800 G3 Mini</td>
      <td>Intel Quad Core i5 7500 3,40 GHz (4 cores, 4 threads, 6MB cache)</td>
      <td>40GiB</td>
      <td>256 GB NVMe</td>
      <td>500GiB SSD</td>
      <td>Talos</td>
      <td>65W</td>
    </tr>
    <tr>
      <td>Bob</td>
      <td>HP EliteDesk 800 G3 Mini</td>
      <td>Intel Quad Core i5 7600T 2.8GHz (4 cores, 4 threads, 6MB cache)</td>
      <td>16GiB</td>
      <td>256GiB NVMe</td>
      <td>N/A</td>
      <td>Proxmox</td>
      <td>35W</td>
    </tr>
  </tbody>
</table>

<div align="center">
  <img src="assets/gru.png" alt="Gru Homelab" width="100%" />
</div>
