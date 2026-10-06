# Benchmark

What `npm run bench` measured on `@sveltekit-i18n/parser-i18next` 3.0.4, written by the release that published it. A pull request compares its branch with its base in a comment; this file keeps the figures of each release beside its code.

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
| parser(options) | 20.3 µs | 20.1 µs to 21.2 µs |
| parse, plain text, a message parsed for the first time | 0.279 µs | 0.276 µs to 0.29 µs |
| parse, plain text, the same message again | 0.608 µs | 0.598 µs to 0.613 µs |
| extractParams, plain text | 0.692 µs | 0.661 µs to 0.704 µs |
| parse, one placeholder, a message parsed for the first time | 0.889 µs | 0.857 µs to 0.915 µs |
| parse, one placeholder, the same message again | 0.796 µs | 0.785 µs to 0.807 µs |
| extractParams, one placeholder | 0.673 µs | 0.636 µs to 0.71 µs |
| parse, number, a message parsed for the first time | 2.31 µs | 2.24 µs to 2.34 µs |
| parse, number, the same message again | 2.1 µs | 2.09 µs to 2.13 µs |
| extractParams, number | 0.736 µs | 0.727 µs to 0.806 µs |
| parse, date, a message parsed for the first time | 2.42 µs | 2.41 µs to 2.46 µs |
| parse, date, the same message again | 2.37 µs | 2.36 µs to 2.41 µs |
| extractParams, date | 0.7 µs | 0.695 µs to 0.71 µs |
| extractParams over a catalogue of 10,000 messages | 5.9 ms | 5.69 ms to 6.09 ms |

## Heap

Bytes of the JavaScript heap a parser holds, the same on every run of one Node version, to a fraction of a byte.

| Row | Median | Spread |
| --- | ---: | --- |
| JS heap held per parser built and dropped, from 200 to 600 parsers | 0.2 B/parser | 0.2 B/parser |
| JS heap held per message parsed, from 2,500 to 5,000 messages | 0 B/message | 0 B/message |
| JS heap held per message parsed, from 20,000 to 60,000 messages | 0 B/message | 0 B/message |
| JS heap held per parse of a message parsed before, over 40,000 parses | 0 B/parse | 0 B/parse |
