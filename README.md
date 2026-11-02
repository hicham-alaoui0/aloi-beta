# Aloi

A market research agent that runs in your terminal. Ask in plain language: the model calls tools
for live data, the numbers are worked out in code, charts are drawn in the terminal, and every
figure in the answer is checked against what was fetched.

**Website:** https://hicham-alaoui0.github.io/aloi-beta/

This repository holds the website. Aloi is in private testing and not available for download yet:
the website shows what it does.

## What it runs on

- **A model:** Claude with your own Anthropic API key, or any chat model in Ollama on your machine.
- **Market data:** your Bloomberg Terminal through its local Desktop API, or Yahoo Finance for free.
- **Free sources** for what a terminal does not carry: crypto, economic series, filings, news,
  prediction markets.
- **Expert mode:** put `/deep` before a question. Your model gathers the data, Claude Opus reads it
  once and decides, and an investment committee reviews the answer before you see it.
- **Expert tools:** hedge design sized to beta, factor exposures, the market's regime, what history says
  after a setup, and valuation against history and peers with the growth the price implies.
- **Paper trading:** a built-in paper portfolio, or your Interactive Brokers paper account through
  IB Gateway. Every order waits for you to type y.

## Notes

Aloi gives analysis, not investment advice. It is not affiliated with Bloomberg, Anthropic, Yahoo, Interactive
Brokers or any other provider; their names are their trademarks.

Problems and ideas: [open an issue](https://github.com/hicham-alaoui0/aloi-beta/issues).
