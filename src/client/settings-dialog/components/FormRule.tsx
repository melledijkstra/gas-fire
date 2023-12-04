import {
  FormControl,
  InputLabel,
  NativeSelect,
  Stack,
  TextField,
} from '@mui/material';
import { Rule, Condition } from './AutomaticCategorizationForm';

type FormRuleProps = { rule: Rule; categories: string[] };

export const FormRule = ({ rule, categories }: FormRuleProps) => {
  return (
    <Stack direction="row" spacing={2} justifyContent={'space-between'}>
      {/* column of the rule */}
      <TextField
        required
        name="column"
        value={rule.column}
        label="Column"
      ></TextField>
      {/* condition of the rule */}
      <FormControl>
        <InputLabel variant="standard" htmlFor="uncontrolled-native">
          Condition
        </InputLabel>
        <NativeSelect
          required
          defaultValue={Condition.contains}
          inputProps={{
            name: 'condition',
            id: 'uncontrolled-native',
          }}
        >
          {Object.keys(Condition).map((key) => (
            <option key={key} value={Condition[key as keyof typeof Condition]}>
              {key}
            </option>
          ))}
        </NativeSelect>
      </FormControl>
      {/* keyword that should match the rule */}
      <TextField required name="keyword" value={rule.keyword} label="Keyword" />
      {/* list of categories to choose from that will be assigned if match */}
      <FormControl>
        <InputLabel variant="standard" htmlFor="uncontrolled-native">
          Category
        </InputLabel>
        <NativeSelect
          required
          inputProps={{
            name: 'category',
            id: 'uncontrolled-native',
          }}
          defaultValue={categories?.[0]}
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </NativeSelect>
      </FormControl>
    </Stack>
  );
};
