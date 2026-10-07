# Benchmark

What `npm run bench` measured on `@sveltekit-i18n/parser-i18next` 3.0.5, written by the release that published it. A pull request compares its branch with its base in a comment; this file keeps the figures of each release beside its code.

Node v24.21.0, linux x64; times are medians of 11 processes, each the median of its rounds, and heap held is the median of as many processes again, each giving one reading per row. A spread leaves out a quarter of a row's samples, rounded down, at each end. Sizes include the parser's dependencies. Heap held is the JavaScript heap: what ICU allocates for an `Intl` object is outside it.
Dependencies: i18next 26.4.2.

## Sizes

Bytes of a browser bundle, the dependencies included: the same on every machine.

| Row | Value |
| --- | ---: |
| browser bundle of parser(), minified | 45,335 B |
| browser bundle of parser(), minified and gzipped | 14,661 B |
| browser bundle of parser() and extractParamsFactory, minified | 46,495 B |
| browser bundle of parser() and extractParamsFactory, minified and gzipped | 15,171 B |

## Times

Microseconds and milliseconds, of one machine at one time: compare them only with figures measured beside them.

| Row | Median | Spread |
| --- | ---: | --- |
| parser(options) | 28.2 µs | 28.1 µs to 28.6 µs |
| parse, plain text, a message parsed for the first time | 0.648 µs | 0.607 µs to 0.714 µs |
| parse, plain text, the same message again | 0.816 µs | 0.81 µs to 0.829 µs |
| extractParams, plain text | 1.01 µs | 0.928 µs to 1.03 µs |
| parse, one placeholder, a message parsed for the first time | 1.41 µs | 1.4 µs to 1.43 µs |
| parse, one placeholder, the same message again | 1.15 µs | 1.12 µs to 1.16 µs |
| extractParams, one placeholder | 1.08 µs | 1.05 µs to 1.17 µs |
| parse, number, a message parsed for the first time | 3.88 µs | 3.85 µs to 3.89 µs |
| parse, number, the same message again | 3.64 µs | 3.62 µs to 3.68 µs |
| extractParams, number | 1.3 µs | 1.26 µs to 1.33 µs |
| parse, date, a message parsed for the first time | 4.27 µs | 4.23 µs to 4.29 µs |
| parse, date, the same message again | 4.29 µs | 4.14 µs to 4.33 µs |
| extractParams, date | 1.23 µs | 1.22 µs to 1.27 µs |
| extractParams over a catalogue of 10,000 messages | 9.28 ms | 9.19 ms to 9.44 ms |

## Heap

Bytes of the JavaScript heap a parser holds, the same on every run of one Node version, to a fraction of a byte.

| Row | Median | Spread |
| --- | ---: | --- |
| JS heap held per parser built and dropped, from 200 to 600 parsers | 0.2 B/parser | 0.2 B/parser |
| JS heap held per message parsed, from 2,500 to 5,000 messages | 0 B/message | 0 B/message |
| JS heap held per message parsed, from 20,000 to 60,000 messages | 0 B/message | 0 B/message |
| JS heap held per parse of a message parsed before, over 40,000 parses | 0 B/parse | 0 B/parse |
