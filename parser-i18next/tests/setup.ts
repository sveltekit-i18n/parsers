// The first `Intl` formatters a test worker builds are slow to build, and a
// slow Windows runner has taken over five seconds. Building them here keeps
// that out of the timeout of whichever test formats first.
new Intl.NumberFormat('en').format(0);
new Intl.DateTimeFormat('en').format(0);
new Intl.RelativeTimeFormat('en').format(0, 'day');
new Intl.ListFormat('en').format([]);
