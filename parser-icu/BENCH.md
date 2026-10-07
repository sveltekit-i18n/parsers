# Benchmark

What `npm run bench` measured on `@sveltekit-i18n/parser-icu` 3.1.1, written by the release that published it. A pull request compares its branch with its base in a comment; this file keeps the figures of each release beside its code.

Node v24.21.0, linux x64; times are medians of 11 processes, each the median of its rounds, and heap held is the median of as many processes again, each giving one reading per row. A spread leaves out a quarter of a row's samples, rounded down, at each end. Sizes include the parser's dependencies. Heap held is the JavaScript heap: what ICU allocates for an `Intl` object is outside it.
Dependencies: intl-messageformat 12.1.3.

## Sizes

Bytes of a browser bundle, the dependencies included: the same on every machine.

| Row | Value |
| --- | ---: |
| browser bundle of parser(), minified | 36,000 B |
| browser bundle of parser(), minified and gzipped | 10,930 B |
| browser bundle of parser() and extractParamsFactory, minified | 37,464 B |
| browser bundle of parser() and extractParamsFactory, minified and gzipped | 11,501 B |

## Times

Microseconds and milliseconds, of one machine at one time: compare them only with figures measured beside them.

| Row | Median | Spread |
| --- | ---: | --- |
| parser(options) | 0.39 µs | 0.332 µs to 0.494 µs |
| parse, plain text, a message parsed for the first time | 7.77 µs | 7.74 µs to 7.93 µs |
| parse, plain text, the same message again | 0.149 µs | 0.144 µs to 0.191 µs |
| extractParams, plain text | 1.15 µs | 1.14 µs to 1.18 µs |
| parse, one placeholder, a message parsed for the first time | 9.17 µs | 8.99 µs to 9.51 µs |
| parse, one placeholder, the same message again | 0.565 µs | 0.561 µs to 0.57 µs |
| extractParams, one placeholder | 2.26 µs | 2.24 µs to 2.3 µs |
| parse, plural, a message parsed for the first time | 15.8 µs | 15.8 µs to 15.9 µs |
| parse, plural, the same message again | 2.45 µs | 2.44 µs to 2.46 µs |
| extractParams, plural | 6.34 µs | 6.31 µs to 6.41 µs |
| parse, select, a message parsed for the first time | 12.3 µs | 12.3 µs to 12.4 µs |
| parse, select, the same message again | 0.419 µs | 0.402 µs to 0.426 µs |
| extractParams, select | 7.02 µs | 6.52 µs to 8.14 µs |
| parse, number, a message parsed for the first time | 10.5 µs | 10.4 µs to 10.7 µs |
| parse, number, the same message again | 1.33 µs | 1.31 µs to 1.35 µs |
| extractParams, number | 2.55 µs | 2.53 µs to 2.57 µs |
| parse, date, a message parsed for the first time | 11.2 µs | 11.1 µs to 11.2 µs |
| parse, date, the same message again | 1.63 µs | 1.62 µs to 1.65 µs |
| extractParams, date | 2.45 µs | 2.44 µs to 2.47 µs |
| extractParams over a catalogue of 10,000 messages | 33.2 ms | 32.7 ms to 33.5 ms |

## Heap

Bytes of the JavaScript heap a parser holds, the same on every run of one Node version, to a fraction of a byte.

| Row | Median | Spread |
| --- | ---: | --- |
| JS heap held per parser built and dropped, from 200 to 600 parsers | 0 B/parser | 0 B/parser |
| JS heap held per message parsed, from 2,502 to 4,998 messages | 2,804.6 B/message | 2,804.6 B/message |
| JS heap held per message parsed, from 19,998 to 60,000 messages | 0 B/message | 0 B/message |
| JS heap held per parse of a message parsed before, over 40,000 parses | 0 B/parse | 0 B/parse |
