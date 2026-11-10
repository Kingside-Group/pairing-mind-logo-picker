# Pairing Mind logo picker

A five-step page for Chad and Kyle to choose the Pairing Mind logo, one decision at a time:

1. Symbol finish: flat, lifted flat, soft satin, defined edge
2. Wordmark: `pairing mind` or `pairing MIND`, in Plus Jakarta Sans, Archivo or Outfit
3. Lettering: lowercase or capital P, blue or plain "ai", medium or bold
4. Spacing: letters in each word, the gap between words, the gap to the symbol, symbol size
5. Review on light and dark, pick side-by-side or stacked, and download SVG or PNG

Every option shows on light and dark backgrounds. The address bar holds the current picks, so a copied link reopens the same logo.

## How it works

Plain HTML, CSS and JavaScript, with no build step. Logos are drawn as SVG and the letters are converted to outlines with [opentype.js](https://github.com/opentypejs/opentype.js) 1.3.4 (in `vendor/`). The preview and the download are the same drawing. Exported SVGs need no fonts.

`fonts/` holds fixed-weight copies (600 and 750) of each wordmark font, cut down to the letters in "pairing mind". Newsreader Italic 400 sets MIND. All are open-licensed (OFL; licenses alongside). The symbol geometry comes unchanged from `website/public/mark.svg`. The finishes come from the November 5 visual study (`output/visual-system-study-2026-11-05`).

## Run locally

```bash
python3 -m http.server 8131 --directory logo-picker
```

Open http://localhost:8131. It has to be served over http; opening the file directly blocks the font loading.
