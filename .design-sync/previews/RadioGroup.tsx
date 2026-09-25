import { Panel, RadioGroup } from 'pretty-panels';

const noop = () => {};

/** The canonical use: few, short options — otherwise reach for `Select`. */
export function Transform() {
  return (
    <Panel title="Transform" width={320}>
      <RadioGroup label="Up axis" hint="Exclusive choice" value="y" options={['x', 'y', 'z']} onChange={noop} />
      <RadioGroup
        label="Preview"
        hint="One option is disabled"
        value="med"
        options={[
          { value: 'low', label: 'lo' },
          { value: 'med', label: 'md' },
          { value: 'high', label: 'hi', disabled: true },
        ]}
        onChange={noop}
      />
    </Panel>
  );
}

/** `disabled` on the group dims every choice at once. */
export function States() {
  return (
    <Panel title="States" width={320}>
      <RadioGroup label="Enabled" value="b" options={['a', 'b', 'c']} onChange={noop} />
      <RadioGroup label="Whole group disabled" hint="Selection still reads" value="b" options={['a', 'b', 'c']} disabled onChange={noop} />
    </Panel>
  );
}
