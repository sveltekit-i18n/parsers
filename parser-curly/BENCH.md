# Benchmark

What `npm run bench` measured on `@sveltekit-i18n/parser-curly` 3.2.1, written by the release that published it. A pull request compares its branch with its base in a comment; this file keeps the figures of each release beside its code.

Node v24.21.0, linux x64; times are medians of 11 processes, each the median of its rounds, and heap held is the median of as many processes again, each giving one reading per row. A spread leaves out a quarter of a row's samples, rounded down, at each end. Sizes include the parser's dependencies. Heap held is the JavaScript heap: what ICU allocates for an `Intl` object is outside it.
Dependencies: @curly-message/parser 3.1.1.

## Sizes

Bytes of a browser bundle, the dependencies included: the same on every machine.

| Row | Value |
| --- | ---: |
| browser bundle of parser(), minified | 12,842 B |
| browser bundle of parser(), minified and gzipped | 5,162 B |
| browser bundle of parser() and extractParamsFactory, minified | 14,027 B |
| browser bundle of parser() and extractParamsFactory, minified and gzipped | 5,660 B |

## Times

Microseconds and milliseconds, of one machine at one time: compare them only with figures measured beside them.

| Row | Median | Spread |
| --- | ---: | --- |
| parser(options) | 0.0433 µs | 0.0425 µs to 0.0455 µs |
| parse, plain text, a message parsed for the first time | 0.964 µs | 0.862 µs to 1.1 µs |
| parse, plain text, the same message again | 0.712 µs | 0.702 µs to 0.757 µs |
| extractParams, plain text | 0.385 µs | 0.266 µs to 0.425 µs |
| parse, one placeholder, a message parsed for the first time | 2.38 µs | 2.36 µs to 2.72 µs |
| parse, one placeholder, the same message again | 2.16 µs | 2.14 µs to 2.18 µs |
| extractParams, one placeholder | 1.65 µs | 1.6 µs to 1.95 µs |
| parse, plural, a message parsed for the first time | 13.9 µs | 13.3 µs to 15 µs |
| parse, plural, the same message again | 12.4 µs | 12.3 µs to 12.5 µs |
| extractParams, plural | 5.46 µs | 5.42 µs to 5.54 µs |
| parse, select, a message parsed for the first time | 6.04 µs | 6.03 µs to 6.11 µs |
| parse, select, the same message again | 5.89 µs | 5.82 µs to 6.08 µs |
| extractParams, select | 4.47 µs | 4.41 µs to 4.56 µs |
| parse, number, a message parsed for the first time | 5.07 µs | 5.05 µs to 5.12 µs |
| parse, number, the same message again | 5.11 µs | 5.06 µs to 5.24 µs |
| extractParams, number | 2.48 µs | 2.45 µs to 2.52 µs |
| parse, date, a message parsed for the first time | 4.66 µs | 4.61 µs to 4.76 µs |
| parse, date, the same message again | 4.86 µs | 4.83 µs to 4.96 µs |
| extractParams, date | 2.3 µs | 2.28 µs to 2.35 µs |
| extractParams over a catalogue of 10,000 messages | 26.9 ms | 26.5 ms to 26.9 ms |

## Heap

Bytes of the JavaScript heap a parser holds, the same on every run of one Node version, to a fraction of a byte.

| Row | Median | Spread |
| --- | ---: | --- |
| JS heap held per parser built and dropped, from 200 to 600 parsers | 0 B/parser | 0 B/parser |
| JS heap held per message parsed, from 2,502 to 4,998 messages | 0 B/message | 0 B/message |
| JS heap held per message parsed, from 19,998 to 60,000 messages | 0 B/message | 0 B/message |
| JS heap held per parse of a message parsed before, over 40,000 parses | 0 B/parse | 0 B/parse |
