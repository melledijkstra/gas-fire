import { ScopedCssBaseline } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material';
import { colors } from '@mui/material';
import { ReactNode } from 'react';
import './index.css';

const { green, blue } = colors;

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

  return <p className="border-2 border-blue-500">Test Test</p>;

  // return (
  //   <ScopedCssBaseline>
  //     <ThemeProvider theme={theme}>{children}</ThemeProvider>
  //   </ScopedCssBaseline>
  // );
};
