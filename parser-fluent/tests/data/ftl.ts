import { Message, parse, Term } from '@fluent/syntax';

// The loader recipe of the README: an `.ftl` file read into the table base
// takes - a message's pattern under its id, each attribute under `id.name` -
// and its terms, for `parser({ terms })`.
export const readFtl = (source: string) => {
  const { body } = parse(source, { withSpans: true });
  const text = ({ span }: { span?: { start: number; end: number } | null }) => source.slice(span!.start, span!.end);
  const messages: Record<string, string> = {};
  const terms: string[] = [];

  body.forEach((entry) => {
    if (entry instanceof Term) terms.push(text(entry));
    if (!(entry instanceof Message)) return;
    if (entry.value) messages[entry.id.name] = text(entry.value);
    entry.attributes.forEach((attribute) => {
      messages[`${entry.id.name}.${attribute.id.name}`] = text(attribute.value);
    });
  });

  return { messages, terms: terms.join('\n') };
};
