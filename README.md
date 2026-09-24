# VPS Control Panel

A self-hosted web control panel for managing Hostinger VPS instances via the Hostinger API. No hardcoded IPs or domains — everything is configurable on first use.

![Status](https://img.shields.io/badge/iteration-2-6c63ff) ![License](https://img.shields.io/badge/license-MIT-22c55e)

---

## How it works

```
Browser (your website)
    ↓ HTTPS
vps-proxy.js (running on your VPS, port 8080)
    ↓ HTTPS
developers.hostinger.com (Hostinger API)
```

The proxy runs on your VPS because Hostinger's shared hosting blocks outbound requests to their own API. The proxy handles forwarding and CORS so the browser can communicate freely.

---

## Files

| File | Purpose | Where it goes |
|------|---------|---------------|
| `index.html` | Control panel UI | Shared hosting `public_html/` |
| `vps-proxy.js` | API proxy server | VPS home directory `~/` |

---

## Prerequisites

- A Hostinger shared hosting account with a domain
- A Hostinger VPS
- SSH access to the VPS
- A Hostinger API token — generate at **hPanel → Profile → API**

---

## Setup

### Step 1 — Upload the control panel to shared hosting

Upload `index.html` to your domain's `public_html/` folder via cPanel File Manager or FTP.

---

### Step 2 — Open port 8080 on the VPS firewall

In **hPanel → VPS → your server → Firewall**, add a rule:

- **Action:** Accept
- **Protocol:** TCP
- **Port:** 8080
- **Source:** Any

Save the rule.

---

### Step 3 — Set up the proxy on the VPS

SSH into your VPS:

```bash
ssh root@YOUR_VPS_IP
```

Install Git and Node.js:

```bash
apt install git nodejs -y
```

Clone this repo:

```bash
git clone https://github.com/gielang/VPS-control.git
cd VPS-control
```

Generate a self-signed SSL certificate:

```bash
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/CN=YOUR_VPS_IP"
```

> The cert encrypts traffic between the browser and the proxy. It will show "Not Secure" in the browser since it's self-signed, but data is still encrypted.

---

### Step 4 — Run the proxy permanently with pm2

```bash
apt install npm -y
npm install -g pm2
pm2 start ~/VPS-control/vps-proxy.js
pm2 save
pm2 startup
```

Copy and run the command that `pm2 startup` prints. The proxy will now auto-start on every reboot.

Verify it's running:

```bash
pm2 status
```

---

### Step 5 — Trust the self-signed certificate (one time per browser)

Open this in your browser:

```
https://YOUR_VPS_IP:8080
```

Click **Advanced → Proceed to ... (unsafe)**. You'll see:

```json
{"error":"Missing or invalid ?path parameter"}
```

That confirms the proxy is working and your browser now trusts it.

---

### Step 6 — Use the control panel

1. Go to your domain (e.g. `https://yourdomain.com`)
2. Enter your **Proxy URL**: `https://YOUR_VPS_IP:8080`
3. Enter your **API Token**
4. Click **Connect**

Both values are saved in your browser's localStorage — you only need to enter them once.

---

## Features

- **Status dashboard** — hostname, state, IP, OS, CPU, RAM, disk, ID
- **Power controls** — Start, Stop, Restart
- **Snapshots** — Create, view, restore, delete
- **Settings** — Set hostname, set root password
- **Recent actions** — live action log with timestamps and status
- **Multi-VPS** — switch between all VPS instances under your account

---

## Configuration

### Restrict proxy to a specific domain (optional)

By default `vps-proxy.js` allows requests from any origin (`*`). To lock it to your domain:

```bash
ALLOW_ORIGIN=https://yourdomain.com pm2 start ~/VPS-control/vps-proxy.js
```

Or edit `vps-proxy.js` directly and change:

```js
const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN || '*';
```

---

## Changelog

### Iteration 2 *(2026-09-24)*
- Proxy URL and domain are now configurable — no more hardcoded IPs
- Both Proxy URL and API Token saved to localStorage on first use
- Removed hardcoded hostname auto-select
- Proxy now allows any origin by default (configurable via `ALLOW_ORIGIN` env var)

### Iteration 1 *(2026-09-22)*
- Initial release
- Single HTML control panel with Node.js proxy on VPS
- Start / Stop / Restart, snapshots, hostname, root password, actions log
