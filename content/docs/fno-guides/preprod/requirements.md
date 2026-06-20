# Preprod Requirements

## Region & Cloud Strategy

Preprod nodes may be deployed in any region. Regional requirements are less strict than Mainnet; however, latency to peers should remain low for reliable validator performance.

## Hardware Requirements

Midnight operates as a partner chain to Cardano. To maintain synchronization and shared security, the Midnight node requires a persistent connection to a **PostgreSQL database** populated by `cardano-db-sync`.

The following specifications assume all required services (Midnight node, Cardano node, and DB sync) are running on the **same instance**.

| **Component** | **Preprod (Minimum)** | **Preprod (Comfort)** |
| --- | --- | --- |
| **CPU** | 8 cores (≥2.5 GHz) | 16 cores (≥3.0 GHz) |
| **RAM** | 32 GB | 64 GB |
| **Storage** | 500 GB NVMe SSD | 1 TB NVMe SSD |
| **IOPS** | ≥20,000 effective IOPS | ≥60,000 IOPS |
| **Network** | 500 Mbps, high uptime | 1 Gbps, high uptime |
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
