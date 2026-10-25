# Aloi

A market research agent that runs in your terminal. Ask in plain language: the model calls tools
for live data, the numbers are worked out in code, charts are drawn in the terminal, and every
figure in the answer is checked against what was fetched.

**Website:** https://hicham-alaoui0.github.io/aloi-beta/

This repository holds the website, the install scripts and the releases. Aloi itself ships as a
compiled program.

## Install

Windows, in PowerShell:

```powershell
irm https://hicham-alaoui0.github.io/aloi-beta/install.ps1 | iex
```

macOS and Linux:

```bash
curl -fsSL https://hicham-alaoui0.github.io/aloi-beta/install.sh | sh
```

It installs for the current user, with no administrator rights and no Python. Then open a new
terminal and type `aloi`. The first run asks which model should answer and, on Windows, where
market data should come from.

The Windows build is in the [latest release](https://github.com/hicham-alaoui0/aloi-beta/releases/latest).
macOS and Linux builds follow. The program is not code-signed yet, so Windows may warn about it.

## What it runs on

- **A model:** Claude with your own Anthropic API key, or any chat model in Ollama on your machine.
- **Market data:** your Bloomberg Terminal through its local Desktop API, or Yahoo Finance for free.
- **Free sources** for what a terminal does not carry: crypto, economic series, filings, news,
  prediction markets.
- **Paper trading:** a built-in paper portfolio, or your Interactive Brokers paper account through
  IB Gateway. Every order waits for you to type y.

## Notes

Aloi gives analysis, not investment advice. It is beta software, free during the beta under the
[beta licence](LICENSE.txt). It is not affiliated with Bloomberg, Anthropic, Yahoo, Interactive
Brokers or any other provider; their names are their trademarks.

Problems and ideas: [open an issue](https://github.com/hicham-alaoui0/aloi-beta/issues).
