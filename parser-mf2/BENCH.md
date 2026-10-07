# Benchmark

What `npm run bench` measured on `@sveltekit-i18n/parser-mf2` 3.1.1, written by the release that published it. A pull request compares its branch with its base in a comment; this file keeps the figures of each release beside its code.

Node v24.21.0, linux x64; times are medians of 11 processes, each the median of its rounds, and heap held is the median of as many processes again, each giving one reading per row. A spread leaves out a quarter of a row's samples, rounded down, at each end. Sizes include the parser's dependencies. Heap held is the JavaScript heap: what ICU allocates for an `Intl` object is outside it.
Dependencies: messageformat 4.0.0.

## Sizes

Bytes of a browser bundle, the dependencies included: the same on every machine.

| Row | Value |
| --- | ---: |
| browser bundle of parser(), minified | 24,310 B |
| browser bundle of parser(), minified and gzipped | 8,140 B |
| browser bundle of parser() and extractParamsFactory, minified | 26,216 B |
| browser bundle of parser() and extractParamsFactory, minified and gzipped | 8,864 B |

## Times

Microseconds and milliseconds, of one machine at one time: compare them only with figures measured beside them.

| Row | Median | Spread |
| --- | ---: | --- |
| parser(options) | 1.95 µs | 1.83 µs to 2.04 µs |
| parse, plain text, a message parsed for the first time | 9.55 µs | 9.33 µs to 9.92 µs |
| parse, plain text, the same message again | 0.183 µs | 0.181 µs to 0.187 µs |
| extractParams, plain text | 0.562 µs | 0.531 µs to 0.627 µs |
| parse, one placeholder, a message parsed for the first time | 8.83 µs | 8.72 µs to 8.98 µs |
| parse, one placeholder, the same message again | 0.866 µs | 0.852 µs to 0.872 µs |
| extractParams, one placeholder | 1.57 µs | 1.38 µs to 1.6 µs |
| parse, plural, a message parsed for the first time | 92.8 µs | 92.1 µs to 93.8 µs |
| parse, plural, the same message again | 63.8 µs | 63.2 µs to 64.1 µs |
| extractParams, plural | 8.51 µs | 8.37 µs to 8.72 µs |
| parse, select, a message parsed for the first time | 16 µs | 15 µs to 16.8 µs |
| parse, select, the same message again | 1.18 µs | 1.17 µs to 1.19 µs |
| extractParams, select | 6.26 µs | 6.06 µs to 6.56 µs |
| parse, number, a message parsed for the first time | 58.4 µs | 58.2 µs to 58.6 µs |
| parse, number, the same message again | 39.7 µs | 39.5 µs to 39.9 µs |
| extractParams, number | 1.7 µs | 1.66 µs to 1.71 µs |
| parse, date, a message parsed for the first time | 117 µs | 116 µs to 118 µs |
| parse, date, the same message again | 92.8 µs | 91.8 µs to 94 µs |
| extractParams, date | 1.68 µs | 1.64 µs to 2.06 µs |
| extractParams over a catalogue of 10,000 messages | 32.9 ms | 29.4 ms to 33.6 ms |

## Heap

Bytes of the JavaScript heap a parser holds, the same on every run of one Node version, to a fraction of a byte.

| Row | Median | Spread |
| --- | ---: | --- |
| JS heap held per parser built and dropped, from 200 to 600 parsers | 0 B/parser | 0 B/parser |
| JS heap held per message parsed, from 2,502 to 4,998 messages | 1,825.9 B/message | 1,825.9 B/message to 1,826 B/message |
| JS heap held per message parsed, from 19,998 to 60,000 messages | 0 B/message | 0 B/message |
| JS heap held per parse of a message parsed before, over 40,000 parses | 0 B/parse | 0 B/parse |
