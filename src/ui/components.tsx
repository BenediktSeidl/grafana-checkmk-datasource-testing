import React from 'react';
import { SelectableValue } from '@grafana/data';
import { InlineField, InlineFieldRow, AsyncSelect, Select as GrafanaSelect } from '@grafana/ui';
import { RequestSpec, FullRequestSpec, RequestSpecNegatableOptionKeys, RequestSpecStringKeys } from '../RequestSpec';
import { get } from 'lodash';
import { titleCase } from '../utils';

// function findOption<T>(value: T, options: Array<SelectableValue<T>>): SelectableValue<T> | undefined {
//   return options.filter((elem) => Object.is(value, elem.value))[0];
// }

export interface SelectProps<Key extends RequestSpecStringKeys> {
  label?: string;
  autocompleter: (prefix: string) => Promise<Array<SelectableValue<NonNullable<FullRequestSpec[Key]>>>>;
  onChange: (value: FullRequestSpec[Key]) => void;
  value: FullRequestSpec[Key];
}

export const CheckMkSelect = <Key extends RequestSpecStringKeys>(props: SelectProps<Key>) => {
  const { autocompleter, value, onChange, label } = props;
  const [options, setOptions] = React.useState([] as Array<SelectableValue<FullRequestSpec[Key]>>);
  const [counter, setCounter] = React.useState(0);
  let placeholder = 'Type to trigger search';

  function findValueInOptions() {
    const result = options.find((opt) => opt.value === value);
    if (result) {
      return result;
    }
    if (value !== undefined) {
      placeholder = `Could not find '${value}'`;
    }
    return null;
  }

  const loadOptions = React.useCallback(
    (inputValue: string): Promise<Array<SelectableValue[Key]>> => {
      return autocompleter(inputValue).then((data) => {
        setOptions(data);
        return data;
      });
    },
    [autocompleter]
  );

  React.useEffect(() => {
    setOptions([]);
    setCounter((c) => c + 1);
  }, [autocompleter, label]);

  const changed = (newValue: SelectableValue<FullRequestSpec[Key]>) => {
    if (newValue.value === undefined) {
      throw new Error('Please report this error!');
    }
    onChange(newValue.value);
  };

  return (
    <InlineField labelWidth={14} label={props.label}>
      <AsyncSelect
        inputId={`input_${props.label}`}
        onChange={changed}
        defaultOptions={true}
        // there seems to be no official way to re-trigger the async select field
        // but there are many hacks: https://github.com/JedWatson/react-select/issues/1581
        key={`${Math.max(1, counter)}`} // ignore the first update
        loadOptions={loadOptions}
        width={32}
        value={findValueInOptions()}
        placeholder={placeholder}
      />
    </InlineField>
  );
};

export interface FilterProps<T extends RequestSpecNegatableOptionKeys> {
  label: string;
  requestSpec: RequestSpec;
  requestSpecKey: T;
  update: (rq: RequestSpec, key: keyof RequestSpec, value: unknown) => void;
}

//const Filter = <T extends RequestSpecNegatableOptionKeys>(props: FilterProps<T>) => {
//  const onValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
//    props.update(props.requestSpec, props.requestSpecKey, {
//      value: event.target.value,
//      negated: props.requestSpec[props.requestSpecKey]?.negated ?? false,
//    });
//  };
//
//  const onNegateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
//    const checked = event.target.checked;
//    props.update(props.requestSpec, props.requestSpecKey, {
//      negated: checked,
//      value: props.requestSpec[props.requestSpecKey]?.value ?? '',
//    });
//  };
//
//  return (
//    <HorizontalGroup>
//      <InlineField label={props.label} labelWidth={14}>
//        <Input
//          width={32}
//          type="text"
//          value={props.requestSpec[props.requestSpecKey]?.value}
//          onChange={onValueChange}
//          placeholder="none"
//        />
//      </InlineField>
//      <Checkbox label="Negate" value={props.requestSpec[props.requestSpecKey]?.negated} onChange={onNegateChange} />
//    </HorizontalGroup>
//  );
//};

//const SingleTag = (props: {
//  index: number;
//  requestSpec: RequestSpec;
//  setTag(value: TagValue, rq: RequestSpec): void;
//  autocompleteTagGroups(value: string): Promise<Array<SelectableValue<string>>>;
//  autocompleteTagOptions(group: string, value: string): Promise<Array<SelectableValue<string>>>;
//  dependantOn: unknown[];
//}) => {
//  const { dependantOn } = props;
//  const tagValue = props.requestSpec.host_tags ? props.requestSpec.host_tags[props.index] : {};
//  const [group, setGroup] = React.useState<SelectableValue<string> | undefined>();
//  const [groupOptions, setGroupOptions] = React.useState<Array<SelectableValue<string>>>([]);
//  const [operator, setOperator] = React.useState('is');
//  const [tag, setTag] = React.useState<SelectableValue<string> | undefined>();
//  const [tagOptions, setTagOptions] = React.useState<Array<SelectableValue<string>>>([]);
//
//  React.useEffect(() => {
//    async function inner() {
//      setGroupOptions(await props.autocompleteTagGroups(''));
//    }
//
//    inner();
//  }, [dependantOn, props]);
//
//  React.useEffect(() => {
//    async function inner() {
//      setTagOptions(await props.autocompleteTagOptions(tagValue.group ?? '', ''));
//    }
//
//    inner();
//  }, [group, dependantOn, props, tagValue.group]);
//
//  React.useEffect(() => {
//    async function inner() {
//      setGroup(findOption(tagValue.group ?? '', groupOptions));
//      if (tagValue.operator) {
//        setOperator(tagValue.operator);
//      }
//      if (tagValue.group) {
//        setTag(findOption(tagValue.tag ?? '', tagOptions));
//      }
//    }
//
//    inner();
//  }, [dependantOn, groupOptions, tagOptions, tagValue.group, tagValue.operator, tagValue.tag]);
//
//  const publishState = (value: TagValue) => {
//    props.setTag(value, props.requestSpec);
//  };
//
//  const tagOperators = [
//    { value: 'is', label: '=' },
//    { value: 'is not', label: '≠' },
//  ];
//
//  return (
//    <HorizontalGroup>
//      <Label>Host tag {props.index}: </Label>
//      <GrafanaSelect
//        onChange={(val) => publishState({ ...tagValue, group: val.value ?? '' })}
//        options={groupOptions}
//        value={group}
//      />
//      <GrafanaSelect
//        width={8}
//        options={tagOperators}
//        onChange={(val) => publishState({ ...tagValue, operator: val.value ?? 'is' })}
//        value={operator}
//      />
//      <GrafanaSelect
//        onChange={(val) => publishState({ ...tagValue, tag: val.value ?? '' })}
//        options={tagOptions}
//        value={tag}
//      />
//    </HorizontalGroup>
//  );
//};
//
//const HostTagFilter: React.FC<{
//  requestSpec: RequestSpec;
//  update: (rq: RequestSpec, key: 'host_tags', value: TagValue[]) => void;
//  autocompleteTagGroups(value: string): Promise<Array<SelectableValue<string>>>;
//  autocompleteTagOptions(group: string, value: string): Promise<Array<SelectableValue<string>>>;
//  dependantOn: unknown[];
//}> = (props) => {
//  const { autocompleteTagGroups, autocompleteTagOptions } = props;
//
//  const setTagAtIndex = (index: number, value: TagValue, rq: RequestSpec) => {
//    if (isUndefined(value.operator)) {
//      value.operator = 'is';
//    }
//
//    const tags = rq.host_tags?.slice() ?? [{}, {}, {}];
//    tags[index] = value;
//    props.update(props.requestSpec, 'host_tags', tags);
//  };
//
//  return (
//    <VerticalGroup spacing="sm">
//      {[...Array(3)].map((_, index) => (
//        <SingleTag
//          key={index}
//          index={index}
//          setTag={setTagAtIndex.bind(undefined, index)}
//          autocompleteTagGroups={autocompleteTagGroups}
//          autocompleteTagOptions={autocompleteTagOptions}
//          requestSpec={props.requestSpec}
//          dependantOn={dependsOnSite(props.requestSpec)}
//        />
//      ))}
//    </VerticalGroup>
//  );
//};
//
//const HostLabelFilter: React.FC<{
//  requestSpec: RequestSpec;
//  update: (rq: RequestSpec, labels: 'host_labels', value: string[]) => void;
//  autocomplete: (value: string) => Promise<Array<SelectableValue<string>>>;
//  dependantOn: unknown[];
//}> = (props) => {
//  const { autocomplete } = props;
//  const [labels, setLabels] = React.useState([] as Array<SelectableValue<string>>);
//
//  // TODO: are label values == label labels?
//
//  const onLabelsChange = (items: Array<SelectableValue<string>>) => {
//    setLabels(items);
//    props.update(
//      props.requestSpec,
//      'host_labels',
//      labels.map((val) => val.value).filter((val) => !isUndefined(val)) as string[]
//    );
//  };
//
//  return (
//    <InlineField label="Host labels" labelWidth={14}>
//      <AsyncMultiSelect
//        width={32}
//        defaultOptions
//        loadOptions={autocomplete}
//        onChange={onLabelsChange}
//        value={labels}
//        placeholder="Type to trigger search"
//      />
//    </InlineField>
//  );
//};
//
//const OnlyActiveChildren = (props: {
//  children: JSX.Element[];
//  update: (rq: RequestSpec, key: string, value: unknown) => void;
//  removeComponent: (name: string) => void;
//  activeComponents: string[];
//  requestSpec: RequestSpec;
//}): JSX.Element => {
//  function cleanup(name: string) {
//    props.removeComponent(name);
//    props.update(props.requestSpec, name, undefined);
//  }
//
//  // eslint-disable-next-line @typescript-eslint/no-explicit-any
//  function getName(elem: any) {
//    return elem.props['data-name'];
//  }
//
//  return (
//    <VerticalGroup>
//      {React.Children.toArray(props.children)
//        .filter((elem) => props.activeComponents.includes(getName(elem)))
//        .map((elem) => (
//          <HorizontalGroup key={getName(elem)}>
//            <Button icon="minus" variant="secondary" onClick={() => cleanup(getName(elem))} />
//            {elem}
//          </HorizontalGroup>
//        ))}
//    </VerticalGroup>
//  );
//};

export interface FilterEditorProps {
  requestSpec: RequestSpec;
  update: (rq: RequestSpec, key: string, value: unknown) => void;
  autocompleterFactory: (ident: string) => (value?: string) => Promise<Array<{ value: string; label: string }>>;
  labelAutocomplete: (value: string) => Promise<Array<SelectableValue<string>>>;
  completeTagChoices: (group: string, value: string) => Promise<Array<SelectableValue<string>>>;
}

export const FilterEditor: React.FC<FilterEditorProps> = (props) => {
  const allComponentNames: string[] = [
    'site',
    'host_name',
    'service',
    'host_name_regex',
    'service_regex',
    'host_labels',
    'host_tags',
    'service_in_group',
    'host_in_group',
  ];

  function allSetProperties(): string[] {
    return Object.entries(props.requestSpec)
      .filter(([key, _]) => typeof get(props.requestSpec, key) !== 'undefined')
      .filter(([key, _]) => allComponentNames.includes(key))
      .map((entry) => entry[0]);
  }

  const [activeComponents, setActiveComponents] = React.useState(allSetProperties() as string[]);

  function addComponent(name?: string) {
    if (name === undefined) {
      return;
    }
    const copy = activeComponents.slice();
    copy.push(name);
    setActiveComponents(copy);
  }

  //  function removeComponent(name: string) {
  //    const copy = activeComponents.slice();
  //    copy.splice(copy.indexOf(name), 1);
  //    setActiveComponents(copy);
  //  }
  //
  function labelCase(val: string) {
    return titleCase(val.replace(/_/g, ' '));
  }

  return (
    <InlineFieldRow>
      <InlineField label="Filter" labelWidth={8}>
        <GrafanaSelect
          width={32}
          options={allComponentNames
            .filter((val) => !activeComponents.includes(val))
            .map((val) => ({
              label: labelCase(val),
              value: val,
            }))}
          onChange={(selectableValue) => addComponent(selectableValue.value)}
          value={{ label: 'Add Filter' }}
        />
      </InlineField>
    </InlineFieldRow>
  );
};
