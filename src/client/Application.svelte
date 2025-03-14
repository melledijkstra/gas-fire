<script lang="ts">
  import '@/client/app.css';
  let { children } = $props()

  // const theme = createTheme({
  //   palette: {
  //     primary: {
  //       main: green[800],
  //     },
  //     secondary: blue,
  //   },
  //   components: {
  //     MuiButton: {
  //       defaultProps: {
  //         disableRipple: true,
  //       },
  //     },
  //     MuiTextField: {
  //       defaultProps: {
  //         size: 'small',
  //       },
  //     },
  //   },
  // });

  // return (
  //   <ScopedCssBaseline>
  //     <ThemeProvider theme={theme}>{children}</ThemeProvider>
  //   </ScopedCssBaseline>
  // );
</script>

{@render children?.()}

