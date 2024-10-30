import { Alert, Button, Divider, Grid, Stack, Typography } from '@mui/material';
import { FormEvent, Fragment, useEffect, useState } from 'react';
import { FireColumnRules } from '../../../server/types';
import { FormRule } from './FormRule';

export enum Condition {
  contains = 'contains',
  startsWith = 'startsWith',
  regex = 'regex',
}

export interface Rule {
  column: keyof FireColumnRules;
  keyword: string;
  conditionType: 'contains' | 'startsWith' | 'regex';
  category: string;
}

export const AutomaticCategorizationForm = () => {
  const [config, setConfig] = useState<Rule[]>([]);

  const [categories, setCategories] = useState<string[]>();

  const onFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    console.log(formData);
  };

  // const saveAutomaticCategorizationConfig = () => {
  //   // parse form data into configuration data
  //   const formData = new FormData();

  //   // send configuration data to server
  // };

  useEffect(() => {
    // serverFunctions
    //   .getAutomaticCategorizationConfig()
    //   .then((configuration) => setConfig(configuration));

    // simulate server delay
    setTimeout(() => {
      setCategories(['Groceries', 'Household', 'Salary', 'Entertainment']);
      setConfig([
        {
          category: 'Groceries',
          column: 'contra_account',
          conditionType: 'contains',
          keyword: 'Mercadona',
        },
        {
          category: 'Household',
          column: 'contra_account',
          conditionType: 'contains',
          keyword: 'IKEA',
        },
      ]);
    }, 1000);
  }, []);

  const hasConfig = config?.length > 0;

  return (
    <Grid item xs={12} justifyItems={'center'}>
      <Alert severity="warning">
        This functionality does not work yet, coming soon... 🚧!
      </Alert>
      <form onSubmit={onFormSubmit}>
        <Stack spacing={1} divider={<Divider />}>
          {hasConfig &&
            config.map((rule, index) => (
              <Fragment key={index}>
                <Typography component={'h3'}>{`Rule ${index + 1}:`}</Typography>
                <FormRule rule={rule} categories={categories ?? []} />
              </Fragment>
            ))}
          <Button type="submit" variant="contained" disabled={!hasConfig}>
            Save Configuration
          </Button>
        </Stack>
      </form>
    </Grid>
  );
};
