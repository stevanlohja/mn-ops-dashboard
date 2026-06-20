# Mainnet Requirements

## Region & Cloud Strategy

All Mainnet nodes must be deployed within the **EU region**. The Midnight Foundation may periodically request regional migrations to optimize network topology, health, and latency.

:::warning[Avoid GCP]

Google Cloud Platform (GCP) nodes are currently over-represented. To ensure network decentralization, please utilize **alternative cloud providers** (e.g., AWS, Azure, Hetzner, OVH) or **Bare Metal** solutions.

:::
When deploying, prioritize zones that are currently underrepresented on the Midnight telemetry map to further reduce network latency.

## Hardware Requirements

Midnight operates as a partner chain to Cardano. To maintain synchronization and shared security, the Midnight node requires a persistent connection to a **PostgreSQL database** populated by `cardano-db-sync`.

The following specifications assume all required services (Midnight node, Cardano node, and DB sync) are running on the **same instance**.

| **Component** | **Mainnet (Minimum)** | **Mainnet (Comfort)** |
| --- | --- | --- |
| **CPU** | 16-24 Cores (≥3.0 GHz) | 24–32 cores (≥3 GHz preferred) |
| **RAM** | 128 GB | 192 GB – 256 GB |
| **Storage** | 2 TB NVMe SSD | 4 TB NVMe SSD |
| **IOPS** | ≥60,000 effective IOPS | ≥100,000+ IOPS |
| **Network** | 1 Gbps, high uptime | 1 Gbps, high uptime |
| **OS** | Ubuntu 24.04 LTS | Ubuntu 24.04 LTS |

## Operating System & Environment

### GLIBC Compatibility

Linux distributions must be compatible with **GLIBC version 2.39 or greater**.

**Supported Operating Systems:**

- **Ubuntu 24.04** or later (Recommended)
- **Debian 13** or later

To verify your current version, run:

```bash
ldd --version
```
