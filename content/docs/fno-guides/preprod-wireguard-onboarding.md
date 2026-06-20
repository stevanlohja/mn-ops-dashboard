# Midnight preprod — WireGuard onboarding for FNOs

This guide walks one FNO operator through joining the Midnight preprod
trusted overlay. The end state: your validator has a WireGuard tunnel
to every other FNO and to the Shielded validator, and `midnight-node`
peers with all of them over that overlay.

You have already shared your WireGuard public key, public endpoint,
and your libp2p peer ID with Shielded; that's why your `[Peer]` block
already appears in the shared `wg0.conf`
([configs/wireguard/preprod/wg0.conf](https://github.com/midnightntwrk/midnight-network-ops/blob/main/configs/wireguard/preprod/wg0.conf)).
This guide only covers **your side** of the configuration.


## 1. What you need

| Thing | Where it comes from |
|---|---|
| Your WireGuard private key | You generate it; never share it. |
| Your assigned overlay address | The allocation table below. |
| The full shared peer list | [configs/wireguard/preprod/wg0.conf](https://github.com/midnightntwrk/midnight-network-ops/blob/main/configs/wireguard/preprod/wg0.conf). |

If you haven't already generated a WireGuard keypair on your validator,
do it now:

```sh
umask 077
wg genkey | tee /etc/wireguard/wg0.privkey | wg pubkey > /etc/wireguard/wg0.pubkey
cat /etc/wireguard/wg0.pubkey   # share this with Shielded if not already shared
```

The public key must match the one that's already in the shared `wg0.conf`.
If you regenerate, send the new public key to Shielded so the validator
SG and the shared config can be updated.


## 2. Overlay address allocation

Use the row that matches your operator. The `Address =` line in your
`[Interface]` block must be exactly your `/32` from this table.

| Operator                       | Public IP        | `Address =` (overlay /32) | Public key fingerprint |
|--------------------------------|------------------|---------------------------|------------------------|
| Shielded (walleye-marlin, 1a)  | 34.247.232.225   | `100.112.0.10/32`         | `KsK3KmJe…`            |
| Shielded (walleye-dodo, 1a)    | 54.78.200.153    | `100.112.0.11/32`         | `Cf9j9F0f…`            |
| Shielded (grub-unicorn, 1b)    | 52.18.156.146    | `100.112.0.12/32`         | `AYkQadyf…`            |
| Shielded (antelope-possum, 1c) | 18.203.72.248    | `100.112.0.13/32`         | `A/wHhHUv…`            |
| aton-validator (Alphacompute)  | 13.63.8.226      | `100.112.8.101/32`        | `dSUGDMa9…`            |
| bkd-validator-blockdaemon      | 64.130.55.173    | `100.112.8.102/32`        | `EA97EaQD…`            |
| bkd-validator-bullish          | 64.130.61.171    | `100.112.8.103/32`        | `9KQVFwCE…`            |
| twn-validator-etoro            | 155.2.223.62     | `100.112.8.104/32`        | `Kiyi8PMt…`            |
| ktg-validator (Karatage)       | 51.91.95.150     | `100.112.8.105/32`        | `FNKusmL1…`            |
| bcw-validator-google           | 35.212.116.191   | `100.112.8.106/32`        | `pt2dHM4Y…`            |
| bcw-validator-vodafone         | 35.214.107.119   | `100.112.8.107/32`        | `0NJhyUed…`            |
| bcw-validator-worldpay         | 34.3.83.240      | `100.112.8.108/32`        | `nTKhXblA…`            |
| bcw-validator-moneygram        | 5.199.172.138    | `100.112.8.109/32`        | `7lr6I9Bd…`            |
| bgo-validator (BitGo)          | 3.125.87.204     | `100.112.8.110/32`        | `J3SUDGUV…`            |


## 3. Build your `wg0.conf`

Start from the shared
[configs/wireguard/preprod/wg0.conf](https://github.com/midnightntwrk/midnight-network-ops/blob/main/configs/wireguard/preprod/wg0.conf)
(full mesh, all 14 peers — 4 Shielded validators + 10 FNOs).

1. Fill in the `[Interface]` block:
   - `PrivateKey =` your WireGuard private key (the content of
     `/etc/wireguard/wg0.privkey` from step 1).
   - `Address =` your assigned `/32` from the table above.
   - Leave `ListenPort = 51820` and `MTU = 1420` as-is.
2. **Delete the `[Peer]` block whose `PublicKey` matches your own**
   public key. WireGuard cannot peer with itself, and leaving the entry
   in will cause `wg-quick up` to fail with a "duplicate AllowedIPs" error.
3. Leave the other 13 `[Peer]` blocks exactly as written.

Two rules that catch most first-time configs:

- **`AllowedIPs` on every `[Peer]` is the peer's `/32`, never the whole
  `/19` overlay CIDR.** If you put `100.112.0.0/19` on a single peer,
  every overlay packet will get routed into that one tunnel and the
  mesh collapses.
- **`Address` in `[Interface]` is your single `/32`, not the `/19`.**
  Putting the supernet there makes the kernel ARP for every overlay
  address out of `wg0` and breaks routing.


## 4. Firewall

Open inbound UDP `51820` on your public endpoint from at least these
source IPs (the other 13 overlay participants):

```
3.125.87.204     # bgo (BitGo)
5.199.172.138    # bcw-moneygram
13.63.8.226      # aton (Alphacompute)
18.203.72.248    # Shielded (antelope-possum, eu-west-1c)
34.3.83.240      # bcw-worldpay
34.247.232.225   # Shielded (walleye-marlin, eu-west-1a)
35.212.116.191   # bcw-google
35.214.107.119   # bcw-vodafone
51.91.95.150     # ktg (Karatage)
52.18.156.146    # Shielded (grub-unicorn, eu-west-1b)
54.78.200.153    # Shielded (walleye-dodo, eu-west-1a)
64.130.55.173    # bkd-blockdaemon
64.130.61.171    # bkd-bullish
155.2.223.62     # twn-etoro
```

(Yes, your own IP is in that list. It does no harm; the list is
identical for everyone.)

A `0.0.0.0/0` allow is fine if your security posture permits it —
WireGuard rejects unknown public keys at the kernel before anything
else happens, so an open UDP port is not the risk it would be for
other services.


## 5. Bring up the tunnel

```sh
# Enable on boot:
sudo systemctl enable --now wg-quick@wg0

# Or, if you prefer one-shot:
sudo wg-quick up wg0
```

Reloading a running tunnel after a config edit (no flap):

```sh
sudo wg syncconf wg0 <(wg-quick strip wg0)
```


## 6. Verify

Run these on your validator host.

```sh
# (a) The interface exists and is up:
ip -4 addr show wg0
# Expected: a single inet 100.112.8.XXX/32 line matching your assigned address.

# (b) Handshakes are landing with every other peer:
wg show wg0 latest-handshakes
# Each peer row should have a timestamp that's at most a few minutes old.
# "0" (NEVER) on a row means that peer hasn't reciprocated yet.

# (c) Layer-3 reachability over the overlay:
ping -c3 100.112.0.10            # Shielded validator (walleye-marlin)
ping -c3 100.112.8.101           # aton (substitute any other peer)
# If your own [Interface] Address is .8.101, ping a different peer instead.

# (d) Reach libp2p on the overlay:
nc -vz 100.112.0.10 30333
```

If (a) is missing, the `[Interface]` block is wrong. If (b) shows
`NEVER` on a row, that peer hasn't loaded *your* `[Peer]` block on
their side yet (or your firewall is dropping their UDP). If (c) fails
but (b) is healthy, double-check the `AllowedIPs` line on the peer
you can't reach.


## 7. Add the overlay peers to midnight-node

Once the tunnel is up and pings work, point `midnight-node` at the
overlay peers as substrate `--reserved-nodes`. The full list (drop the
multiaddr that points at your own overlay address):

```
/ip4/100.112.0.10/tcp/30333/p2p/12D3KooWRX11CQN7KBr2fD2FKENu15sZ21hHeRhXNaVxoqdAuzeC
/ip4/100.112.0.11/tcp/30333/p2p/12D3KooWBYiS6bqdF4YNN2SMLfaDszSKMWgoTBMNHtocjCxjKCXG
/ip4/100.112.0.12/tcp/30333/p2p/12D3KooWQDC4wAtoAohAzUbLweRZoD9ra9SDkrZb6rBYkd9rSuDe
/ip4/100.112.0.13/tcp/30333/p2p/12D3KooWRa7DXBpT8n8cBRJy24zqsD8Ncv6yAWqxVuP2qdE6ASBX
/ip4/100.112.8.101/tcp/30333/p2p/12D3KooWRtS7HoM9C1MVomjWyvCoFF8vMScbGN55kec3VJXp31Er
/ip4/100.112.8.102/tcp/30333/p2p/12D3KooWGBZQYYjCpbafVpvP53oPxNjtJE63CGaUdeNigmJyz49G
/ip4/100.112.8.103/tcp/30333/p2p/12D3KooWLpdByoNAHvgHB4PuukinBHhXq9obxCSDf7ZcNsLKbGLp
/ip4/100.112.8.104/tcp/30333/p2p/12D3KooWLaf5nQzmrc6prZ5qVbf5xXyDywa5MfV9VcGch3W6KusK
/ip4/100.112.8.105/tcp/30333/p2p/12D3KooWAWQ7J5T55j9xq1X7EWTZQriKXkV7HWveNT6pjhJvDJdW
/ip4/100.112.8.106/tcp/30333/p2p/12D3KooWCUkHmepnfyuw4pcjJB4pgjZXHkTw8uQ8Ce65WsVdHE6e
/ip4/100.112.8.107/tcp/30333/p2p/12D3KooWLMfECVArGLqktn2VQvopvTLV7ZY9yXGAgRcpntpPkht9
/ip4/100.112.8.108/tcp/30333/p2p/12D3KooWFtvPa1W9RicKnuQfuxy8QsLncUdo9N1opNLh9DE3sdXH
/ip4/100.112.8.109/tcp/30333/p2p/12D3KooWB6VLipYQ8kAqjw66Wiw6NjP4uU1CZ1ymkkTkeiZbQR1c
/ip4/100.112.8.110/tcp/30333/p2p/12D3KooWNaeM9iiDeH6UGFCkkboP6awBLtwASGhUmBE2GPMmUTRv
```

Append each as `--reserved-nodes <multiaddr>` to your midnight-node
startup arguments (env var, helm value, systemd unit — whatever
mechanism you use).

**Do not set `--reserved-only` yet.** During this rollout the overlay
runs alongside normal public-network peering. Once every FNO has all
handshakes green and reserved-nodes wired, we will coordinate a flip
to `--reserved-only` so the validator only accepts overlay peers.


## 8. Troubleshooting

| Symptom | Likely cause |
|---|---|
| `wg-quick up wg0` fails with "duplicate AllowedIPs" | You left your own `[Peer]` block in. Remove the entry whose PublicKey matches your own. |
| `latest-handshakes` shows `0` on every peer | Your UDP/51820 inbound is blocked, or your `[Interface]` PrivateKey doesn't match the public key Shielded has for you. |
| `latest-handshakes` shows `0` on one or two peers only | Those peer operators haven't added you to their `wg0.conf` yet. |
| Handshakes succeed but `ping 100.112.x.y` fails | `AllowedIPs` on the peer block uses the wrong subnet — must be the peer's `/32`, not the `/19`. |
| midnight-node doesn't pick up overlay peers | `--reserved-nodes` flags not on the command line. Inspect `cat /proc/$(pgrep -f midnight-node)/cmdline` (and the env vars some deployments expand them through). |


## 9. Contact

Send the Shielded SRE team your handshake screenshot if anything
above goes wrong. Useful one-liner to paste back:

```sh
wg show wg0 | awk '/peer:|endpoint:|latest handshake:|transfer:/'
```

Redacts the private key automatically (only the public keys, endpoints,
handshake age, and byte counters appear).
