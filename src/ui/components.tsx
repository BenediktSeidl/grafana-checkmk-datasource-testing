import React, { ReactElement } from 'react';
import { SelectableValue } from '@grafana/data';
import {
  RequestSpec,
  TagValue,
  FullRequestSpec,
  RequestSpecNegatableOptionKeys,
  RequestSpecStringKeys,
} from '../RequestSpec';
import { get, debounce } from 'lodash';
import { titleCase } from '../utils';
import {
  AsyncMultiSelect,
  AsyncSelect,
  Button,
  Checkbox,
  HorizontalGroup,
  InlineField,
  InlineFieldRow,
  Input,
  Label,
  Select as GrafanaSelect,
  VerticalGroup,
} from '@grafana/ui';

// function findOption<T>(value: T, options: Array<SelectableValue<T>>): SelectableValue<T> | undefined {
//   return options.filter((elem) => Object.is(value, elem.value))[0];
// }

export interface SelectProps<Key extends RequestSpecStringKeys> {
  label?: string;
  requestSpecKey?: Key;
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

export interface FilterProps<Key extends RequestSpecNegatableOptionKeys> {
  label: string;
  requestSpecKey: Key;
  onChange: (value: FullRequestSpec[Key]) => void;
  value: RequestSpec[Key];
}

export const Filter = <T extends RequestSpecNegatableOptionKeys>(props: FilterProps<T>) => {
  const { onChange, label } = props;

  const value =
    props.value === undefined
      ? {
          value: '',
          negated: false,
        }
      : { ...props.value };

  // TODO: some kind of debouncing is needed! Not sure where to implement it.

  const onValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    value.value = event.target.value;
    onChange(value);
  };

  const onNegateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    value.negated = event.target.checked;
    onChange(value);
  };

  return (
    <HorizontalGroup>
      <InlineField label={label} labelWidth={14}>
        <Input
          width={32}
          type="text"
          value={value !== undefined ? value.value : ''}
          onChange={onValueChange}
          placeholder="none"
        />
      </InlineField>
      <Checkbox label="Negate" value={value !== undefined ? value.negated : false} onChange={onNegateChange} />
    </HorizontalGroup>
  );
};

const SingleTag = (props: {
  index: number;
  //requestSpec: RequestSpec;
  //setTag(value: TagValue, rq: RequestSpec): void;
  //autocompleteTagGroups(value: string): Promise<Array<SelectableValue<string>>>;
  //autocompleteTagOptions(group: string, value: string): Promise<Array<SelectableValue<string>>>;
  //dependantOn: unknown[];
  onChange: (newValue: TagValue) => void;
  value: TagValue | undefined;
  autocompleter: (
    prefix: string,
    mode: 'groups' | 'choices',
    context: Record<string, unknown>
  ) => Promise<Array<SelectableValue<string>>>;
}) => {
  const { value, onChange, autocompleter } = props;
  //const tagValue = props.requestSpec.host_tags ? props.requestSpec.host_tags[props.index] : {};
  //const [group, setGroup] = React.useState<SelectableValue<string> | undefined>();
  //const [operator, setOperator] = React.useState('is');
  //const [tag, setTag] = React.useState<SelectableValue<string> | undefined>();
  const [tagOptions, setTagOptions] = React.useState<Array<SelectableValue<string>>>([]);
  const [groupOptions, setGroupOptions] = React.useState<Array<SelectableValue<string>>>([]);
  // we just use this state for notifing useEffect of the changed data. TODO: perhaps there is a better way?

  const innerValue: TagValue = value === undefined ? { operator: 'is' } : value;
  const [groupId, setGroupId] = React.useState<string | undefined>(innerValue.group);

  React.useEffect(() => {
    async function inner() {
      // TODO: use teardown
      setGroupOptions(await autocompleter('', 'groups', {}));
    }
    inner();
  }, [autocompleter]);

  React.useEffect(() => {
    async function inner() {
      // TODO: use teardown
      if (groupId === undefined) {
        return;
      }
      setTagOptions(await autocompleter('', 'choices', { groupId: groupId }));
    }
    inner();
  }, [autocompleter, groupId]);

  //  TODO: use teardown above!
  //  React.useEffect(() => {
  //    let useAsyncResult = true; // https://beta.reactjs.org/apis/react/useEffect#fetching-data-with-effects
  //    async function inner() {
  //      const options = await autocompleter('');
  //      if (useAsyncResult) {
  //        setOptions(options);
  //      }
  //    }
  //    return () => {
  //      useAsyncResult = false;
  //    };
  //  }, [autocompleter, label]);

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

  const tagOperators = [
    { value: 'is', label: '=' },
    { value: 'is not', label: '≠' },
  ];

  const findOperatorSelectable = function (value: string | undefined): SelectableValue<string> | undefined {
    for (const operator of tagOperators) {
      if (operator.value === value || (operator.value === 'is' && value === undefined)) {
        return operator;
      }
    }
    return undefined;
  };

  const findGroupSelectable = function (value: string | undefined): SelectableValue<string> | undefined {
    if (groupOptions === undefined) {
      return null;
    }
    for (const group of groupOptions) {
      if (group.value === value) {
        return group;
      }
    }
    return null;
  };

  const findTagSelectable = function (value: string | undefined): SelectableValue<string> | undefined {
    // TODO: c&p from above!
    console.log("find", tagOptions, value)
    if (tagOptions === undefined) {
      return null;
    }
    for (const tag of tagOptions) {
      if (tag.value === value) {
        return tag;
      }
    }
    return null;
  };

  return (
    <HorizontalGroup>
      <Label>Host tag {props.index}: </Label>
      <GrafanaSelect
        // TODO: should this be a AsyncSelect?
        onChange={(val) => {
          onChange({ ...innerValue, group: val.value ?? '' });
          setGroupId(val.value);
        }}
        options={groupOptions}
        value={findGroupSelectable(innerValue.group)}
      />
      <GrafanaSelect
        width={8}
        options={tagOperators}
        onChange={(val) => onChange({ ...innerValue, operator: val.value ?? 'is' })}
        value={findOperatorSelectable(innerValue.operator)}
      />
      <GrafanaSelect
        // TODO: should this be a AsyncSelect?
        onChange={(val) => onChange({ ...innerValue, tag: val.value ?? '' })}
        options={tagOptions}
        value={findTagSelectable(innerValue.tag)}
      />
    </HorizontalGroup>
  );
};

export const HostTagFilter: React.FC<{
  label: string;
  requestSpecKey: string;
  //update: (rq: RequestSpec, key: 'host_tags', value: TagValue[]) => void;
  onChange: (newValue: [TagValue, TagValue, TagValue]) => void;
  value: [TagValue, TagValue, TagValue] | undefined;
  autocompleter: (
    prefix: string,
    mode: 'groups' | 'choices',
    context: Record<string, unknown>
  ) => Promise<Array<SelectableValue<string>>>;
  //dependantOn: unknown[];
}> = (props) => {
  //const { autocompleteTagGroups, autocompleteTagOptions } = props;
  const { value, autocompleter, onChange } = props;

  //const setTagAtIndex = (index: number, value: TagValue, rq: RequestSpec) => {
  //  if (isUndefined(value.operator)) {
  //    value.operator = 'is';
  //  }

  //  const tags = rq.host_tags?.slice() ?? [{}, {}, {}];
  //  tags[index] = value;
  //  props.update(props.requestSpec, 'host_tags', tags);
  //};

  return (
    <VerticalGroup spacing="sm">
      {[...Array(3)].map((_, index) => (
        <SingleTag
          key={index}
          index={index}
          onChange={(tag: TagValue) => {
            const newValue: [TagValue, TagValue, TagValue] = Object.assign([], value);
            newValue[index] = tag;
            onChange(newValue);
          }}
          autocompleter={autocompleter}
          value={value !== undefined ? value[index] : undefined}
        />
      ))}
    </VerticalGroup>
  );
};

export const HostLabelFilter: React.FC<{
  label: string;
  requestSpecKey: string;
  onChange: (newValue: string[]) => void;
  value: string[] | undefined;
  //update: (rq: RequestSpec, labels: 'host_labels', value: string[]) => void;
  autocompleter: (value: string) => Promise<Array<SelectableValue<string>>>;
}> = (props) => {
  const { value, autocompleter, label, onChange } = props;

  const onLabelsChange = (items: Array<SelectableValue<string>>) => {
    const result: string[] = [];
    for (const element of items) {
      if (element.value === undefined) {
        continue;
      }
      result.push(element.value);
    }
    console.log(result);
    onChange(result);
  };

  const toMultiSelectValue = (value: string[] | undefined) => {
    console.log('?', value);
    const result: Array<SelectableValue<string>> = [];
    for (const element of value || []) {
      result.push({ value: element, label: element });
    }
    console.log(result);
    return result;
  };

  return (
    <InlineField label={label} labelWidth={14}>
      <AsyncMultiSelect
        width={32}
        defaultOptions
        loadOptions={autocompleter}
        onChange={onLabelsChange}
        value={toMultiSelectValue(value)}
        placeholder="Type to trigger search"
      />
    </InlineField>
  );
};

export const OnlyActiveChildren = (props: {
  children: JSX.Element[];
  //update: (rq: RequestSpec, key: string, value: unknown) => void;
  //removeComponent: (name: string) => void;
  //activeComponents: string[];
  requestSpec: RequestSpec;
}): JSX.Element => {
  const allComponents: string[] = [];
  const initialActiveComponents = [];
  for (const child of props.children) {
    allComponents.push(child.props.label);
    const requestSpecValue = props.requestSpec[child.props.requestSpecKey];
    if (requestSpecValue !== undefined && requestSpecValue !== '') {
      initialActiveComponents.push(child.props.label);
    }
  }

  const [activeComponents, setActiveComponents] = React.useState(initialActiveComponents);

  function availableComponentsOptions() {
    const result = [];
    for (const component of allComponents) {
      if (activeComponents.includes(component)) {
        continue;
      }
      result.push({ value: component, label: component });
    }
    return result;
  }

  //function cleanup(name: string) {
  //  props.removeComponent(name);
  //  props.update(props.requestSpec, name, undefined);
  //}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function getName(elem: any) {
    return elem.props['data-name'];
  }

  return (
    <InlineFieldRow>
      <InlineField label="Filter" labelWidth={8}>
        <GrafanaSelect
          width={32}
          options={availableComponentsOptions()}
          //  .filter((val) => !activeComponents.includes(val))
          //  .map((val) => ({
          //    label: labelCase(val),
          //    value: val,
          //  }))}
          //onChange={(selectableValue) => addComponent(selectableValue.value)}
          onChange={(value) => setActiveComponents((c) => [...c, value.value])}
          value={{ label: 'Add Filter' }}
        />
      </InlineField>
      <VerticalGroup>
        {React.Children.toArray(props.children)
          .filter((elem) => {
            return activeComponents.includes(elem.props.label);
          })
          .map((elem) => (
            <HorizontalGroup key={getName(elem)}>
              <Button
                icon="minus"
                variant="secondary"
                onClick={() =>
                  setActiveComponents((c) => {
                    if (!React.isValidElement(elem)) {
                      return c;
                    }
                    const result = [...c];
                    result.splice(result.indexOf(elem.props.label), 1);
                    elem.props.onChange(undefined);
                    return result;
                  })
                }
              />
              {elem}
            </HorizontalGroup>
          ))}
      </VerticalGroup>
    </InlineFieldRow>
  );
};

export interface FilterEditorProps {
  requestSpec: RequestSpec;
  update: (rq: RequestSpec, key: string, value: unknown) => void;
  autocompleterFactory: (ident: string) => (value?: string) => Promise<Array<{ value: string; label: string }>>;
  labelAutocomplete: (value: string) => Promise<Array<SelectableValue<string>>>;
  completeTagChoices: (group: string, value: string) => Promise<Array<SelectableValue<string>>>;
}

//export const FilterEditor: React.FC<FilterEditorProps> = (props) => {
//  const allComponentNames: string[] = [
//    'site',
//    'host_name',
//    'service',
//    'host_name_regex',
//    'service_regex',
//    'host_labels',
//    'host_tags',
//    'service_in_group',
//    'host_in_group',
//  ];
//
//  function allSetProperties(): string[] {
//    return Object.entries(props.requestSpec)
//      .filter(([key, _]) => typeof get(props.requestSpec, key) !== 'undefined')
//      .filter(([key, _]) => allComponentNames.includes(key))
//      .map((entry) => entry[0]);
//  }
//
//  const [ceeActiveComponents, setCeeActiveComponents] = React.useState(allSetProperties());
//
//  function ceeAddComponent(name?: string) {
//    if (name === undefined) {
//      return;
//    }
//    const copy = ceeActiveComponents.slice();
//    copy.push(name);
//    setCeeActiveComponents(copy);
//  }
//
//  //  function removeComponent(name: string) {
//  //    const copy = activeComponents.slice();
//  //    copy.splice(copy.indexOf(name), 1);
//  //    setActiveComponents(copy);
//  //  }
//  //
//
//  return (
//
//  );
//};
