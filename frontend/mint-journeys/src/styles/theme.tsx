import { createTheme } from '@mantine/core';

const theme = createTheme({
  primaryColor: 'primary',
  colors: {
    primary: [
      '#f7f4d5',
      '#eef2c2',
      '#e4efad',
      '#daeb97',
      '#afc584',
      '#9ab665',
      '#839958',
      '#6a7c47',
      '#515e36',
      '#0a3323',
    ],
    secondary: [
      '#fdf2ea',
      '#fbedd6',
      '#f8d794',
      '#f3c87e',
      '#eba171',
      '#d58a52',
      '#bb6830',
      '#965326',
      '#713e1d',
      '#4c2913',
    ],
    'accent-blue': [
      '#e7f2f4',
      '#d0e5e9',
      '#a1cbd4',
      '#72b1bf',
      '#4397aa',
      '#105666',
      '#0d4552',
      '#0a343d',
      '#072329',
      '#031215',
    ],
    'accent-red': [
      '#fbecea',
      '#f7dcd8',
      '#efc6bf',
      '#e7b0a6',
      '#df9a8d',
      '#d3968c',
      '#ba847b',
      '#a1726a',
      '#88615a',
      '#6f4f49',
    ],
    'accent-grey': [
      '#f2f5f5',
      '#e5ebeb',
      '#cbd7d7',
      '#b1c3c3',
      '#97afaf',
      '#88a0a0',
      '#7a9090',
      '#6b7e7e',
      '#5d6d6d',
      '#4f5d5d',
    ],
  },
  components: {
    Paper: {
      defaultProps: {
        bg: '#ffffff',
      },
    },
  },
  fontFamily: "'Merriweather', 'Noto Serif TC', serif",
  defaultRadius: '5px',
});

export default theme;
