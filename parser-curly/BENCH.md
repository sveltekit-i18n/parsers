# Benchmark

What `npm run bench` measured on `@sveltekit-i18n/parser-curly` 3.2.2, written by the release that published it. A pull request compares its branch with its base in a comment; this file keeps the figures of each release beside its code.

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
| parser(options) | 0.0451 µs | 0.0412 µs to 0.0477 µs |
| parse, plain text, a message parsed for the first time | 1 µs | 0.959 µs to 1.11 µs |
| parse, plain text, the same message again | 0.767 µs | 0.763 µs to 0.786 µs |
| extractParams, plain text | 0.287 µs | 0.277 µs to 0.462 µs |
| parse, one placeholder, a message parsed for the first time | 2.38 µs | 2.35 µs to 2.55 µs |
| parse, one placeholder, the same message again | 2.17 µs | 2.15 µs to 2.19 µs |
| extractParams, one placeholder | 1.62 µs | 1.6 µs to 2.03 µs |
| parse, plural, a message parsed for the first time | 14.5 µs | 14 µs to 15.4 µs |
| parse, plural, the same message again | 12.7 µs | 12.6 µs to 13.1 µs |
| extractParams, plural | 5.41 µs | 5.4 µs to 5.53 µs |
| parse, select, a message parsed for the first time | 6.12 µs | 6.03 µs to 6.14 µs |
| parse, select, the same message again | 6.15 µs | 5.93 µs to 6.87 µs |
| extractParams, select | 4.45 µs | 4.43 µs to 4.59 µs |
| parse, number, a message parsed for the first time | 5.36 µs | 5.28 µs to 5.41 µs |
| parse, number, the same message again | 5.35 µs | 5.28 µs to 5.55 µs |
| extractParams, number | 2.38 µs | 2.37 µs to 2.48 µs |
| parse, date, a message parsed for the first time | 4.76 µs | 4.73 µs to 4.8 µs |
| parse, date, the same message again | 5.07 µs | 5.04 µs to 5.11 µs |
| extractParams, date | 2.26 µs | 2.21 µs to 2.28 µs |
| extractParams over a catalogue of 10,000 messages | 27 ms | 26.9 ms to 27.2 ms |

## Heap

Bytes of the JavaScript heap a parser holds, the same on every run of one Node version, to a fraction of a byte.

| Row | Median | Spread |
| --- | ---: | --- |
| JS heap held per parser built and dropped, from 200 to 600 parsers | 0 B/parser | 0 B/parser |
| JS heap held per message parsed, from 2,502 to 4,998 messages | 0 B/message | 0 B/message |
| JS heap held per message parsed, from 19,998 to 60,000 messages | 0 B/message | 0 B/message |
| JS heap held per parse of a message parsed before, over 40,000 parses | 0 B/parse | 0 B/parse |
