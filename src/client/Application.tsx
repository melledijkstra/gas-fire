import { ScopedCssBaseline } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { blue, green } from '@mui/material/colors';
import { ReactNode } from 'react';

export const Application = ({ children }: { children: ReactNode }) => {
  const theme = createTheme({
    palette: {
      primary: {
        main: green[800],
      },
      secondary: blue,
    },
    components: {
      MuiButton: {
        defaultProps: {
          disableRipple: true,
        },
      },
      MuiTextField: {
        defaultProps: {
          size: 'small',
        },
      },
    },
  });

  return (
    <ScopedCssBaseline>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </ScopedCssBaseline>
  );
};
