import {
  Alert,
  Collapse,
  Icon,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { Application } from '../Application';
import { useEffect, useState } from 'react';
import { serverFunctions } from '../utils/serverFunctions';
import { ConfigData } from '@/common/types';

const ConfigItem = ({
  accountId,
  config,
}: {
  accountId: string;
  config: ConfigData;
}) => {
  // const [open, setOpen] = useState(false);

  // const toggleOpen = () => {
  //   setOpen(!open);
  // };

  return (
    <>
      <ListItemButton>
        <ListItemIcon>
          <Icon>account_balance</Icon>
        </ListItemIcon>
        <ListItemText primary={accountId} />
        {/* {open ? <Icon>expand_less</Icon> : <Icon>expand_more</Icon>} */}
      </ListItemButton>
      {/* <Collapse in={open}>
        <List component="div" disablePadding>
          <ListItemButton sx={{ pl: 4 }}>
            <ListItemText primary="-" />
          </ListItemButton>
        </List>
      </Collapse> */}
    </>
  );
};

export const Dialog = () => {
  const [loading, setLoading] = useState(true);
  const [configs, setConfigs] = useState<Record<string, ConfigData>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setConfigs({});
    setError(null);
    setLoading(true);
    serverFunctions
      .getConfiguration()
      .then((configs) => {
        setConfigs(configs);
        setLoading(false);
      })
      .catch((error: Error) => {
        setError(error.message);
      });
  }, []);

  const text = loading
    ? 'Loading...'
    : `${Object.keys(configs).length} configs loaded`;

  return (
    <Application>
      <Alert severity="info">{text}</Alert>
      <Alert severity="success">Configuration is valid!</Alert>
      {error && <Alert severity="error">{error}</Alert>}

      <List sx={{ width: '100%', bgcolor: 'background.paper' }} component="nav">
        {Object.keys(configs).map((accountId) => (
          <ConfigItem
            key={accountId}
            accountId={accountId}
            config={configs[accountId]}
          />
        ))}
      </List>
    </Application>
  );
};
