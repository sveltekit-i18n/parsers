# Benchmark

What `npm run bench` measured on `@sveltekit-i18n/parser-mf2` 3.1.0, written by the release that published it. A pull request compares its branch with its base in a comment; this file keeps the figures of each release beside its code.

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
| parser(options) | 1.11 µs | 1.1 µs to 1.12 µs |
| parse, plain text, a message parsed for the first time | 5.19 µs | 5.15 µs to 5.28 µs |
| parse, plain text, the same message again | 0.0831 µs | 0.0819 µs to 0.0859 µs |
| extractParams, plain text | 0.349 µs | 0.322 µs to 0.501 µs |
| parse, one placeholder, a message parsed for the first time | 4.26 µs | 4.25 µs to 4.29 µs |
| parse, one placeholder, the same message again | 0.533 µs | 0.523 µs to 0.548 µs |
| extractParams, one placeholder | 0.827 µs | 0.808 µs to 0.833 µs |
| parse, plural, a message parsed for the first time | 28.6 µs | 28.2 µs to 29.1 µs |
| parse, plural, the same message again | 21.4 µs | 21.3 µs to 21.5 µs |
| extractParams, plural | 5.38 µs | 5.17 µs to 5.5 µs |
| parse, select, a message parsed for the first time | 6.85 µs | 6.72 µs to 6.95 µs |
| parse, select, the same message again | 0.692 µs | 0.689 µs to 0.699 µs |
| extractParams, select | 3.46 µs | 3.39 µs to 3.53 µs |
| parse, number, a message parsed for the first time | 18 µs | 17.9 µs to 18.1 µs |
| parse, number, the same message again | 13.7 µs | 13.7 µs to 13.8 µs |
| extractParams, number | 1.06 µs | 1.04 µs to 1.07 µs |
| parse, date, a message parsed for the first time | 38.8 µs | 38.5 µs to 39.5 µs |
| parse, date, the same message again | 33.4 µs | 33.2 µs to 33.6 µs |
| extractParams, date | 1.17 µs | 1.14 µs to 1.19 µs |
| extractParams over a catalogue of 10,000 messages | 15.9 ms | 15.6 ms to 16.1 ms |

## Heap

Bytes of the JavaScript heap a parser holds, the same on every run of one Node version, to a fraction of a byte.

| Row | Median | Spread |
| --- | ---: | --- |
| JS heap held per parser built and dropped, from 200 to 600 parsers | 0 B/parser | 0 B/parser |
| JS heap held per message parsed, from 2,502 to 4,998 messages | 1,825.9 B/message | 1,825.9 B/message to 1,826 B/message |
| JS heap held per message parsed, from 19,998 to 60,000 messages | 0 B/message | 0 B/message |
| JS heap held per parse of a message parsed before, over 40,000 parses | 0 B/parse | 0 B/parse |
